/**
 * Adaptive drill system with self-adjusting difficulty
 * Tracks drill completion and effectiveness
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));
const DRILL_FILE = join(DATA_DIR, 'adaptive-drills.json');

/**
 * Load adaptive drill state
 * @returns {Promise<Object>} Drill state with history
 */
export async function loadAdaptiveDrillState() {
  try {
    const raw = await readFile(DRILL_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      drills: Array.isArray(parsed.drills) ? parsed.drills : [],
      completionStats: parsed.completionStats || {},
      difficultyLevels: parsed.difficultyLevels || {},
      updatedAt: parsed.updatedAt || null,
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return {
      drills: [],
      completionStats: {},
      difficultyLevels: {},
      updatedAt: null,
    };
  }
}

/**
 * Save adaptive drill state
 * @param {Object} state - Drill state
 * @returns {Promise<Object>} Saved state
 */
export async function saveAdaptiveDrillState(state) {
  const updated = {
    drills: state.drills || [],
    completionStats: state.completionStats || {},
    difficultyLevels: state.difficultyLevels || {},
    updatedAt: new Date().toISOString(),
  };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DRILL_FILE, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  return updated;
}

/**
 * Record drill completion
 * @param {Object} options - Drill completion options
 * @returns {Promise<Object>} Updated state
 */
export async function recordDrillCompletion({
  drillId,
  drillType,
  difficulty,
  completed,
  improvementEffect,
  gapAddress,
}) {
  const state = await loadAdaptiveDrillState();
  
  const drill = {
    drillId: drillId || generateDrillId(),
    drillType,
    difficulty: Math.max(1, Math.min(5, difficulty || 2)),
    completed: Boolean(completed),
    improvementEffect: Math.max(-1, Math.min(1, improvementEffect || 0)),
    gapAddress,
    timestamp: new Date().toISOString(),
  };
  
  state.drills.push(drill);
  
  // Update completion stats
  const key = `${drillType}`;
  if (!state.completionStats[key]) {
    state.completionStats[key] = {
      total: 0,
      completed: 0,
      avgImprovement: 0,
    };
  }
  
  state.completionStats[key].total += 1;
  if (completed) {
    state.completionStats[key].completed += 1;
  }
  
  // Update average improvement
  const stats = state.completionStats[key];
  stats.avgImprovement = (stats.avgImprovement * (stats.total - 1) + improvementEffect) / stats.total;
  
  // Update difficulty levels
  if (!state.difficultyLevels[drillType]) {
    state.difficultyLevels[drillType] = 2;
  }
  
  // Adjust difficulty based on completion rate
  const completionRate = stats.completed / stats.total;
  if (completionRate > 0.8) {
    state.difficultyLevels[drillType] = Math.min(5, state.difficultyLevels[drillType] + 0.5);
  } else if (completionRate < 0.5) {
    state.difficultyLevels[drillType] = Math.max(1, state.difficultyLevels[drillType] - 0.5);
  }
  
  return saveAdaptiveDrillState(state);
}

/**
 * Get recommended drill difficulty for a gap
 * @param {string} gapType - Type of gap
 * @param {Object} state - Current drill state
 * @returns {number} Recommended difficulty (1-5)
 */
export function getRecommendedDifficulty(gapType, state) {
  if (!state || !state.difficultyLevels) {
    return 2; // Default medium difficulty
  }
  
  const currentDifficulty = state.difficultyLevels[gapType] || 2;
  return Math.round(currentDifficulty * 2) / 2; // Round to nearest 0.5
}

/**
 * Get drill effectiveness analysis
 * @param {Object} state - Drill state
 * @returns {Object} Effectiveness metrics
 */
export function analyzeDrillEffectiveness(state) {
  if (!state || !state.drills || state.drills.length === 0) {
    return {
      mostEffectiveDrills: [],
      leastEffectiveDrills: [],
      overallCompletionRate: 0,
      averageImprovement: 0,
    };
  }
  
  // Calculate effectiveness by drill type
  const effectiveness = {};
  for (const drill of state.drills) {
    if (!effectiveness[drill.drillType]) {
      effectiveness[drill.drillType] = {
        count: 0,
        completed: 0,
        totalImprovement: 0,
      };
    }
    
    effectiveness[drill.drillType].count += 1;
    if (drill.completed) {
      effectiveness[drill.drillType].completed += 1;
    }
    effectiveness[drill.drillType].totalImprovement += drill.improvementEffect || 0;
  }
  
  // Sort by effectiveness
  const sorted = Object.entries(effectiveness)
    .map(([type, stats]) => ({
      type,
      completionRate: stats.completed / stats.count,
      avgImprovement: stats.totalImprovement / stats.count,
      effectiveness: (stats.completed / stats.count) * (stats.totalImprovement / stats.count),
    }))
    .sort((a, b) => b.effectiveness - a.effectiveness);
  
  const overallCompletionRate = state.drills.filter(d => d.completed).length / state.drills.length;
  const averageImprovement = state.drills.reduce((sum, d) => sum + (d.improvementEffect || 0), 0) / state.drills.length;
  
  return {
    mostEffectiveDrills: sorted.slice(0, 3),
    leastEffectiveDrills: sorted.slice(-3).reverse(),
    overallCompletionRate,
    averageImprovement,
  };
}

/**
 * Generate adaptive drill guidance
 * @param {Object} options - Options
 * @returns {string} Drill guidance
 */
export function generateAdaptiveDrillGuidance({
  gap,
  difficulty = 2,
  previousAttempts = 0,
  learningStyle = 'balanced-learner',
}) {
  const lines = [];
  
  lines.push(`📚 Adaptive Drill for: "${gap}"`);
  lines.push(`Difficulty Level: ${'⭐'.repeat(difficulty)}${'☆'.repeat(5 - difficulty)}`);
  lines.push('');
  
  // Customize based on learning style
  if (learningStyle === 'visual-conceptual') {
    lines.push('💡 Approach: Use visual representations and diagrams');
  } else if (learningStyle === 'hands-on-practice') {
    lines.push('💡 Approach: Practice with concrete examples and exercises');
  } else if (learningStyle === 'bottom-up-learner') {
    lines.push('💡 Approach: Start with fundamentals and build up');
  } else if (learningStyle === 'theory-first') {
    lines.push('💡 Approach: Understand theory before application');
  }
  
  lines.push('');
  
  // Adjust based on previous attempts
  if (previousAttempts > 2) {
    lines.push('⚠️ This gap has been challenging. Try a different approach:');
    lines.push('- Break it into smaller sub-problems');
    lines.push('- Seek alternative explanations or resources');
    lines.push('- Connect it to something you already understand');
  } else if (previousAttempts > 0) {
    lines.push('🔄 You\'ve attempted this before. Focus on:');
    lines.push('- What was confusing last time?');
    lines.push('- What new perspective can help?');
  }
  
  lines.push('');
  lines.push('✅ Success criteria:');
  lines.push('- Can you explain this in your own words?');
  lines.push('- Can you apply it to a new example?');
  lines.push('- Can you identify when to use this concept?');
  
  return lines.join('\n');
}

function generateDrillId() {
  return `drill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
