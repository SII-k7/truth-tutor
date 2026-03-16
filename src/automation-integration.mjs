/**
 * Automation Workflows Integration for Truth Tutor
 * 
 * Integrates truth-tutor with automation-workflows skill to:
 * - Generate periodic learning reports
 * - Trigger learning recommendations
 * - Schedule study sessions
 * - Create workflow templates for common learning patterns
 */

/**
 * Workflow trigger types
 */
export const TRIGGER_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ON_GAP_DETECTED: 'on_gap_detected',
  ON_MILESTONE: 'on_milestone',
  ON_SCHEDULE: 'on_schedule',
};

/**
 * Workflow action types
 */
export const ACTION_TYPES = {
  GENERATE_REPORT: 'generate_report',
  SEND_NOTIFICATION: 'send_notification',
  CREATE_TASK: 'create_task',
  SCHEDULE_SESSION: 'schedule_session',
  RECOMMEND_DRILL: 'recommend_drill',
  UPDATE_CALENDAR: 'update_calendar',
};

/**
 * Learning workflow template
 */
export class LearningWorkflow {
  constructor(name, trigger, actions) {
    this.id = `workflow_${Date.now()}`;
    this.name = name;
    this.trigger = trigger;
    this.actions = actions;
    this.createdAt = new Date().toISOString();
    this.enabled = true;
  }

  /**
   * Convert to automation-workflows format
   */
  toAutomationFormat() {
    return {
      id: this.id,
      name: this.name,
      trigger: this.trigger,
      actions: this.actions,
      enabled: this.enabled,
    };
  }
}

/**
 * Predefined workflow templates
 */
export const WORKFLOW_TEMPLATES = {
  /**
   * Daily learning report
   */
  DAILY_REPORT: {
    name: 'Daily Learning Report',
    trigger: {
      type: TRIGGER_TYPES.DAILY,
      time: '09:00', // 9 AM
    },
    actions: [
      {
        type: ACTION_TYPES.GENERATE_REPORT,
        config: {
          period: 'daily',
          includeGaps: true,
          includeProgress: true,
        },
      },
      {
        type: ACTION_TYPES.SEND_NOTIFICATION,
        config: {
          channel: 'email',
          template: 'daily_report',
        },
      },
    ],
  },

  /**
   * Weekly learning summary
   */
  WEEKLY_SUMMARY: {
    name: 'Weekly Learning Summary',
    trigger: {
      type: TRIGGER_TYPES.WEEKLY,
      day: 'sunday',
      time: '18:00', // 6 PM Sunday
    },
    actions: [
      {
        type: ACTION_TYPES.GENERATE_REPORT,
        config: {
          period: 'weekly',
          includeGaps: true,
          includeProgress: true,
          includeTrends: true,
        },
      },
      {
        type: ACTION_TYPES.SEND_NOTIFICATION,
        config: {
          channel: 'email',
          template: 'weekly_summary',
        },
      },
      {
        type: ACTION_TYPES.CREATE_TASK,
        config: {
          title: 'Review weekly learning summary',
          dueDate: 'next_monday',
        },
      },
    ],
  },

  /**
   * Auto-schedule study sessions
   */
  AUTO_SCHEDULE_SESSIONS: {
    name: 'Auto-Schedule Study Sessions',
    trigger: {
      type: TRIGGER_TYPES.ON_GAP_DETECTED,
    },
    actions: [
      {
        type: ACTION_TYPES.RECOMMEND_DRILL,
        config: {
          count: 3,
          difficulty: 'adaptive',
        },
      },
      {
        type: ACTION_TYPES.SCHEDULE_SESSION,
        config: {
          duration: 30, // minutes
          frequency: 'daily',
          daysAhead: 7,
        },
      },
      {
        type: ACTION_TYPES.UPDATE_CALENDAR,
        config: {
          calendar: 'learning',
          color: 'blue',
        },
      },
    ],
  },

  /**
   * Milestone celebration
   */
  MILESTONE_CELEBRATION: {
    name: 'Milestone Celebration',
    trigger: {
      type: TRIGGER_TYPES.ON_MILESTONE,
      milestone: 'gap_closed',
    },
    actions: [
      {
        type: ACTION_TYPES.SEND_NOTIFICATION,
        config: {
          channel: 'all',
          template: 'milestone_achieved',
          message: 'Congratulations! You closed a learning gap!',
        },
      },
      {
        type: ACTION_TYPES.CREATE_TASK,
        config: {
          title: 'Celebrate learning milestone',
          description: 'Take a break and celebrate your progress!',
        },
      },
    ],
  },

  /**
   * Monthly learning review
   */
  MONTHLY_REVIEW: {
    name: 'Monthly Learning Review',
    trigger: {
      type: TRIGGER_TYPES.MONTHLY,
      day: 1,
      time: '10:00',
    },
    actions: [
      {
        type: ACTION_TYPES.GENERATE_REPORT,
        config: {
          period: 'monthly',
          includeGaps: true,
          includeProgress: true,
          includeTrends: true,
          includeRecommendations: true,
        },
      },
      {
        type: ACTION_TYPES.SEND_NOTIFICATION,
        config: {
          channel: 'email',
          template: 'monthly_review',
        },
      },
    ],
  },
};

