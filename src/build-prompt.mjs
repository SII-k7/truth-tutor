import { normalizeStrictness } from './strictness.mjs';
import { MODES, normalizeMode } from './modes.mjs';
import { buildGeneralPrompt } from './modules/general.mjs';
import { buildPaperReadingPrompt } from './modules/paper-reading.mjs';
import { buildAlphaXivPrompt } from './modules/alphaxiv.mjs';

export function buildPrompt(input) {
  const strictness = normalizeStrictness(input.strictness);
  const language = input.language || 'Chinese';
  const mode = normalizeMode(input.mode, input.source);

  const ctx = { input, strictness, language };

  if (mode === MODES.PAPER_READING) {
    return buildPaperReadingPrompt(ctx);
  }

  if (mode === MODES.ALPHAXIV) {
    return buildAlphaXivPrompt(ctx);
  }

  return buildGeneralPrompt(ctx);
}
