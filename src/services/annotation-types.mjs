/**
 * Annotation Type Definitions and Handlers
 * 
 * Supports multiple annotation types:
 * - Translation: Translate technical text
 * - Explanation: Explain complex concepts
 * - Concept: Extract key terms
 * - Math: Step-by-step equation explanations
 * - Experiment: Methodology explanations
 * - Prerequisite: Required background knowledge
 * - Citation: Link to referenced papers
 * - Definition: Key term definitions
 * - Figure: Figure analysis and captions
 */

/**
 * Annotation type definitions
 */
export const ANNOTATION_TYPES = {
  TRANSLATION: 'translation',
  EXPLANATION: 'explanation',
  CONCEPT: 'concept',
  MATH: 'math',
  EXPERIMENT: 'experiment',
  PREREQUISITE: 'prerequisite',
  CITATION: 'citation',
  DEFINITION: 'definition',
  FIGURE: 'figure',
  SUMMARY: 'summary'
};

/**
 * Type-specific colors for UI
 */
export const TYPE_COLORS = {
  translation: '#4CAF50',    // Green
  explanation: '#2196F3',    // Blue
  concept: '#FF9800',        // Orange
  math: '#9C27B0',          // Purple
  experiment: '#00BCD4',     // Cyan
  prerequisite: '#F44336',   // Red
  citation: '#795548',       // Brown
  definition: '#FFEB3B',     // Yellow
  figure: '#E91E63',        // Pink
  summary: '#607D8B'        // Blue Grey
};

/**
 * Type-specific icons (emoji or unicode)
 */
export const TYPE_ICONS = {
  translation: '🌐',
  explanation: '💡',
  concept: '🏷️',
  math: '∑',
  experiment: '🔬',
  prerequisite: '📚',
  citation: '📄',
  definition: '📖',
  figure: '🖼️',
  summary: '📝'
};

/**
 * Type metadata
 */
export const TYPE_METADATA = {
  translation: {
    name: 'Translation',
    description: 'Translate technical text to target language',
    priority: 1,
    requiresLanguage: true
  },
  explanation: {
    name: 'Explanation',
    description: 'Explain complex concepts in simple terms',
    priority: 2,
    requiresLanguage: false
  },
  concept: {
    name: 'Concept',
    description: 'Extract and tag key concepts',
    priority: 3,
    requiresLanguage: false
  },
  math: {
    name: 'Math',
    description: 'Step-by-step equation explanations',
    priority: 4,
    requiresLanguage: false,
    detectPattern: /\$.*?\$|\\begin\{equation\}|\\frac|\\sum|\\int/
  },
  experiment: {
    name: 'Experiment',
    description: 'Explain experimental methodology',
    priority: 5,
    requiresLanguage: false,
    detectPattern: /experiment|methodology|procedure|protocol|dataset|baseline/i
  },
  prerequisite: {
    name: 'Prerequisite',
    description: 'Identify required background knowledge',
    priority: 6,
    requiresLanguage: false,
    detectPattern: /assume|prerequisite|background|prior knowledge|familiar with/i
  },
  citation: {
    name: 'Citation',
    description: 'Link to referenced papers',
    priority: 7,
    requiresLanguage: false,
    detectPattern: /\[\d+\]|\(.*?\d{4}.*?\)|et al\./
  },
  definition: {
    name: 'Definition',
    description: 'Define key terms',
    priority: 8,
    requiresLanguage: false,
    detectPattern: /is defined as|we define|refers to|denotes|represents/i
  },
  figure: {
    name: 'Figure',
    description: 'Analyze figures and diagrams',
    priority: 9,
    requiresLanguage: false
  },
  summary: {
    name: 'Summary',
    description: 'Document or section summary',
    priority: 10,
    requiresLanguage: false
  }
};

/**
 * Detect which annotation types are relevant for a paragraph
 */
export function detectRelevantTypes(paragraph) {
  const text = paragraph.text || '';
  const relevantTypes = [];
  
  // Check each type's detection pattern
  for (const [type, metadata] of Object.entries(TYPE_METADATA)) {
    if (metadata.detectPattern) {
      if (metadata.detectPattern.test(text)) {
        relevantTypes.push(type);
      }
    }
  }
  
  // Always include basic types
  if (relevantTypes.length === 0) {
    relevantTypes.push(ANNOTATION_TYPES.EXPLANATION);
  }
  
  return relevantTypes;
}

/**
 * Build type-specific prompt for annotation generation
 */
