import { parsePDF } from './pdf-parser.mjs';
import { extractStructure } from './structure-extractor.mjs';
import { generateAnnotations, generateDocumentSummary } from './annotation-generator.mjs';
import { 
  createPaper, 
  savePaperStructure, 
  createAnnotation,
  getPaper,
  getPaperStructure,
  getAnnotations
} from '../database/db.mjs';
import { randomBytes } from 'node:crypto';

/**
 * Analysis pipeline: orchestrates PDF parsing, structure extraction, and annotation generation
 * Supports streaming progress updates via callback
 */

/**
 * Analyze a PDF paper and generate annotations
 * @param {string} pdfPath - Path to PDF file
 * @param {Object} options - Analysis options
 * @param {Function} progressCallback - Called with progress updates
 * @returns {Promise<Object>} Analysis results with paper ID and stats
 */
export async function analyzePaper(pdfPath, options = {}, progressCallback = null) {
  const {
    paperId = generatePaperId(),
    annotationTypes = ['translation', 'explanation', 'concept'],
    language = 'Chinese',
    batchSize = 5,
    maxParagraphs = null, // Limit for testing
    apiStyle,
    apiBaseUrl,
    apiKey,
    model,
    timeoutMs = 60000
  } = options;
  
  const startTime = Date.now();
  
  try {
    // Step 1: Parse PDF
    emitProgress(progressCallback, {
      stage: 'parsing',
      progress: 0,
      message: 'Parsing PDF...'
    });
    
    const parsedPDF = await parsePDF(pdfPath);
    
    emitProgress(progressCallback, {
      stage: 'parsing',
      progress: 100,
      message: `Parsed ${parsedPDF.numPages} pages`,
      data: { numPages: parsedPDF.numPages }
    });
    
    // Step 2: Extract structure
    emitProgress(progressCallback, {
      stage: 'extracting',
      progress: 0,
      message: 'Extracting document structure...'
    });
    
    const structure = extractStructure(parsedPDF);
    
    emitProgress(progressCallback, {
      stage: 'extracting',
      progress: 100,
      message: `Found ${structure.sections.length} sections, ${structure.paragraphs.length} paragraphs`,
      data: structure.metadata
    });
    
    // Step 3: Save paper and structure to database
    const paper = await createPaper({
      id: paperId,
      title: parsedPDF.metadata.title,
      authors: parsedPDF.metadata.authors,
      abstract: parsedPDF.metadata.abstract,
      pdf_path: pdfPath,
      page_count: parsedPDF.numPages
    });
    
    await savePaperStructure(paperId, structure);
    
    // Step 4: Generate annotations
    emitProgress(progressCallback, {
      stage: 'annotating',
      progress: 0,
      message: 'Generating annotations...'
    });
    
    // Limit paragraphs if specified (for testing)
    let paragraphsToAnnotate = structure.paragraphs;
    if (maxParagraphs && maxParagraphs < paragraphsToAnnotate.length) {
      paragraphsToAnnotate = paragraphsToAnnotate.slice(0, maxParagraphs);
    }
    
    const annotations = [];
    const totalBatches = Math.ceil(paragraphsToAnnotate.length / batchSize);
    
    // Process in batches with progress updates
    for (let i = 0; i < paragraphsToAnnotate.length; i += batchSize) {
      const batch = paragraphsToAnnotate.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      emitProgress(progressCallback, {
        stage: 'annotating',
        progress: Math.round((batchNum / totalBatches) * 100),
        message: `Processing batch ${batchNum}/${totalBatches} (${batch.length} paragraphs)...`
      });
      
      try {
        const batchAnnotations = await generateAnnotations(batch, {
          types: annotationTypes,
          language,
          batchSize: 1, // Process types sequentially within batch
          apiStyle,
          apiBaseUrl,
          apiKey,
          model,
          timeoutMs
        });
        
        // Save annotations to database and emit them
        for (const annotation of batchAnnotations) {
          annotation.paper_id = paperId;
          await createAnnotation(annotation);
          annotations.push(annotation);
          
          // Stream individual annotations
          emitProgress(progressCallback, {
            stage: 'annotating',
            progress: Math.round((batchNum / totalBatches) * 100),
            message: `Generated ${annotation.annotation_type} for paragraph ${annotation.target_id}`,
            annotation
          });
        }
      } catch (error) {
        console.error(`Error processing batch ${batchNum}:`, error.message);
        emitProgress(progressCallback, {
          stage: 'annotating',
          progress: Math.round((batchNum / totalBatches) * 100),
          message: `Error in batch ${batchNum}: ${error.message}`,
          error: error.message
        });
      }
    }
    
    // Step 5: Generate document summary (optional)
    if (annotationTypes.includes('summary')) {
      emitProgress(progressCallback, {
        stage: 'summarizing',
        progress: 0,
        message: 'Generating document summary...'
      });
      
      try {
        const summary = await generateDocumentSummary(structure, {
          apiStyle,
          apiBaseUrl,
          apiKey,
          model,
          timeoutMs
        });
        
        summary.paper_id = paperId;
        await createAnnotation(summary);
        annotations.push(summary);
        
        emitProgress(progressCallback, {
          stage: 'summarizing',
          progress: 100,
          message: 'Document summary generated',
          annotation: summary
        });
      } catch (error) {
        console.error('Error generating summary:', error.message);
      }
    }
    
    // Step 6: Complete
    const duration = Date.now() - startTime;
    
    emitProgress(progressCallback, {
      stage: 'complete',
      progress: 100,
      message: 'Analysis complete',
      data: {
        paperId,
        duration,
        stats: {
          pages: parsedPDF.numPages,
          sections: structure.sections.length,
          paragraphs: structure.paragraphs.length,
          figures: structure.figures.length,
          annotations: annotations.length
        }
      }
    });
    
    return {
      paperId,
      paper,
      structure,
      annotations,
      stats: {
        pages: parsedPDF.numPages,
        sections: structure.sections.length,
        paragraphs: structure.paragraphs.length,
        figures: structure.figures.length,
        annotations: annotations.length,
        duration
      }
    };
    
  } catch (error) {
    emitProgress(progressCallback, {
      stage: 'error',
      progress: 0,
      message: `Analysis failed: ${error.message}`,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Get analysis results for a paper
 */
export async function getAnalysisResults(paperId) {
  const paper = await getPaper(paperId);
  if (!paper) {
    throw new Error(`Paper not found: ${paperId}`);
  }
  
  const structure = await getPaperStructure(paperId);
  const annotations = await getAnnotations(paperId);
  
  return {
    paper,
    structure,
    annotations,
    stats: {
      pages: paper.page_count,
      sections: structure?.sections?.length || 0,
      paragraphs: structure?.paragraphs?.length || 0,
      figures: structure?.figures?.length || 0,
      annotations: annotations.length
    }
  };
}

/**
 * Re-analyze specific sections or paragraphs
 */
export async function reanalyzeSection(paperId, sectionId, options = {}, progressCallback = null) {
  const structure = await getPaperStructure(paperId);
  if (!structure) {
    throw new Error(`Structure not found for paper: ${paperId}`);
  }
  
  // Find paragraphs in section
  const section = structure.sections.find(s => s.id === sectionId);
  if (!section) {
    throw new Error(`Section not found: ${sectionId}`);
  }
  
  const sectionParagraphs = structure.paragraphs.filter(p => 
    p.page >= section.page && 
    (structure.sections.find(s => s.page > section.page)?.page || Infinity) > p.page
  );
  
  emitProgress(progressCallback, {
    stage: 'annotating',
    progress: 0,
    message: `Re-analyzing section: ${section.title}`
  });
  
  // Generate annotations for section paragraphs
  const annotations = await generateAnnotations(sectionParagraphs, {
    ...options,
    types: options.annotationTypes || ['translation', 'explanation']
  });
  
  // Save annotations
  for (const annotation of annotations) {
    annotation.paper_id = paperId;
    await createAnnotation(annotation);
  }
  
  emitProgress(progressCallback, {
    stage: 'complete',
    progress: 100,
    message: `Re-analysis complete: ${annotations.length} annotations generated`
  });
  
  return annotations;
}

/**
 * Emit progress update
 */
function emitProgress(callback, update) {
  if (callback && typeof callback === 'function') {
    try {
      callback(update);
    } catch (error) {
      console.error('Error in progress callback:', error);
    }
  }
}

/**
 * Generate unique paper ID
 */
function generatePaperId() {
  return `paper-${Date.now()}-${randomBytes(4).toString('hex')}`;
}
