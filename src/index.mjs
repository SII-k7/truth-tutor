/**
 * Truth Tutor - Diagnosis-first learning coach
 * @module truth-tutor/index
 * @description Main entry point for the Truth Tutor library
 */

export { buildPrompt } from './build-prompt.mjs';
export { normalizeStrictness, STRICTNESS_PRESETS } from './strictness.mjs';
export { normalizeMode, MODES } from './modes.mjs';
export { askOpenAICompatible } from './openai-compatible.mjs';
export { askAnthropicCompatible } from './anthropic-compatible.mjs';
export { askModel } from './model-client.mjs';
export { startWebServer } from './web-server.mjs';

/**
 * Truth Tutor version
 * @type {string}
 */
export const VERSION = '1.0.4';
