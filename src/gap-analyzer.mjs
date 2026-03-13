/**
 * Knowledge gap analysis and pattern recognition
 * Identifies recurring learning gaps and learning patterns
 */

/**
 * Analyze knowledge gaps and identify patterns
 * @param {Object} profile - Learning profile
 * @returns {Object} Gap analysis with patterns and recommendations
 */
export function analyzeGapPatterns(profile) {
  if (!profile || !profile.gapFrequency) {
    return {
      patterns: [],
      topGaps: [],
      gapCategories: {},
      learningStyle: 'unknown',
      recommendations: [],
    };
  }

  // Identify top gaps by frequency
  const topGaps = Object.entries(profile.gapFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gap, count]) => ({ gap, count }));

  // Categorize gaps
  const gapCategories = categorizeGaps(topGaps.map(g => g.gap));

  // Identify patterns
  const patterns = identifyPatterns(topGaps, gapCategories);

  // Determine learning style
  const learningStyle = determineLearningStyle(patterns, gapCategories);

  // Generate recommendations
  const recommendations = generateRecommendations(patterns, learningStyle, topGaps);

  return {
    patterns,
    topGaps,
    gapCategories,
    learningStyle,
    recommendations,
  };
}

/**
 * Categorize gaps into semantic categories
 * @param {string[]} gaps - List of gaps
 * @returns {Object} Categorized gaps
 */
function categorizeGaps(gaps) {
  const categories = {
    conceptual: [],
    procedural: [],
    foundational: [],
    application: [],
    integration: [],
  };

  const conceptualKeywords = ['understand', 'concept', 'meaning', 'definition', 'why', 'intuition'];
  const proceduralKeywords = ['how', 'step', 'process', 'method', 'algorithm', 'procedure'];
  const foundationalKeywords = ['foundation', 'prerequisite', 'basic', 'fundamental', 'background'];
  const applicationKeywords = ['apply', 'use', 'example', 'practice', 'implement'];
  const integrationKeywords = ['connect', 'relate', 'integrate', 'combine', 'link'];

  for (const gap of gaps) {
    const lower = gap.toLowerCase();
    if (conceptualKeywords.some(kw => lower.includes(kw))) {
      categories.conceptual.push(gap);
    } else if (proceduralKeywords.some(kw => lower.includes(kw))) {
      categories.procedural.push(gap);
    } else if (foundationalKeywords.some(kw => lower.includes(kw))) {
      categories.foundational.push(gap);
    } else if (applicationKeywords.some(kw => lower.includes(kw))) {
      categories.application.push(gap);
    } else if (integrationKeywords.some(kw => lower.includes(kw))) {
      categories.integration.push(gap);
    } else {
      categories.conceptual.push(gap);
    }
  }

  return categories;
}

/**
 * Identify learning patterns from gaps
 * @param {Array} topGaps - Top gaps with frequency
 * @param {Object} categories - Categorized gaps
 * @returns {string[]} Identified patterns
 */
function identifyPatterns(topGaps, categories) {
  const patterns = [];

  // Pattern 1: Conceptual weakness
  if (categories.conceptual.length > categories.procedural.length) {
    patterns.push('conceptual-weakness');
  }

  // Pattern 2: Procedural weakness
  if (categories.procedural.length > categories.conceptual.length) {
    patterns.push('procedural-weakness');
  }

  // Pattern 3: Foundation gaps
  if (categories.foundational.length > 0) {
    patterns.push('foundation-gaps');
  }

  // Pattern 4: Application difficulty
  if (categories.application.length > 0) {
    patterns.push('application-difficulty');
  }

  // Pattern 5: Integration challenges
  if (categories.integration.length > 0) {
    patterns.push('integration-challenges');
  }

  // Pattern 6: High frequency gaps (recurring issues)
  if (topGaps.length > 0 && topGaps[0].count >= 3) {
    patterns.push('recurring-blocker');
  }

  return patterns;
}

/**
 * Determine learning style based on patterns
 * @param {string[]} patterns - Identified patterns
 * @param {Object} categories - Categorized gaps
 * @returns {string} Learning style
 */
function determineLearningStyle(patterns, categories) {
  if (patterns.includes('conceptual-weakness')) {
    return 'visual-conceptual';
  }
  if (patterns.includes('procedural-weakness')) {
    return 'hands-on-practice';
  }
  if (patterns.includes('foundation-gaps')) {
    return 'bottom-up-learner';
  }
  if (patterns.includes('application-difficulty')) {
    return 'theory-first';
  }
  if (patterns.includes('integration-challenges')) {
    return 'compartmentalized-learner';
  }
  return 'balanced-learner';
}

/**
 * Generate recommendations based on analysis
 * @param {string[]} patterns - Identified patterns
 * @param {string} learningStyle - Determined learning style
 * @param {Array} topGaps - Top gaps
 * @returns {string[]} Recommendations
 */
