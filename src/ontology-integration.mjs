/**
 * Ontology Integration for Truth Tutor
 * 
 * Integrates truth-tutor with the ontology skill to:
 * - Store learner profiles as entities
 * - Track learning gaps in the knowledge graph
 * - Link concepts and prerequisites
 * - Enable cross-skill learning data sharing
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const ONTOLOGY_PATH = join(homedir(), '.openclaw/workspace/memory/ontology/graph.jsonl');

/**
 * Entity types for truth-tutor in ontology
 */
export const ENTITY_TYPES = {
  LEARNER_PROFILE: 'LearnerProfile',
  LEARNING_GAP: 'LearningGap',
  CONCEPT: 'Concept',
  DRILL: 'Drill',
  LEARNING_SESSION: 'LearningSession',
};

export const RELATION_TYPES = {
  HAS_GAP: 'has_gap',
  PREREQUISITE: 'prerequisite',
  RELATED_TO: 'related_to',
  COMPLETED_DRILL: 'completed_drill',
  BELONGS_TO: 'belongs_to',
};

/**
 * Create or update a learner profile entity
 */
export async function createLearnerProfile(userId, profileData) {
  const entity = {
    id: `learner_${userId}`,
    type: ENTITY_TYPES.LEARNER_PROFILE,
    properties: {
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...profileData,
    },
  };

  await appendToOntology({ op: 'create', entity });
  return entity;
}

/**
 * Create a learning gap entity
 */
export async function createLearningGap(gapData) {
  const gapId = `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const entity = {
    id: gapId,
    type: ENTITY_TYPES.LEARNING_GAP,
    properties: {
      createdAt: new Date().toISOString(),
      ...gapData,
    },
  };

  await appendToOntology({ op: 'create', entity });
  return entity;
}

/**
 * Create a concept entity
 */
export async function createConcept(conceptName, metadata = {}) {
  const conceptId = `concept_${conceptName.toLowerCase().replace(/\s+/g, '_')}`;
  
  const entity = {
    id: conceptId,
    type: ENTITY_TYPES.CONCEPT,
    properties: {
      name: conceptName,
      createdAt: new Date().toISOString(),
      ...metadata,
    },
  };

  await appendToOntology({ op: 'create', entity });
  return entity;
}

/**
 * Link a learning gap to a learner profile
 */
export async function linkGapToLearner(learnerId, gapId) {
  const relation = {
    op: 'relate',
    from: `learner_${learnerId}`,
    rel: RELATION_TYPES.HAS_GAP,
    to: gapId,
  };

  await appendToOntology(relation);
  return relation;
}

/**
 * Link a concept as a prerequisite to another concept
 */
export async function linkPrerequisite(conceptId, prerequisiteId) {
  const relation = {
    op: 'relate',
    from: conceptId,
    rel: RELATION_TYPES.PREREQUISITE,
    to: prerequisiteId,
  };

  await appendToOntology(relation);
  return relation;
}

/**
 * Link a gap to related concepts
 */
export async function linkGapToConcepts(gapId, conceptIds) {
  const relations = conceptIds.map(conceptId => ({
    op: 'relate',
    from: gapId,
    rel: RELATION_TYPES.RELATED_TO,
    to: conceptId,
  }));

  for (const relation of relations) {
    await appendToOntology(relation);
  }

  return relations;
}

/**
 * Record a completed drill
 */
export async function recordCompletedDrill(learnerId, drillId, result) {
  const relation = {
    op: 'relate',
    from: `learner_${learnerId}`,
    rel: RELATION_TYPES.COMPLETED_DRILL,
    to: drillId,
    properties: {
      completedAt: new Date().toISOString(),
      result,
    },
  };

  await appendToOntology(relation);
  return relation;
}

/**
 * Query learner profile from ontology
 */
export async function queryLearnerProfile(userId) {
  try {
    const lines = await readFile(ONTOLOGY_PATH, 'utf8');
    const entities = lines
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .filter(entry => 
        entry.op === 'create' && 
        entry.entity?.id === `learner_${userId}` &&
        entry.entity?.type === ENTITY_TYPES.LEARNER_PROFILE
      );

    return entities.length > 0 ? entities[entities.length - 1].entity : null;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Query all gaps for a learner
 */
export async function queryLearnerGaps(userId) {
  try {
    const lines = await readFile(ONTOLOGY_PATH, 'utf8');
    const entries = lines
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    // Find all gaps linked to this learner
    const gapIds = new Set();
    entries
      .filter(e => 
        e.op === 'relate' && 
        e.from === `learner_${userId}` &&
        e.rel === RELATION_TYPES.HAS_GAP
      )
      .forEach(e => gapIds.add(e.to));

    // Get gap entities
    const gaps = entries
      .filter(e => 
        e.op === 'create' && 
        e.entity?.type === ENTITY_TYPES.LEARNING_GAP &&
        gapIds.has(e.entity.id)
      )
      .map(e => e.entity);

    return gaps;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Append entry to ontology graph
 */
async function appendToOntology(entry) {
  try {
    const line = JSON.stringify(entry) + '\n';
    await writeFile(ONTOLOGY_PATH, line, { flag: 'a' });
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Create directory if it doesn't exist
      const dir = ONTOLOGY_PATH.split('/').slice(0, -1).join('/');
      await writeFile(ONTOLOGY_PATH, JSON.stringify(entry) + '\n');
    } else {
      throw err;
    }
  }
}

/**
 * Create a learning session record
 */
export async function createLearningSession(userId, sessionData) {
  const sessionId = `session_${Date.now()}`;
  
  const entity = {
    id: sessionId,
    type: ENTITY_TYPES.LEARNING_SESSION,
    properties: {
      userId,
      startedAt: new Date().toISOString(),
      ...sessionData,
    },
  };

  await appendToOntology({ op: 'create', entity });
  
  // Link to learner
  await linkGapToLearner(userId, sessionId);
  
  return entity;
}
