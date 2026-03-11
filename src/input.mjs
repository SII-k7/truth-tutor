import { readFile } from 'node:fs/promises';

export async function loadInput({ inputPath, flags }) {
  let fileInput = {};

  if (inputPath) {
    const raw = await readFile(inputPath, 'utf8');
    fileInput = JSON.parse(raw);
  }

  return compactObject({
    ...fileInput,
    topic: flags.topic ?? fileInput.topic,
    materialTitle: flags['material-title'] ?? fileInput.materialTitle,
    materialType: flags['material-type'] ?? fileInput.materialType,
    confusion: flags.confusion ?? fileInput.confusion,
    currentUnderstanding: flags.understanding ?? fileInput.currentUnderstanding,
    goals: flags.goals ?? fileInput.goals,
    studyLevel: flags['study-level'] ?? fileInput.studyLevel,
    weeklyHours: flags['weekly-hours'] ?? fileInput.weeklyHours,
    strictness: flags.strictness ?? fileInput.strictness,
    language: flags.language ?? fileInput.language,
    extraContext: flags['extra-context'] ?? fileInput.extraContext,
  });
}

export function validateInput(input) {
  if (!input.topic) {
    throw new Error('Missing required field: topic');
  }

  if (!input.confusion && !input.currentUnderstanding && !input.extraContext) {
    throw new Error(
      'Provide at least one of: confusion, currentUnderstanding, extraContext',
    );
  }

  return input;
}

function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== ''),
  );
}
