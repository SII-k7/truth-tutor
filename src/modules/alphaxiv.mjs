import { buildCommonSystemPrompt, bullet, cleanLines } from './shared.mjs';

export const ALPHAXIV_OUTPUT_TEMPLATE = `# alphaXiv Recovery Report

## 1. Reality Check
State bluntly why the learner still does not understand the paper even after asking alphaXiv.

## 2. What alphaXiv Already Gave You
Summarize what the prior explanation already covered.

## 3. Why It Still Did Not Land
Identify whether the failure is weak prerequisites, a vague question, a bad reading stage, or an explanation-user mismatch.

## 4. Missing Foundations
List the exact prerequisites or intuitions that are still missing.

## 5. Better Next Question for alphaXiv
Write 2-3 sharper follow-up questions the learner should ask next.

## 6. Recovery Plan
Give an immediate next move, a short repair sequence, and a next-stage paper reading plan.

## 7. Verification Drills
Give 3-5 drills or checks that prove the learner actually gets it now.
`;

export function buildAlphaXivPrompt({ input, strictness, language }) {
  const systemPrompt = buildCommonSystemPrompt({
    strictness,
    language,
    role: 'Truth Tutor alphaXiv, a diagnosis-first coach for readers who already asked alphaXiv but are still stuck',
    extraRules: [
      'This is alphaXiv integration mode.',
      'Assume the learner already asked an AI paper-reading tool for help and still did not get it.',
      'Do not just rewrite the same explanation. Diagnose why the explanation did not land.',
      'Be explicit about whether the problem is in the learner\'s foundations, the question they asked, the section they are reading, or the abstraction level of the answer.',
      'Write better follow-up questions the learner can ask next.',
      'If paper evidence is supplied below, use it directly. Do not say you cannot access the paper.',
      'Write for scanability: short sections, bullets, and compact paragraphs.',
      'If Paper Evidence is supplied below, reason from it directly.',
      'Do not say you cannot access the paper or PDF when Paper Evidence is already provided.',
      'Make the answer highly scannable in markdown. Keep each section tight and readable.',
    ],
    outputTemplate: ALPHAXIV_OUTPUT_TEMPLATE,
  });

  const userPrompt = cleanLines([
    '# Paper Context',
    bullet('Topic', input.topic || input.paperTitle),
    bullet('Paper title', input.paperTitle || input.materialTitle),
    bullet('Paper ID', input.paperId),
    bullet('Paper URL', input.paperUrl),
    bullet('Reading stage', input.paperStage),
    bullet('Confusion location', input.confusionLocation),
    '',
    input.paperSummary || input.paperExtract
      ? '# Paper Evidence'
      : null,
    input.paperEvidenceSource ? bullet('Evidence source', input.paperEvidenceSource) : null,
    input.paperSummary ? `Paper summary:\n${input.paperSummary}` : null,
    input.paperExtract ? `\nExtracted paper text:\n${input.paperExtract}` : null,
    '',
    '# alphaXiv Session',
    input.userQuestion ? `Question asked to alphaXiv:\n${input.userQuestion}` : null,
    input.aiAnswer ? `\nalphaXiv answer:\n${input.aiAnswer}` : null,
    input.userReaction ? `\nWhy the learner is still stuck:\n${input.userReaction}` : null,
    '',
    '# Supplied Paper Evidence',
    bullet('Context source', input.paperContextSource),
    input.paperSummary ? `Paper abstract / metadata summary:\n${input.paperSummary}` : null,
    input.paperExtract ? `\nAuto-extracted paper text:\n${input.paperExtract}` : null,
    '',
    '# Learner Footing',
    bullet('Self-reported level', input.studyLevel),
    bullet('Goal', input.goals),
    input.currentUnderstanding ? `Current understanding:\n${input.currentUnderstanding}` : null,
    input.extraContext ? `\nExtra context:\n${input.extraContext}` : null,
    '',
    '# Instruction',
    'Diagnose why the learner is still stuck after using alphaXiv. Do not just explain again. Identify the missing foundations, what question should have been asked instead, and what the shortest recovery path is.',
  ]);

  return {
    mode: 'alphaxiv',
    strictness,
    outputTemplate: ALPHAXIV_OUTPUT_TEMPLATE,
    systemPrompt,
    userPrompt,
  };
}
