import { readFile } from 'node:fs/promises';
import { normalizeMode } from './modes.mjs';

export async function loadInput({ inputPath, flags }) {
  let fileInput = {};

  if (inputPath) {
    const raw = await readFile(inputPath, 'utf8');
    fileInput = JSON.parse(raw);
  }

  const input = compactObject({
    ...fileInput,
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
  if (!input.topic && !input.paperTitle && !input.materialTitle) {
    throw new Error('Missing required field: topic (or paperTitle/materialTitle)');
  }

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
      'Provide at least one of: confusion, currentUnderstanding, extraContext, userQuestion, aiAnswer, userReaction',
    );
  }

  if (input.mode === 'alphaxiv' && !input.userQuestion && !input.aiAnswer) {
    throw new Error('AlphaXiv mode requires userQuestion or aiAnswer.');
  }

  return input;
}

function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== ''),
  );
}
