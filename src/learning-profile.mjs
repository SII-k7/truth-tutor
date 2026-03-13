import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeGapPatterns, calculateProgressMetrics, generateProfileInsights } from './gap-analyzer.mjs';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));
const PROFILE_DIR = join(DATA_DIR, 'profiles');

/**
 * Load learning profile with enhanced analysis
 * @param {string} profileKey - Profile identifier
 * @returns {Promise<Object>} Enhanced learning profile
 */
export async function loadLearningProfile(profileKey = 'default') {
  const safeKey = sanitizeKey(profileKey);
  const path = profilePath(safeKey);

  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw);
    const profile = {
      profileKey: safeKey,
      recurringGaps: Array.isArray(parsed.recurringGaps) ? parsed.recurringGaps.slice(0, 8) : [],
      gapFrequency: parsed.gapFrequency || {},
      recentTopics: Array.isArray(parsed.recentTopics) ? parsed.recentTopics.slice(0, 8) : [],
      sessions: Number(parsed.sessions || 0),
      updatedAt: parsed.updatedAt || null,
    };
    
    // Add enhanced analysis
    profile.gapAnalysis = analyzeGapPatterns(profile);
    profile.progressMetrics = calculateProgressMetrics(profile, null);
    
    return profile;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return createEmptyProfile(safeKey);
  }
}

/**
 * Save learning profile with enhanced analysis
 * @param {string} profileKey - Profile identifier
 * @param {Object} input - User input
 * @param {string} resultText - AI response text
 * @returns {Promise<Object>} Updated profile
 */
export async function saveLearningProfile(profileKey = 'default', input = {}, resultText = '') {
  const current = await loadLearningProfile(profileKey);
  const extractedGaps = extractRecurringGaps(resultText, input);
  
  // Track frequency of each gap
  const gapFrequency = { ...(current.gapFrequency || {}) };
  for (const gap of extractedGaps) {
    gapFrequency[gap] = (gapFrequency[gap] || 0) + 1;
  }
  
  const next = {
    profileKey: current.profileKey,
    recurringGaps: mergeUnique(extractedGaps, current.recurringGaps).slice(0, 8),
    gapFrequency,
    recentTopics: mergeUnique([input.paperTitle, input.topic].filter(Boolean), current.recentTopics).slice(0, 8),
    sessions: current.sessions + 1,
    updatedAt: new Date().toISOString(),
  };

  // Add enhanced analysis
  next.gapAnalysis = analyzeGapPatterns(next);
  next.progressMetrics = calculateProgressMetrics(next, current);

  await mkdir(dirname(profilePath(current.profileKey)), { recursive: true });
  await writeFile(profilePath(current.profileKey), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

/**
 * Create an empty profile with analysis
 * @param {string} profileKey - Profile identifier
 * @returns {Object} Empty profile
 */
function createEmptyProfile(profileKey) {
  const profile = {
    profileKey,
    recurringGaps: [],
    gapFrequency: {},
    recentTopics: [],
    sessions: 0,
    updatedAt: null,
  };
  profile.gapAnalysis = analyzeGapPatterns(profile);
  profile.progressMetrics = calculateProgressMetrics(profile, null);
  return profile;
}

/**
 * Generate profile insights summary
 * @param {Object} profile - Learning profile
 * @returns {string} Formatted insights
 */
export function summarizeLearningProfile(profile) {
  if (!profile) return '';
  
  const analysis = profile.gapAnalysis || analyzeGapPatterns(profile);
  const metrics = profile.progressMetrics || calculateProgressMetrics(profile, null);
  
  const lines = [];
  
  if (analysis.topGaps?.length) {
    lines.push(`🎯 Top gaps: ${analysis.topGaps.slice(0, 3).map(x => x.gap).join('; ')}`);
  }
  
  if (analysis.learningStyle && analysis.learningStyle !== 'unknown') {
    lines.push(`🧠 Learning style: ${formatLearningStyle(analysis.learningStyle)}`);
  }
  
  if (analysis.recommendations?.length) {
    lines.push(`💡 Top recommendation: ${analysis.recommendations[0]}`);
  }
  
  if (metrics.sessionCount) {
    lines.push(`📊 Sessions: ${metrics.sessionCount}`);
    if (metrics.improvementRate > 0) {
      lines.push(`📈 Improvement rate: +${Math.round(metrics.improvementRate)}%`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Get detailed insights for dashboard
 * @param {Object} profile - Learning profile
 * @returns {Object} Dashboard data
 */
export function getDashboardData(profile) {
  const analysis = profile?.gapAnalysis || analyzeGapPatterns(profile || {});
  const metrics = profile?.progressMetrics || calculateProgressMetrics(profile || {}, null);
  
  return {
    overview: {
      totalSessions: profile?.sessions || 0,
      totalGaps: Object.keys(profile?.gapFrequency || {}).length,
      improvementRate: metrics.improvementRate || 0,
      learningStyle: analysis.learningStyle || 'unknown',
    },
    gapCategories: analysis.gapCategories || {},
    topGaps: analysis.topGaps || [],
    patterns: analysis.patterns || [],
    recommendations: analysis.recommendations || [],
    recentTopics: profile?.recentTopics || [],
  };
}

function profilePath(profileKey) {
  const hashed = createHash('sha1').update(profileKey).digest('hex').slice(0, 16);
  return join(PROFILE_DIR, `${hashed}.json`);
}

function sanitizeKey(value) {
  const raw = String(value || 'default').trim();
  return raw.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80) || 'default';
}

function mergeUnique(primary = [], secondary = []) {
  return Array.from(new Set([...primary, ...secondary].filter(Boolean)));
}

function extractRecurringGaps(resultText, input) {
  const gaps = [];
  const text = String(resultText || '');
  const foundationSection = text.match(/##\s*4?\.?\s*Missing Foundations([\s\S]*?)(?:\n##\s|$)/i)?.[1] || '';

  for (const line of foundationSection.split('\n')) {
    const match = line.match(/^[-*\d. )]+(.+)$/);
    const value = (match?.[1] || '').trim();
    if (value && value.length < 120) gaps.push(value);
  }

  for (const candidate of [input.mainBlocker, input.confusionLocation]) {
    if (candidate) gaps.push(String(candidate).trim());
  }

  return mergeUnique(gaps).slice(0, 6);
}
