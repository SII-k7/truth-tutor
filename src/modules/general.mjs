import { buildCommonSystemPrompt, bullet, cleanLines } from './shared.mjs';

export const GENERAL_OUTPUT_TEMPLATE = `# Truth Report

## 1. Reality Check
State bluntly what is going wrong.

## 2. Root Cause
Explain why the user is stuck.

## 3. Missing Foundations
List the prerequisite topics, intuitions, or habits that are weak or absent.

## 4. Stop Doing
List the behaviors that are wasting time.

## 5. Recovery Plan
Give a prioritized plan with immediate, short-term, and next-stage actions.

## 6. Practice Drills
Give 3-5 drills or exercises that directly fix the gap.

## 7. Win Condition
Describe how the user can verify that the gap is actually closed.
`;

export function buildGeneralPrompt({ input, strictness, language }) {
  const systemPrompt = buildCommonSystemPrompt({
    strictness,
    language,
    role: 'Truth Tutor, a diagnosis-first learning coach',
    extraRules: [
      'Do not merely simplify the topic. Diagnose the gap, then prescribe the repair plan.',
      'If paper evidence is supplied below, use it directly. Do not say you cannot access the paper.',
      'Write for scanability: short sections, bullets, and compact paragraphs.',
    ],
    outputTemplate: GENERAL_OUTPUT_TEMPLATE,
  });

  const userPrompt = cleanLines([
    '# Learner Context',
    bullet('Topic', input.topic),
    bullet('Material title', input.materialTitle),
    bullet('Material type', input.materialType),
    bullet('Self-reported level', input.studyLevel),
    bullet('Available study hours per week', input.weeklyHours),
    bullet('Goal', input.goals),
    '',
    '# Supplied Paper Evidence',
    bullet('Context source', input.paperContextSource),
    input.paperSummary ? `Paper abstract / metadata summary:\n${input.paperSummary}` : null,
    input.paperExtract ? `\nAuto-extracted paper text:\n${input.paperExtract}` : null,
    '',
    '# What the learner says',
    input.confusion ? `Confusion:\n${input.confusion}` : null,
    input.currentUnderstanding ? `\nCurrent understanding:\n${input.currentUnderstanding}` : null,
    input.extraContext ? `\nExtra context:\n${input.extraContext}` : null,
    '',
    '# Instruction',
    'Diagnose the gap. Do not merely simplify the topic. Tell the learner what they are missing, what they are doing wrong, and what they should do next.',
  ]);

  return {
    mode: 'general',
    strictness,
    outputTemplate: GENERAL_OUTPUT_TEMPLATE,
    systemPrompt,
    userPrompt,
  };
}
