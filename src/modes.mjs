/**
 * Truth Tutor operating modes
 * @readonly
 * @enum {string}
 */
export const MODES = {
  GENERAL: 'general',
  PAPER_READING: 'paper-reading',
  ALPHAXIV: 'alphaxiv',
};

const ALIASES = {
  default: MODES.GENERAL,
  study: MODES.GENERAL,
  diagnosis: MODES.GENERAL,
  paper: MODES.PAPER_READING,
  'paper-reading': MODES.PAPER_READING,
  paper_reading: MODES.PAPER_READING,
  paperreading: MODES.PAPER_READING,
  research: MODES.PAPER_READING,
  alphaxiv: MODES.ALPHAXIV,
  alphaarxiv: MODES.ALPHAXIV,
  'alpha-arxiv': MODES.ALPHAXIV,
  'alpha-xiv': MODES.ALPHAXIV,
};

/**
 * Normalize the operating mode from various input formats
 * @param {string|undefined} inputMode - The mode input from user
 * @param {string|undefined} source - The source input (e.g., 'alphaxiv')
 * @returns {string} The normalized mode value
 */
export function normalizeMode(inputMode, source) {
  const sourceKey = source ? String(source).trim().toLowerCase() : '';
  const modeKey = inputMode ? String(inputMode).trim().toLowerCase() : '';

  if (sourceKey && ALIASES[sourceKey]) {
    return ALIASES[sourceKey];
  }

  if (modeKey && ALIASES[modeKey]) {
    return ALIASES[modeKey];
  }

  return MODES.GENERAL;
}