/**
 * Workflow manager
 */
export class WorkflowManager {
  constructor() {
    this.workflows = [];
  }

  /**
   * Create workflow from template
   */
  createFromTemplate(templateKey, customizations = {}) {
    const template = WORKFLOW_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`Unknown template: ${templateKey}`);
    }

    const trigger = { ...template.trigger, ...customizations.trigger };
    const actions = customizations.actions || template.actions;

    return new LearningWorkflow(template.name, trigger, actions);
  }

  /**
   * Add workflow
   */
  addWorkflow(workflow) {
    this.workflows.push(workflow);
    return workflow;
  }

  /**
   * Get all workflows
   */
  getWorkflows() {
    return this.workflows;
  }

  /**
   * Enable workflow
   */
  enableWorkflow(workflowId) {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (workflow) {
      workflow.enabled = true;
    }
    return workflow;
  }

  /**
   * Disable workflow
   */
  disableWorkflow(workflowId) {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (workflow) {
      workflow.enabled = false;
    }
    return workflow;
  }

  /**
   * Export workflows for automation-workflows skill
   */
  exportForAutomation() {
    return this.workflows
      .filter(w => w.enabled)
      .map(w => w.toAutomationFormat());
  }
}

/**
 * Report generator for workflows
 */
export class ReportGenerator {
  constructor(learningProfile) {
    this.profile = learningProfile;
  }

  /**
   * Generate daily report
   */
  generateDailyReport() {
    return {
      type: 'daily',
      date: new Date().toISOString().split('T')[0],
      gaps: this.profile.recentGaps || [],
      progress: this.profile.dailyProgress || 0,
      drillsCompleted: this.profile.drillsCompletedToday || 0,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Generate weekly report
   */
  generateWeeklyReport() {
    return {
      type: 'weekly',
      week: this.getWeekNumber(),
      totalGaps: this.profile.totalGaps || 0,
      gapsClosed: this.profile.gapsClosedThisWeek || 0,
      progress: this.profile.weeklyProgress || 0,
      drillsCompleted: this.profile.drillsCompletedThisWeek || 0,
      trends: this.analyzeTrends(),
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Generate monthly report
   */
  generateMonthlyReport() {
    return {
      type: 'monthly',
      month: new Date().toISOString().slice(0, 7),
      totalGaps: this.profile.totalGaps || 0,
      gapsClosed: this.profile.gapsClosedThisMonth || 0,
      progress: this.profile.monthlyProgress || 0,
      drillsCompleted: this.profile.drillsCompletedThisMonth || 0,
      trends: this.analyzeTrends(),
      recommendations: this.generateRecommendations(),
      nextSteps: this.generateNextSteps(),
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recs = [];

    if (this.profile.recentGaps && this.profile.recentGaps.length > 0) {
      recs.push({
        type: 'focus_area',
        message: `Focus on: ${this.profile.recentGaps[0]}`,
      });
    }

    if (this.profile.drillsCompletedToday === 0) {
      recs.push({
        type: 'action',
        message: 'Complete at least one drill today',
      });
    }

    return recs;
  }

  /**
   * Analyze trends
   */
  analyzeTrends() {
    return {
      gapTrend: this.profile.gapTrend || 'stable',
      progressTrend: this.profile.progressTrend || 'improving',
      engagementTrend: this.profile.engagementTrend || 'consistent',
    };
  }

  /**
   * Generate next steps
   */
  generateNextSteps() {
    return [
      'Review this month\'s learning gaps',
      'Plan next month\'s focus areas',
      'Schedule regular study sessions',
    ];
  }

  /**
   * Get week number
   */
  getWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek);
  }
}

/**
 * Helper to create a complete learning automation setup
 */
export function createLearningAutomationSetup() {
  const manager = new WorkflowManager();

  // Add default workflows
  manager.addWorkflow(
    manager.createFromTemplate('DAILY_REPORT')
  );
  manager.addWorkflow(
    manager.createFromTemplate('WEEKLY_SUMMARY')
  );
  manager.addWorkflow(
    manager.createFromTemplate('AUTO_SCHEDULE_SESSIONS')
  );
  manager.addWorkflow(
    manager.createFromTemplate('MONTHLY_REVIEW')
  );

  return manager;
}
