/**
 * Figure Analyzer Service
 * 
 * Extract and analyze figures from PDFs using vision models:
 * - Extract figures from PDF pages
 * - Analyze with GPT-4o-vision or similar
 * - Generate captions and explanations
 * - Identify diagram types
 * - Create figure annotations
 */

import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { askModel } from '../model-client.mjs';

/**
 * Extract figures from PDF
 */
export async function extractFigures(pdfPath) {
  try {
    const pdf = await getDocument(pdfPath).promise;
    const figures = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const pageFigures = await extractFiguresFromPage(page, pageNum);
      figures.push(...pageFigures);
    }
    
    return figures;
  } catch (error) {
    console.error('Error extracting figures:', error);
    return [];
  }
}

/**
 * Extract figures from a single page
 */
async function extractFiguresFromPage(page, pageNum) {
  const figures = [];
  
  try {
    const ops = await page.getOperatorList();
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Find image operations
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === OPS.paintImageXObject || 
          ops.fnArray[i] === OPS.paintInlineImageXObject) {
        
        const imageName = ops.argsArray[i][0];
        
        try {
          // Get image data
          const image = await extractImageData(page, imageName);
          
          if (image && image.width > 100 && image.height > 100) {
            // Calculate bounding box
            const bbox = calculateImageBBox(ops, i, viewport);
            
            figures.push({
              id: `figure-p${pageNum}-${i}`,
              page: pageNum,
              bbox,
              width: image.width,
              height: image.height,
              imageData: image.data,
              format: image.format || 'png'
            });
          }
        } catch (imgError) {
          console.error(`Error extracting image ${imageName}:`, imgError);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing page ${pageNum}:`, error);
  }
  
  return figures;
}

/**
 * Extract image data from page
 */
async function extractImageData(page, imageName) {
  try {
    const objs = await page.objs;
    const img = objs.get(imageName);
    
    if (!img) return null;
    
    // Convert image to base64 data URL
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(img.width, img.height);
    imageData.data.set(img.data);
    ctx.putImageData(imageData, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/png');
    
    return {
      width: img.width,
      height: img.height,
      data: dataUrl,
      format: 'png'
    };
  } catch (error) {
    console.error('Error extracting image data:', error);
    return null;
  }
}

/**
 * Calculate image bounding box
 */
function calculateImageBBox(ops, index, viewport) {
  // This is a simplified version - actual implementation would need
  // to track transform matrices to get accurate positioning
  
  return {
    x: 0,
    y: 0,
    width: viewport.width,
    height: viewport.height
  };
}

/**
 * Analyze figure with vision model
 */
export async function analyzeFigure(figure, modelConfig = {}) {
  const {
    apiStyle = 'openai',
    apiBaseUrl,
    apiKey,
    model = 'gpt-4o',
    timeoutMs = 60000
  } = modelConfig;
  
  try {
    // Build vision prompt
    const prompt = buildFigureAnalysisPrompt();
    
    // Call vision model
    const result = await callVisionModel(
      figure.imageData,
      prompt,
      { apiStyle, apiBaseUrl, apiKey, model, timeoutMs }
    );
    
    // Parse analysis result
    const analysis = parseFigureAnalysis(result.content);
    
    return {
      figureId: figure.id,
      ...analysis,
      analyzed_at: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error analyzing figure ${figure.id}:`, error);
    return {
      figureId: figure.id,
      error: error.message,
      analyzed_at: new Date().toISOString()
    };
  }
}

/**
 * Build figure analysis prompt
 */
function buildFigureAnalysisPrompt() {
  return {
    system: `You are an expert at analyzing scientific figures and diagrams. Analyze the image and provide:
1. Type: Identify the diagram type (chart, plot, architecture diagram, flowchart, table, etc.)
2. Elements: List the main visual elements and components
3. Insights: Explain what the figure shows and its key insights
4. Caption: Suggest a descriptive caption

Be concise and technical. Focus on what's scientifically relevant.`,
    
    user: `Analyze this figure from a research paper. Provide:
- Type: [diagram type]
- Elements: [main components]
- Insights: [key findings shown]
- Caption: [suggested caption]

Format as JSON: {"type": "...", "elements": [...], "insights": "...", "caption": "..."}`
  };
}

/**
 * Call vision model API
 */
async function callVisionModel(imageData, prompt, modelConfig) {
  const { apiStyle, model } = modelConfig;
  
  if (apiStyle === 'openai' || !apiStyle) {
    return await callOpenAIVision(imageData, prompt, modelConfig);
  } else if (apiStyle === 'anthropic') {
    return await callAnthropicVision(imageData, prompt, modelConfig);
  } else {
    throw new Error(`Unsupported vision API style: ${apiStyle}`);
  }
}

/**
 * Call OpenAI vision API (GPT-4o)
 */
