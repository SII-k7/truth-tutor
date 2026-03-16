import { readFile } from 'node:fs/promises';
import { normalizeMode } from './modes.mjs';

const VALID_MODES = ['general', 'paper-reading', 'alphaxiv'];
const VALID_STRICTNESS = ['soft', 'direct', 'strict', 'brutal'];
const MAX_FIELD_LENGTH = 10000;
const MAX_TOPIC_LENGTH = 500;

export async function loadInput({ inputPath, flags }) {
  let fileInput = {};

  if (inputPath) {
    try {
      const raw = await readFile(inputPath, 'utf8');
      fileInput = JSON.parse(raw);
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(`Invalid JSON in input file: ${err.message}`);
      }
      throw new Error(`Failed to read input file: ${err.message}`);
    }
  }

  const input = compactObject({
    mode: flags.mode ?? fileInput.mode,
    source: flags.source ?? fileInput.source,
    topic: flags.topic ?? fileInput.topic,
    materialTitle: flags['material-title'] ?? fileInput.materialTitle,
    materialType: flags['material-type'] ?? fileInput.materialType,
    paperTitle: flags['paper-title'] ?? fileInput.paperTitle,
    paperId: flags['paper-id'] ?? fileInput.paperId,
    paperUrl: flags['paper-url'] ?? fileInput.paperUrl,
    paperDomain: flags['paper-domain'] ?? fileInput.paperDomain,
    paperStage: flags['paper-stage'] ?? fileInput.paperStage,
    confusionLocation: flags['confusion-location'] ?? fileInput.confusionLocation,
    mainBlocker: flags['main-blocker'] ?? fileInput.mainBlocker,
    confusion: flags.confusion ?? fileInput.confusion,
    currentUnderstanding: flags.understanding ?? fileInput.currentUnderstanding,
    goals: flags.goals ?? fileInput.goals,
    studyLevel: flags['study-level'] ?? fileInput.studyLevel,
    weeklyHours: flags['weekly-hours'] ?? fileInput.weeklyHours,
    strictness: flags.strictness ?? fileInput.strictness,
    language: flags.language ?? fileInput.language,
    extraContext: flags['extra-context'] ?? fileInput.extraContext,
    userQuestion: flags['user-question'] ?? fileInput.userQuestion,
    aiAnswer: flags['ai-answer'] ?? fileInput.aiAnswer,
    userReaction: flags['user-reaction'] ?? fileInput.userReaction,
  });

  input.mode = normalizeMode(input.mode, input.source);
  return input;
}

export function validateInput(input) {
  // Validate required fields
  const hasTopicInfo = Boolean(input.topic || input.paperTitle || input.materialTitle);
  if (!hasTopicInfo) {
    throw new Error('Missing required field: topic (or paperTitle/materialTitle)');
  }

  // Validate diagnostic signal
  const hasDiagnosticSignal = Boolean(
    input.confusion ||
      input.currentUnderstanding ||
      input.extraContext ||
      input.userQuestion ||
      input.aiAnswer ||
      input.userReaction,
  );

  if (!hasDiagnosticSignal) {
    throw new Error(
      'Provide at least one of: confusion, currentUnderstanding, extraContext, userQuestion, aiAnswer, userReaction'
    );
  }

  // Validate mode-specific requirements
  if (input.mode === 'alphaxiv' && !input.userQuestion && !input.aiAnswer) {
    throw new Error('AlphaXiv mode requires userQuestion or aiAnswer.');
  }

  // Validate field lengths
  validateFieldLengths(input);

  // Validate enum fields
  if (input.mode && !VALID_MODES.includes(input.mode)) {
    throw new Error(
      `Invalid mode: "${input.mode}". Must be one of: ${VALID_MODES.join(', ')}`
    );
  }

  if (input.strictness && !VALID_STRICTNESS.includes(input.strictness)) {
    throw new Error(
      `Invalid strictness: "${input.strictness}". Must be one of: ${VALID_STRICTNESS.join(', ')}`
    );
  }

  // Validate numeric fields
  if (input.weeklyHours !== undefined) {
    const hours = Number(input.weeklyHours);
    if (isNaN(hours) || hours < 0 || hours > 168) {
      throw new Error(
        `Invalid weeklyHours: "${input.weeklyHours}". Must be a number between 0 and 168`
      );
    }
  }

  return input;
}

function validateFieldLengths(input) {
  const longFields = ['confusion', 'currentUnderstanding', 'extraContext', 'userQuestion', 'aiAnswer'];
  const shortFields = ['topic', 'paperTitle', 'materialTitle'];

  for (const field of longFields) {
    if (input[field] && input[field].length > MAX_FIELD_LENGTH) {
      throw new Error(
        `Field "${field}" exceeds maximum length of ${MAX_FIELD_LENGTH} characters. ` +
        `Current length: ${input[field].length}`
      );
    }
  }

  for (const field of shortFields) {
    if (input[field] && input[field].length > MAX_TOPIC_LENGTH) {
      throw new Error(
        `Field "${field}" exceeds maximum length of ${MAX_TOPIC_LENGTH} characters. ` +
        `Current length: ${input[field].length}`
      );
    }
  }
}

function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== ''),
  );
}
