/**
 * Personalized learning path recommender
 * Generates learning paths based on diagnosis results
 */

/**
 * Generate learning path based on gap analysis
 * @param {Object} gapAnalysis - Gap analysis from gap-analyzer
 * @param {Object} profile - Learning profile
 * @returns {Object} Personalized learning path
 */
export function generateLearningPath(gapAnalysis, profile) {
  if (!gapAnalysis || !gapAnalysis.topGaps) {
    return {
      phases: [],
      resources: [],
      estimatedDuration: 0,
      priority: [],
    };
  }

  const phases = [];
  const resources = [];
  const priority = [];

  // Phase 1: Foundation building (if needed)
  if (gapAnalysis.patterns.includes('foundation-gaps')) {
    phases.push({
      phase: 1,
      name: 'Foundation Building',
      duration: '1-2 weeks',
      focus: 'Review and strengthen foundational concepts',
      activities: [
        'Review prerequisite materials',
        'Complete foundation drills',
        'Build concept maps',
      ],
    });
    
    resources.push({
      type: 'foundation',
      title: 'Foundational Concepts Review',
      description: 'Comprehensive review of prerequisite knowledge',
      priority: 'high',
    });
  }

  // Phase 2: Conceptual understanding (if needed)
  if (gapAnalysis.patterns.includes('conceptual-weakness')) {
    phases.push({
      phase: phases.length + 1,
      name: 'Conceptual Understanding',
      duration: '2-3 weeks',
      focus: 'Build deep conceptual understanding',
      activities: [
        'Study visual explanations and diagrams',
        'Create concept maps and analogies',
        'Explain concepts in your own words',
      ],
    });
    
    resources.push({
      type: 'conceptual',
      title: 'Visual Learning Materials',
      description: 'Diagrams, flowcharts, and visual explanations',
      priority: 'high',
    });
  }

  // Phase 3: Procedural mastery (if needed)
  if (gapAnalysis.patterns.includes('procedural-weakness')) {
    phases.push({
      phase: phases.length + 1,
      name: 'Procedural Mastery',
      duration: '2-3 weeks',
      focus: 'Master step-by-step procedures',
      activities: [
        'Work through step-by-step examples',
        'Practice procedures with drills',
        'Build procedural fluency',
      ],
    });
    
    resources.push({
      type: 'procedural',
      title: 'Worked Examples and Drills',
      description: 'Step-by-step examples and practice problems',
      priority: 'high',
    });
  }

  // Phase 4: Application and integration
  phases.push({
    phase: phases.length + 1,
    name: 'Application and Integration',
    duration: '2-4 weeks',
    focus: 'Apply concepts to real-world problems',
    activities: [
      'Solve application problems',
      'Integrate multiple concepts',
      'Work on case studies',
    ],
  });

  resources.push({
    type: 'application',
    title: 'Real-World Applications',
    description: 'Case studies and practical problems',
    priority: 'medium',
  });

  // Phase 5: Mastery and review
  phases.push({
    phase: phases.length + 1,
    name: 'Mastery and Review',
    duration: '1-2 weeks',
    focus: 'Consolidate learning and prepare for advanced topics',
    activities: [
      'Review and consolidate learning',
      'Take practice tests',
      'Prepare for advanced topics',
    ],
  });

  resources.push({
    type: 'review',
    title: 'Practice Tests and Review',
    description: 'Comprehensive review and assessment',
    priority: 'medium',
  });

  // Build priority list based on top gaps
  for (const gap of gapAnalysis.topGaps.slice(0, 5)) {
    priority.push({
      gap: gap.gap,
      frequency: gap.count,
      urgency: gap.count >= 3 ? 'critical' : gap.count >= 2 ? 'high' : 'medium',
      recommendedPhase: 1,
    });
  }

  const estimatedDuration = phases.reduce((sum, p) => {
    const weeks = parseInt(p.duration.split('-')[1]) || 1;
    return sum + weeks;
  }, 0);

  return {
    phases,
    resources,
    priority,
    estimatedDuration,
    learningStyle: gapAnalysis.learningStyle,
    recommendations: gapAnalysis.recommendations,
  };
}

/**
 * Get resource recommendations for a specific gap
 * @param {string} gap - Knowledge gap
 * @param {string} learningStyle - User's learning style
 * @returns {Object[]} Recommended resources
 */
