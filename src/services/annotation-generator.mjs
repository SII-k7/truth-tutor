import { askModel } from '../model-client.mjs';
import { resolveApiConfig } from '../provider-config.mjs';
import {
  ANNOTATION_TYPES,
  detectRelevantTypes,
  buildTypePrompt,
  parseTypeResponse,
  isValidType,
  sortTypesByPriority
} from './annotation-types.mjs';

/**
 * Generate AI annotations for document paragraphs
 * Supports multiple annotation types: translation, explanation, concept, math, experiment, etc.
 */

/**
 * Generate annotations for a batch of paragraphs
 * @param {Array} paragraphs - Array of paragraph objects
 * @param {Object} options - Generation options (types, language, model config)
 * @returns {Promise<Array>} Array of generated annotations
 */
export async function generateAnnotations(paragraphs, options = {}) {
  const {
    types = [ANNOTATION_TYPES.TRANSLATION, ANNOTATION_TYPES.EXPLANATION, ANNOTATION_TYPES.CONCEPT],
    language = 'Chinese',
    batchSize = 5,
    autoDetectTypes = true,
    apiStyle,
    apiBaseUrl,
    apiKey,
    model,
    timeoutMs = 60000
  } = options;
  
  const annotations = [];
  
  // Validate types
  const validTypes = types.filter(isValidType);
  if (validTypes.length === 0) {
    throw new Error('No valid annotation types specified');
  }
  
  // Process paragraphs in batches to respect rate limits
  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, i + batchSize);
    
    // Auto-detect relevant types for each paragraph if enabled
    const paragraphTypes = autoDetectTypes
      ? batch.map(p => detectRelevantTypes(p))
      : batch.map(() => validTypes);
    
    // Generate annotations for each type
    const allTypesInBatch = new Set(paragraphTypes.flat());
    
    for (const type of allTypesInBatch) {
      try {
        // Filter paragraphs relevant for this type
        const relevantParagraphs = batch.filter((p, idx) => 
          paragraphTypes[idx].includes(type)
        );
        
        if (relevantParagraphs.length === 0) continue;
        
        const batchAnnotations = await generateBatchAnnotations(
          relevantParagraphs,
          type,
          language,
          { apiStyle, apiBaseUrl, apiKey, model, timeoutMs }
        );
        annotations.push(...batchAnnotations);
      } catch (error) {
        console.error(`Error generating ${type} annotations for batch ${i}:`, error.message);
        // Continue with next type/batch even if one fails
      }
    }
    
    // Small delay between batches to avoid rate limits
    if (i + batchSize < paragraphs.length) {
      await sleep(1000);
    }
  }
  
  return annotations;
}

/**
 * Generate annotations for a batch of paragraphs (single type)
 */
async function generateBatchAnnotations(paragraphs, type, language, modelConfig) {
  const prompt = buildTypePrompt(type, { text: paragraphs.map(p => p.text).join('\n\n') }, { language });
  
  const result = await askModel({
    ...modelConfig,
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    temperature: 0.3
  });
  
  // Parse response and create annotation objects
  return parseBatchResponse(result.content, paragraphs, type);
}

/**
 * Parse batch response and create annotation objects
 */
function parseBatchResponse(content, paragraphs, type) {
  const annotations = [];
  
  try {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    parsed.forEach(item => {
      const index = item.index;
      if (index >= 0 && index < paragraphs.length) {
        const paragraph = paragraphs[index];
        
        // Use type-specific parser
        const parsedContent = parseTypeResponse(type, item.content || item.translation || item.explanation || item.concepts || '', paragraph);
        
        if (parsedContent.content) {
          annotations.push({
            id: `${type}-${paragraph.id}`,
            target_type: 'paragraph',
            target_id: paragraph.id,
            annotation_type: type,
            position: {
              page: paragraph.page,
              bbox: paragraph.bbox
            },
            content: parsedContent.content,
            metadata: parsedContent
          });
        }
      }
    });
  } catch (error) {
    console.error('Error parsing batch response:', error.message);
    // Fallback: try to parse line by line
    return parseFallback(content, paragraphs, type);
  }
  
  return annotations;
}

/**
 * Fallback parser for non-JSON responses
 */
function parseFallback(content, paragraphs, type) {
  const annotations = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  // Try to match lines to paragraphs
  paragraphs.forEach((paragraph, index) => {
    if (index < lines.length) {
      const line = lines[index].replace(/^\[\d+\]\s*/, '').trim();
      if (line) {
        const parsedContent = parseTypeResponse(type, line, paragraph);
        annotations.push({
          id: `${type}-${paragraph.id}`,
          target_type: 'paragraph',
          target_id: paragraph.id,
          annotation_type: type,
          position: {
            page: paragraph.page,
            bbox: paragraph.bbox
          },
          content: parsedContent.content,
          metadata: parsedContent
        });
      }
    }
  });
  
  return annotations;
}

/**
 * Generate single annotation for a specific paragraph
 */
export async function generateSingleAnnotation(paragraph, type, language, modelConfig) {
  if (!isValidType(type)) {
    throw new Error(`Invalid annotation type: ${type}`);
  }
  
  const annotations = await generateBatchAnnotations([paragraph], type, language, modelConfig);
  return annotations[0] || null;
}

/**
 * Generate summary annotation for entire document
 */
export async function generateDocumentSummary(structure, modelConfig) {
  const { sections, paragraphs } = structure;
  
  const prompt = buildTypePrompt(ANNOTATION_TYPES.SUMMARY, {
    text: sections.slice(0, 10).map(section => {
      const sectionParas = paragraphs.filter(p => p.page === section.page).slice(0, 2);
      return `## ${section.title}\n${sectionParas.map(p => p.text.substring(0, 300)).join('\n')}`;
    }).join('\n\n')
  });
  
  const result = await askModel({
    ...modelConfig,
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    temperature: 0.3
  });
  
  return {
    id: 'summary-document',
    target_type: 'document',
    target_id: 'document',
    annotation_type: ANNOTATION_TYPES.SUMMARY,
    position: { page: 1, bbox: { x: 0, y: 0, width: 0, height: 0 } },
    content: result.content
  };
}

/**
 * Export annotation types for use in other modules
 */
export { ANNOTATION_TYPES } from './annotation-types.mjs';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
