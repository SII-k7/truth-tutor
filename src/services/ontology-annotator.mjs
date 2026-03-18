/**
 * Ontology Annotator Service
 * 
 * Links annotations to the ontology knowledge graph:
 * - Creates Concept entities for key terms
 * - Creates LearningGap entities for identified gaps
 * - Links annotations to concepts
 * - Builds prerequisite chains
 * - Queries related concepts
 */

import {
  createConcept,
  createLearningGap,
  linkPrerequisite,
  linkGapToConcepts,
  ENTITY_TYPES,
  RELATION_TYPES
} from '../ontology-integration.mjs';
import { ANNOTATION_TYPES } from './annotation-types.mjs';

/**
 * Process annotation and link to ontology
 */
export async function linkAnnotationToOntology(annotation, paperId, userId = 'default') {
  const { annotation_type, content, metadata } = annotation;
  
  try {
    // Extract concepts from annotation
    const concepts = await extractConceptsFromAnnotation(annotation);
    
    // Create concept entities in ontology
    const conceptEntities = [];
    for (const concept of concepts) {
      const entity = await createConcept(concept, {
        source: 'annotation',
        paperId,
        annotationId: annotation.id,
        annotationType: annotation_type
      });
      conceptEntities.push(entity);
    }
    
    // If this is a prerequisite annotation, create learning gap
    if (annotation_type === ANNOTATION_TYPES.PREREQUISITE) {
      const gap = await createLearningGap({
        description: content,
        paperId,
        annotationId: annotation.id,
        concepts: concepts,
        severity: 'medium'
      });
      
      // Link gap to concepts
      if (concepts.length > 0) {
        await linkGapToConcepts(gap.id, conceptEntities.map(c => c.id));
      }
    }
    
    // Build prerequisite relationships
    if (metadata?.prerequisites) {
      await buildPrerequisiteChain(concepts, metadata.prerequisites);
    }
    
    return {
      concepts: conceptEntities,
      relationships: metadata?.prerequisites || []
    };
  } catch (error) {
    console.error('Error linking annotation to ontology:', error);
    return { concepts: [], relationships: [] };
  }
}

/**
 * Extract concepts from annotation content
 */
async function extractConceptsFromAnnotation(annotation) {
  const { annotation_type, content, metadata } = annotation;
  
  const concepts = [];
  
  // Type-specific concept extraction
  switch (annotation_type) {
    case ANNOTATION_TYPES.CONCEPT:
      // Concepts are already extracted
      if (metadata?.concepts) {
        concepts.push(...metadata.concepts);
      } else {
        // Parse from content
        concepts.push(...content.split(',').map(c => c.trim()).filter(Boolean));
      }
      break;
      
    case ANNOTATION_TYPES.DEFINITION:
      // Extract defined terms
      const defMatch = content.match(/^([^:]+):/);
      if (defMatch) {
        concepts.push(defMatch[1].trim());
      }
      break;
      
    case ANNOTATION_TYPES.MATH:
      // Extract mathematical concepts
      const mathTerms = extractMathConcepts(content);
      concepts.push(...mathTerms);
      break;
      
    case ANNOTATION_TYPES.PREREQUISITE:
      // Extract prerequisite concepts
      if (metadata?.prerequisites) {
        concepts.push(...metadata.prerequisites);
      }
      break;
      
    case ANNOTATION_TYPES.EXPERIMENT:
      // Extract methodology concepts
      const methodTerms = extractMethodologyConcepts(content);
      concepts.push(...methodTerms);
      break;
      
    default:
      // Generic concept extraction from content
      const genericConcepts = extractGenericConcepts(content);
      concepts.push(...genericConcepts);
  }
  
  // Deduplicate and clean
  return [...new Set(concepts)]
    .map(c => c.trim())
    .filter(c => c.length > 2 && c.length < 100);
}

/**
 * Extract mathematical concepts from text
 */
function extractMathConcepts(text) {
  const concepts = [];
  
  // Common math terms
  const mathTerms = [
    'equation', 'formula', 'theorem', 'proof', 'lemma', 'corollary',
    'matrix', 'vector', 'tensor', 'derivative', 'integral', 'gradient',
    'optimization', 'convergence', 'loss function', 'objective function'
  ];
  
  for (const term of mathTerms) {
    if (text.toLowerCase().includes(term)) {
      concepts.push(term);
    }
  }
  
  return concepts;
}

/**
 * Extract methodology concepts from text
 */