function generateRecommendations(patterns, learningStyle, topGaps) {
  const recommendations = [];

  if (patterns.includes('conceptual-weakness')) {
    recommendations.push('Focus on visual explanations and analogies to build conceptual understanding');
    recommendations.push('Use diagrams, flowcharts, and concept maps to visualize relationships');
  }

  if (patterns.includes('procedural-weakness')) {
    recommendations.push('Practice step-by-step procedures with worked examples');
    recommendations.push('Use drill exercises to build procedural fluency');
  }

  if (patterns.includes('foundation-gaps')) {
    recommendations.push('Review foundational concepts before advancing to complex topics');
    recommendations.push('Build a strong foundation by revisiting prerequisite materials');
  }

  if (patterns.includes('application-difficulty')) {
    recommendations.push('Practice applying concepts to real-world examples');
    recommendations.push('Work on case studies and practical problems');
  }

  if (patterns.includes('integration-challenges')) {
    recommendations.push('Create connections between different topics');
    recommendations.push('Practice integrating multiple concepts in complex problems');
  }

  if (patterns.includes('recurring-blocker')) {
    const topGap = topGaps[0]?.gap || 'key concept';
    recommendations.push(`Address the recurring blocker: "${topGap}" - this is blocking your progress`);
    recommendations.push('Dedicate focused time to mastering this specific gap');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue with current learning approach - you are making good progress');
  }

  return recommendations;
}

/**
 * Calculate learning progress metrics
 * @param {Object} profile - Learning profile
 * @param {Object} previousProfile - Previous profile snapshot
 * @returns {Object} Progress metrics
 */
export function calculateProgressMetrics(profile, previousProfile) {
  if (!previousProfile) {
    return {
      improvementRate: 0,
      gapReductionRate: 0,
      sessionCount: profile.sessions || 0,
      averageGapsPerSession: 0,
    };
  }

  const currentGapCount = Object.keys(profile.gapFrequency || {}).length;
  const previousGapCount = Object.keys(previousProfile.gapFrequency || {}).length;
  const gapReductionRate = previousGapCount > 0 
    ? ((previousGapCount - currentGapCount) / previousGapCount) * 100 
    : 0;

  const sessionDiff = (profile.sessions || 0) - (previousProfile.sessions || 0);
  const averageGapsPerSession = sessionDiff > 0 
    ? currentGapCount / (profile.sessions || 1)
    : 0;

  return {
    improvementRate: Math.max(0, gapReductionRate),
    gapReductionRate,
    sessionCount: profile.sessions || 0,
    averageGapsPerSession: Math.round(averageGapsPerSession * 100) / 100,
  };
}

/**
 * Generate learning profile summary with insights
 * @param {Object} profile - Learning profile
 * @returns {string} Formatted summary with insights
 */
export function generateProfileInsights(profile) {
  const analysis = analyzeGapPatterns(profile);
  const lines = [];

  lines.push('=== Learning Profile Insights ===');
  lines.push('');

  if (analysis.patterns.length > 0) {
    lines.push('📊 Identified Patterns:');
    for (const pattern of analysis.patterns) {
      lines.push(`  • ${formatPattern(pattern)}`);
    }
    lines.push('');
  }

  if (analysis.topGaps.length > 0) {
    lines.push('🎯 Top Knowledge Gaps:');
    for (const { gap, count } of analysis.topGaps) {
      lines.push(`  • ${gap} (encountered ${count}x)`);
    }
    lines.push('');
  }

  lines.push(`🧠 Learning Style: ${formatLearningStyle(analysis.learningStyle)}`);
  lines.push('');

  if (analysis.recommendations.length > 0) {
    lines.push('💡 Recommendations:');
    for (const rec of analysis.recommendations) {
      lines.push(`  • ${rec}`);
    }
  }

  return lines.join('\n');
}

function formatPattern(pattern) {
  const patterns = {
    'conceptual-weakness': 'Conceptual Understanding Gaps',
    'procedural-weakness': 'Procedural/How-To Gaps',
    'foundation-gaps': 'Missing Foundational Knowledge',
    'application-difficulty': 'Difficulty Applying Concepts',
    'integration-challenges': 'Trouble Integrating Multiple Concepts',
    'recurring-blocker': 'Recurring Blocker Identified',
  };
  return patterns[pattern] || pattern;
}

function formatLearningStyle(style) {
  const styles = {
    'visual-conceptual': 'Visual-Conceptual Learner',
    'hands-on-practice': 'Hands-On Practice Learner',
    'bottom-up-learner': 'Bottom-Up Learner (Foundation First)',
    'theory-first': 'Theory-First Learner',
    'compartmentalized-learner': 'Compartmentalized Learner',
    'balanced-learner': 'Balanced Learner',
  };
  return styles[style] || style;
}