export function buildTypePrompt(type, paragraph, options = {}) {
  const { language = 'Chinese' } = options;
  const text = paragraph.text || '';
  
  const prompts = {
    translation: {
      system: `You are a precise academic translator. Translate technical text from English to ${language}.
Preserve technical terms, mathematical notation, and citations. Provide clear, accurate translations.`,
      user: `Translate this paragraph to ${language}:\n\n${text}\n\nReturn only the translation, no explanations.`
    },
    
    explanation: {
      system: `You are an expert at explaining complex academic concepts. Provide clear, concise explanations.
Focus on key ideas, methodology, and significance. Keep explanations under 100 words.`,
      user: `Explain the key ideas in this paragraph concisely:\n\n${text}\n\nFocus on what's important for understanding.`
    },
    
    concept: {
      system: `You are an expert at identifying key concepts in academic text. Extract important concepts and terms.
Return 3-5 concepts as a comma-separated list.`,
      user: `Extract key concepts from this paragraph:\n\n${text}\n\nReturn only the concepts, comma-separated.`
    },
    
    math: {
      system: `You are a mathematics expert. Explain equations and mathematical notation step-by-step.
Break down complex formulas into understandable steps. Explain what each symbol means.`,
      user: `Explain the mathematical content in this paragraph step-by-step:\n\n${text}\n\nBreak down equations and explain notation.`
    },
    
    experiment: {
      system: `You are an expert in experimental methodology. Explain experimental designs, procedures, and datasets.
Focus on: research question, methodology, data collection, analysis approach, and key findings.`,
      user: `Explain the experimental methodology in this paragraph:\n\n${text}\n\nFocus on design, procedure, and analysis.`
    },
    
    prerequisite: {
      system: `You are an expert at identifying prerequisite knowledge. Identify what background knowledge is needed.
List specific concepts, theories, or skills the reader should know beforehand.`,
      user: `What prerequisite knowledge is needed to understand this paragraph?\n\n${text}\n\nList specific concepts or skills required.`
    },
    
    citation: {
      system: `You are an expert at analyzing citations. Extract and explain referenced papers.
Identify the cited work, its relevance, and how it relates to the current text.`,
      user: `Analyze the citations in this paragraph:\n\n${text}\n\nExplain what papers are referenced and why they're relevant.`
    },
    
    definition: {
      system: `You are an expert at defining technical terms. Provide clear, concise definitions.
Focus on the specific meaning in this academic context.`,
      user: `Define the key terms in this paragraph:\n\n${text}\n\nProvide clear, context-specific definitions.`
    },
    
    figure: {
      system: `You are an expert at analyzing figures and diagrams. Describe what the figure shows.
Identify: type (chart/diagram/plot), main elements, key insights, and suggested caption.`,
      user: `Analyze this figure description:\n\n${text}\n\nDescribe type, elements, and key insights.`
    },
    
    summary: {
      system: `You are an expert at summarizing academic text. Provide concise summaries.
Focus on main points, key findings, and significance. Keep under 150 words.`,
      user: `Summarize this text:\n\n${text}\n\nFocus on main points and key findings.`
    }
  };
  
  return prompts[type] || prompts.explanation;
}

/**
 * Parse type-specific response
 */
export function parseTypeResponse(type, response, paragraph) {
  const content = response.trim();
  
  // Type-specific parsing
  switch (type) {
    case ANNOTATION_TYPES.CONCEPT:
      // Parse comma-separated concepts
      return {
        content,
        concepts: content.split(',').map(c => c.trim()).filter(Boolean)
      };
      
    case ANNOTATION_TYPES.MATH:
      // Extract steps if formatted
      const steps = content.split(/\n\d+\.|Step \d+:/i).filter(s => s.trim());
      return {
        content,
        steps: steps.length > 1 ? steps : null
      };
      
    case ANNOTATION_TYPES.CITATION:
      // Extract paper references
      const papers = content.match(/\[.*?\]|\(.*?\d{4}.*?\)/g) || [];
      return {
        content,
        papers
      };
      
    case ANNOTATION_TYPES.PREREQUISITE:
      // Extract prerequisite list
      const prereqs = content.split(/\n[-*•]|\d+\./).map(p => p.trim()).filter(Boolean);
      return {
        content,
        prerequisites: prereqs.length > 1 ? prereqs : [content]
      };
      
    default:
      return { content };
  }
}

/**
 * Validate annotation type
 */
export function isValidType(type) {
  return Object.values(ANNOTATION_TYPES).includes(type);
}

/**
 * Get all available types
 */
export function getAllTypes() {
  return Object.values(ANNOTATION_TYPES);
}

/**
 * Get type metadata
 */
export function getTypeMetadata(type) {
  return TYPE_METADATA[type] || null;
}

/**
 * Get type color
 */
export function getTypeColor(type) {
  return TYPE_COLORS[type] || '#999999';
}

/**
 * Get type icon
 */
export function getTypeIcon(type) {
  return TYPE_ICONS[type] || '📌';
}

/**
 * Sort types by priority
 */
export function sortTypesByPriority(types) {
  return types.sort((a, b) => {
    const priorityA = TYPE_METADATA[a]?.priority || 999;
    const priorityB = TYPE_METADATA[b]?.priority || 999;
    return priorityA - priorityB;
  });
}

/**
 * Filter types by options
 */
export function filterTypes(types, options = {}) {
  const { requiresLanguage, excludeTypes = [] } = options;
  
  return types.filter(type => {
    if (excludeTypes.includes(type)) return false;
    
    const metadata = TYPE_METADATA[type];
    if (!metadata) return false;
    
    if (requiresLanguage !== undefined) {
      if (metadata.requiresLanguage !== requiresLanguage) return false;
    }
    
    return true;
  });
}
