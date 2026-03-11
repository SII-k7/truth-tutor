import { buildCommonSystemPrompt, bullet, cleanLines } from './shared.mjs';

export const PAPER_READING_OUTPUT_TEMPLATE = `# Paper Reading Truth Report

## 1. Reality Check
State bluntly why this reader is not actually through the paper yet.

## 2. Paper in Plain Terms
Explain what problem the paper is solving, what it proposes, and what evidence it uses.

## 3. Why You Are Stuck Here
Identify the exact bottleneck: notation, math, objective, architecture intuition, experiments, or reading method.

## 4. Missing Foundations
List the prerequisite topics that are missing or weak, in priority order.

## 5. Section-by-Section Reread Order
Tell the reader what to reread first, what to skip for now, and what question to answer in each section.

## 6. Paper Recovery Plan
Give an immediate next move, a short repair sequence, and a next-stage reading plan.

## 7. Verification Drills
Give 3-5 drills that prove the reader now understands the paper instead of merely recognizing it.
`;

export function buildPaperReadingPrompt({ input, strictness, language }) {
  const systemPrompt = buildCommonSystemPrompt({
    strictness,
    language,
    role: 'Truth Tutor Paper Reading, a diagnosis-first paper reading coach for graduate students, researchers, and advanced learners',
    extraRules: [
      'This is paper-reading mode. Do not default to generic teaching.',
      'First identify whether the blocker is problem framing, notation, architecture intuition, math, objective, experiments, or a broken reading workflow.',
      'Tell the learner if they are reading above their current footing.',
      'Recommend the shortest prerequisite ladder that makes this paper readable.',
      'Prefer a section-by-section reread order over a long lecture.',
    ],
    outputTemplate: PAPER_READING_OUTPUT_TEMPLATE,
  });

  const userPrompt = cleanLines([
    '# Paper Context',
    bullet('Topic', input.topic || input.paperTitle),
    bullet('Paper title', input.paperTitle || input.materialTitle),
    bullet('Paper ID', input.paperId),
    bullet('Paper URL', input.paperUrl),
    bullet('Paper domain', input.paperDomain),
    bullet('Reading stage', input.paperStage),
    bullet('Confusion location', input.confusionLocation),
    bullet('Main blocker', input.mainBlocker),
    '',
    '# Learner Footing',
    bullet('Self-reported level', input.studyLevel),
    bullet('Available study hours per week', input.weeklyHours),
    bullet('Goal', input.goals),
    input.currentUnderstanding ? `Current understanding:\n${input.currentUnderstanding}` : null,
    '',
    '# What the learner says',
    input.confusion ? `Confusion:\n${input.confusion}` : null,
    input.extraContext ? `\nExtra context:\n${input.extraContext}` : null,
    '',
    '# Instruction',
    'Do not merely explain the paper more simply. Diagnose why this learner is stuck on this paper, identify the missing foundations, give a section-by-section reread order, and prescribe the shortest repair plan that would make the paper readable.',
  ]);

  return {
    mode: 'paper-reading',
    strictness,
    outputTemplate: PAPER_READING_OUTPUT_TEMPLATE,
    systemPrompt,
    userPrompt,
  };
}