function extractMethodologyConcepts(text) {
  const concepts = [];
  
  // Common methodology terms
  const methodTerms = [
    'dataset', 'baseline', 'benchmark', 'evaluation', 'metric',
    'training', 'testing', 'validation', 'cross-validation',
    'hyperparameter', 'architecture', 'model', 'algorithm',
    'preprocessing', 'augmentation', 'normalization'
  ];
  
  for (const term of methodTerms) {
    if (text.toLowerCase().includes(term)) {
      concepts.push(term);
    }
  }
  
  return concepts;
}

/**
 * Extract generic concepts from text
 */
function extractGenericConcepts(text) {
  const concepts = [];
  
  // Extract capitalized terms (likely proper nouns or technical terms)
  const capitalizedTerms = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  concepts.push(...capitalizedTerms);
  
  // Extract terms in quotes
  const quotedTerms = text.match(/"([^"]+)"/g) || [];
  concepts.push(...quotedTerms.map(t => t.replace(/"/g, '')));
  
  return concepts;
}

/**
 * Build prerequisite chain from concepts
 */
async function buildPrerequisiteChain(concepts, prerequisites) {
  try {
    // Link each concept to its prerequisites
    for (const concept of concepts) {
      const conceptId = `concept_${concept.toLowerCase().replace(/\s+/g, '_')}`;
      
      for (const prereq of prerequisites) {
        const prereqId = `concept_${prereq.toLowerCase().replace(/\s+/g, '_')}`;
        
        // Create prerequisite concept if it doesn't exist
        await createConcept(prereq, {
          source: 'prerequisite',
          isPrerequisite: true
        });
        
        // Link prerequisite relationship
        await linkPrerequisite(conceptId, prereqId);
      }
    }
  } catch (error) {
    console.error('Error building prerequisite chain:', error);
  }
}

/**
 * Query related concepts for an annotation
 */
export async function getRelatedConcepts(annotationId, paperId) {
  // This would query the ontology graph for related concepts
  // For now, return a placeholder structure
  
  return {
    direct: [],      // Concepts directly linked to this annotation
    related: [],     // Concepts related through the graph
    prerequisites: [] // Prerequisite concepts
  };
}

/**
 * Query prerequisite chain for a concept
 */
export async function getPrerequisiteChain(conceptId) {
  // This would traverse the ontology graph to build prerequisite chain
  // For now, return a placeholder structure
  
  return {
    concept: conceptId,
    chain: [],       // Ordered list of prerequisites
    depth: 0         // Depth of prerequisite chain
  };
}

/**
 * Batch process annotations for ontology linking
 */
export async function batchLinkAnnotations(annotations, paperId, userId = 'default') {
  const results = [];
  
  for (const annotation of annotations) {
    try {
      const result = await linkAnnotationToOntology(annotation, paperId, userId);
      results.push({
        annotationId: annotation.id,
        success: true,
        ...result
      });
    } catch (error) {
      console.error(`Error linking annotation ${annotation.id}:`, error);
      results.push({
        annotationId: annotation.id,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Get concept graph for a paper
 */
export async function getPaperConceptGraph(paperId) {
  // This would build a graph of all concepts in the paper
  // and their relationships
  
  return {
    nodes: [],       // Concept nodes
    edges: [],       // Relationships between concepts
    clusters: []     // Concept clusters/categories
  };
}

/**
 * Identify learning gaps from annotations
 */
export async function identifyLearningGaps(annotations, userId = 'default') {
  const gaps = [];
  
  // Find prerequisite annotations
  const prerequisiteAnnotations = annotations.filter(
    a => a.annotation_type === ANNOTATION_TYPES.PREREQUISITE
  );
  
  for (const annotation of prerequisiteAnnotations) {
    const concepts = await extractConceptsFromAnnotation(annotation);
    
    gaps.push({
      description: annotation.content,
      concepts,
      source: 'annotation',
      annotationId: annotation.id,
      severity: 'medium'
    });
  }
  
  return gaps;
}

/**
 * Get concept definition from ontology
 */
export async function getConceptDefinition(conceptName) {
  // This would query the ontology for concept definition
  // For now, return a placeholder
  
  return {
    name: conceptName,
    definition: null,
    source: null,
    relatedConcepts: []
  };
}

/**
 * Update concept relationships based on new annotations
 */
export async function updateConceptRelationships(paperId) {
  // This would analyze all annotations in a paper
  // and update concept relationships in the ontology
  
  return {
    updated: 0,
    created: 0,
    errors: []
  };
}
