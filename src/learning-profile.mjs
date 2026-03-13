import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));
const PROFILE_DIR = join(DATA_DIR, 'profiles');

export async function loadLearningProfile(profileKey = 'default') {
  const safeKey = sanitizeKey(profileKey);
  const path = profilePath(safeKey);

  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      profileKey: safeKey,
      recurringGaps: Array.isArray(parsed.recurringGaps) ? parsed.recurringGaps.slice(0, 8) : [],
      gapFrequency: parsed.gapFrequency || {},
      recentTopics: Array.isArray(parsed.recentTopics) ? parsed.recentTopics.slice(0, 8) : [],
      sessions: Number(parsed.sessions || 0),
      updatedAt: parsed.updatedAt || null,
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return { profileKey: safeKey, recurringGaps: [], gapFrequency: {}, recentTopics: [], sessions: 0, updatedAt: null };
  }
}

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

  await mkdir(dirname(profilePath(current.profileKey)), { recursive: true });
  await writeFile(profilePath(current.profileKey), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export function summarizeLearningProfile(profile) {
  if (!profile || (!profile.recurringGaps?.length && !profile.recentTopics?.length)) {
    return '';
  }

  const lines = [];
  if (profile.recurringGaps?.length) {
    // Sort by frequency and show top 3
    const sorted = profile.recurringGaps
      .map(gap => ({ gap, count: profile.gapFrequency?.[gap] || 1 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    lines.push(`Top recurring gaps: ${sorted.map(x => `${x.gap} (×${x.count})`).join('; ')}`);
  }
  if (profile.recentTopics?.length) {
    lines.push(`Recent topics/papers: ${profile.recentTopics.join('; ')}`);
  }
  if (profile.sessions) {
    lines.push(`Prior sessions stored: ${profile.sessions}`);
  }
  return lines.join('\n');
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