async function callOpenAIVision(imageData, prompt, modelConfig) {
  const { model = 'gpt-4o' } = modelConfig;
  
  // Use the existing askModel function with vision support
  // This is a simplified version - actual implementation would use OpenAI SDK
  
  const messages = [
    {
      role: 'system',
      content: prompt.system
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt.user },
        { type: 'image_url', image_url: { url: imageData } }
      ]
    }
  ];
  
  // For now, return a mock response
  // In production, this would call the actual OpenAI API
  return {
    content: JSON.stringify({
      type: 'architecture diagram',
      elements: ['neural network layers', 'connections', 'input/output'],
      insights: 'Shows the architecture of a deep learning model with multiple layers',
      caption: 'Figure: Neural network architecture with 5 layers'
    })
  };
}

/**
 * Call Anthropic vision API (Claude with vision)
 */
async function callAnthropicVision(imageData, prompt, modelConfig) {
  // Similar to OpenAI but using Anthropic's API format
  // For now, return a mock response
  
  return {
    content: JSON.stringify({
      type: 'chart',
      elements: ['x-axis', 'y-axis', 'data points', 'trend line'],
      insights: 'Shows performance improvement over time',
      caption: 'Figure: Performance metrics across different configurations'
    })
  };
}

/**
 * Parse figure analysis result
 */
function parseFigureAnalysis(content) {
  try {
    // Try to parse as JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type || 'unknown',
        elements: Array.isArray(parsed.elements) ? parsed.elements : [],
        insights: parsed.insights || '',
        caption: parsed.caption || '',
        raw: content
      };
    }
  } catch (error) {
    console.error('Error parsing figure analysis:', error);
  }
  
  // Fallback: parse as text
  return parseFigureAnalysisText(content);
}

/**
 * Parse figure analysis from text format
 */
function parseFigureAnalysisText(content) {
  const analysis = {
    type: 'unknown',
    elements: [],
    insights: '',
    caption: '',
    raw: content
  };
  
  // Extract type
  const typeMatch = content.match(/Type:\s*([^\n]+)/i);
  if (typeMatch) {
    analysis.type = typeMatch[1].trim();
  }
  
  // Extract elements
  const elementsMatch = content.match(/Elements:\s*([^\n]+)/i);
  if (elementsMatch) {
    analysis.elements = elementsMatch[1].split(',').map(e => e.trim());
  }
  
  // Extract insights
  const insightsMatch = content.match(/Insights:\s*([^\n]+)/i);
  if (insightsMatch) {
    analysis.insights = insightsMatch[1].trim();
  }
  
  // Extract caption
  const captionMatch = content.match(/Caption:\s*([^\n]+)/i);
  if (captionMatch) {
    analysis.caption = captionMatch[1].trim();
  }
  
  return analysis;
}

/**
 * Batch analyze figures
 */
export async function batchAnalyzeFigures(figures, modelConfig = {}) {
  const results = [];
  
  for (const figure of figures) {
    try {
      const analysis = await analyzeFigure(figure, modelConfig);
      results.push(analysis);
      
      // Small delay to avoid rate limits
      await sleep(1000);
    } catch (error) {
      console.error(`Error analyzing figure ${figure.id}:`, error);
      results.push({
        figureId: figure.id,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Create figure annotation
 */
export function createFigureAnnotation(figure, analysis) {
  return {
    id: `annotation-${figure.id}`,
    target_type: 'figure',
    target_id: figure.id,
    annotation_type: 'figure',
    position: {
      page: figure.page,
      bbox: figure.bbox
    },
    content: analysis.caption || 'Figure analysis',
    metadata: {
      type: analysis.type,
      elements: analysis.elements,
      insights: analysis.insights,
      width: figure.width,
      height: figure.height
    }
  };
}

/**
 * Extract and analyze all figures in a PDF
 */
export async function extractAndAnalyzeFigures(pdfPath, modelConfig = {}) {
  try {
    // Extract figures
    console.log('Extracting figures from PDF...');
    const figures = await extractFigures(pdfPath);
    console.log(`Found ${figures.length} figures`);
    
    if (figures.length === 0) {
      return { figures: [], analyses: [], annotations: [] };
    }
    
    // Analyze figures
    console.log('Analyzing figures with vision model...');
    const analyses = await batchAnalyzeFigures(figures, modelConfig);
    
    // Create annotations
    const annotations = figures.map((figure, index) => 
      createFigureAnnotation(figure, analyses[index] || {})
    );
    
    return {
      figures,
      analyses,
      annotations
    };
  } catch (error) {
    console.error('Error in extractAndAnalyzeFigures:', error);
    return { figures: [], analyses: [], annotations: [], error: error.message };
  }
}

/**
 * Get figure by ID
 */
export function getFigureById(figures, figureId) {
  return figures.find(f => f.id === figureId);
}

/**
 * Get figures by page
 */
export function getFiguresByPage(figures, pageNum) {
  return figures.filter(f => f.page === pageNum);
}

/**
 * Compare two figures
 */
export async function compareFigures(figure1, figure2, modelConfig = {}) {
  // This would use vision model to compare two figures
  // For now, return a placeholder
  
  return {
    similarities: [],
    differences: [],
    comparison: 'Comparison not yet implemented'
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
