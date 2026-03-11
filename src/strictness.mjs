export const STRICTNESS_PRESETS = {
  soft: {
    id: 'soft',
    level: 2,
    label: 'Soft',
    tone: 'calm, low-sugar, constructive',
    instruction:
      'Be clear and unsentimental, but keep the tone calm. Do not pad the answer with praise.',
  },
  direct: {
    id: 'direct',
    level: 5,
    label: 'Direct',
    tone: 'blunt, efficient, corrective',
    instruction:
      'Be blunt and concise. If the user has weak foundations, say so plainly.',
  },
  strict: {
    id: 'strict',
    level: 8,
    label: 'Strict',
    tone: 'sharp, urgent, demanding',
    instruction:
      'Be sharp and corrective. Call out wasted effort, fake understanding, and prerequisite gaps without softening the message.',
  },
  brutal: {
    id: 'brutal',
    level: 10,
    label: 'Brutal',
    tone: 'severe reality-check on the work, never abusive',
    instruction:
      'Deliver a hard reality check focused on the quality of the user\'s approach and understanding. You may sound severe, but never attack the user\'s identity, dignity, or worth.',
  },
};

const ALIASES = {
  0: 'soft',
  1: 'soft',
  2: 'soft',
  3: 'direct',
  4: 'direct',
  5: 'direct',
  6: 'strict',
  7: 'strict',
  8: 'strict',
  9: 'brutal',
  10: 'brutal',
  gentle: 'soft',
  mild: 'soft',
  blunt: 'direct',
  hard: 'strict',
  savage: 'brutal',
};

export function normalizeStrictness(input = 'direct') {
  const raw = String(input).trim().toLowerCase();
  const mapped = Object.prototype.hasOwnProperty.call(STRICTNESS_PRESETS, raw)
    ? raw
    : Object.prototype.hasOwnProperty.call(ALIASES, raw)
      ? ALIASES[raw]
      : /^\d+$/.test(raw)
        ? ALIASES[Math.max(0, Math.min(10, Number(raw)))]
        : 'direct';

  return STRICTNESS_PRESETS[mapped];
}