export function getResourceRecommendations(gap, learningStyle) {
  const resources = [];

  // Base resources for any gap
  resources.push({
    type: 'explanation',
    title: `Understanding: ${gap}`,
    description: 'Clear explanation of the concept',
    format: 'text/video',
  });

  // Learning style specific resources
  if (learningStyle === 'visual-conceptual') {
    resources.push({
      type: 'visual',
      title: `Visual Guide: ${gap}`,
      description: 'Diagrams, flowcharts, and visual representations',
      format: 'diagram/infographic',
    });
  } else if (learningStyle === 'hands-on-practice') {
    resources.push({
      type: 'practice',
      title: `Practice Problems: ${gap}`,
      description: 'Hands-on exercises and practice problems',
      format: 'interactive/problem-set',
    });
  } else if (learningStyle === 'bottom-up-learner') {
    resources.push({
      type: 'foundation',
      title: `Foundations for: ${gap}`,
      description: 'Prerequisite concepts and building blocks',
      format: 'text/course',
    });
  } else if (learningStyle === 'theory-first') {
    resources.push({
      type: 'theory',
      title: `Theory Behind: ${gap}`,
      description: 'Theoretical foundations and principles',
      format: 'paper/textbook',
    });
  }

  // Always add examples and drills
  resources.push({
    type: 'examples',
    title: `Examples: ${gap}`,
    description: 'Worked examples and case studies',
    format: 'example/case-study',
  });

  resources.push({
    type: 'drill',
    title: `Drill: ${gap}`,
    description: 'Interactive drills to practice and verify understanding',
    format: 'interactive/quiz',
  });

  return resources;
}

/**
 * Calculate learning path progress
 * @param {Object} path - Learning path
 * @param {Object} profile - Learning profile
 * @returns {Object} Progress metrics
 */
export function calculatePathProgress(path, profile) {
  if (!path || !path.phases || path.phases.length === 0) {
    return {
      currentPhase: 0,
      completedPhases: 0,
      progressPercentage: 0,
      estimatedTimeRemaining: 0,
    };
  }

  // Estimate current phase based on sessions and gaps
  const sessions = profile?.sessions || 0;
  const gapCount = Object.keys(profile?.gapFrequency || {}).length;
  
  let currentPhase = 1;
  if (sessions > 5 && gapCount < 3) {
    currentPhase = Math.min(path.phases.length, 3);
  } else if (sessions > 10) {
    currentPhase = Math.min(path.phases.length, 4);
  }

  const completedPhases = Math.max(0, currentPhase - 1);
  const progressPercentage = (completedPhases / path.phases.length) * 100;
  
  // Estimate remaining time
  const remainingPhases = path.phases.slice(currentPhase);
  const estimatedTimeRemaining = remainingPhases.reduce((sum, p) => {
    const weeks = parseInt(p.duration.split('-')[1]) || 1;
    return sum + weeks;
  }, 0);

  return {
    currentPhase,
    completedPhases,
    progressPercentage: Math.round(progressPercentage),
    estimatedTimeRemaining,
  };
}

/**
 * Generate learning path summary
 * @param {Object} path - Learning path
 * @param {Object} progress - Path progress
 * @returns {string} Formatted summary
 */
export function summarizeLearningPath(path, progress) {
  const lines = [];

  lines.push('📚 Your Personalized Learning Path');
  lines.push('');

  if (path.phases && path.phases.length > 0) {
    lines.push('Phases:');
    for (const phase of path.phases) {
      const marker = progress && progress.currentPhase === phase.phase ? '▶️' : '  ';
      lines.push(`${marker} Phase ${phase.phase}: ${phase.name} (${phase.duration})`);
    }
    lines.push('');
  }

  if (path.priority && path.priority.length > 0) {
    lines.push('Priority Gaps to Address:');
    for (const item of path.priority.slice(0, 3)) {
      lines.push(`  • ${item.gap} (${item.urgency})`);
    }
    lines.push('');
  }

  if (progress) {
    lines.push(`Progress: ${progress.progressPercentage}% complete`);
    lines.push(`Estimated time remaining: ${progress.estimatedTimeRemaining} weeks`);
  }

  return lines.join('\n');
}
