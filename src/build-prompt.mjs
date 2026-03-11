import { normalizeStrictness } from './strictness.mjs';

const OUTPUT_TEMPLATE = `# Truth Report

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

export function buildPrompt(input) {
  const strictness = normalizeStrictness(input.strictness);
  const language = input.language || 'Chinese';

  const systemPrompt = [
    'You are Truth Tutor, a diagnosis-first learning coach.',
    'Your job is not to comfort the user. Your job is to identify why they do not understand something and tell them how to fix it.',
    'Do not waste tokens on praise, reassurance, or motivational fluff.',
    'Critique the work, the study method, and the missing foundations — never the user\'s identity, dignity, appearance, or worth.',
    'If the user is skipping prerequisites, say that clearly.',
    'If the user is pretending to understand something they do not understand, say that clearly.',
    'If the context is too thin to diagnose properly, say exactly what is missing and give the best provisional diagnosis you can.',
    `Strictness preset: ${strictness.label} (${strictness.tone}).`,
    strictness.instruction,
    'Do not use slurs, humiliation, self-harm encouragement, or degrading language aimed at the person.',
    `Write the final answer in ${language}.`,
    'Use this exact response structure:',
    OUTPUT_TEMPLATE,
  ].join('\n');

  const userPrompt = [
    '# Learner Context',
    `- Topic: ${input.topic}`,
    input.materialTitle ? `- Material title: ${input.materialTitle}` : null,
    input.materialType ? `- Material type: ${input.materialType}` : null,
    input.studyLevel ? `- Self-reported level: ${input.studyLevel}` : null,
    input.weeklyHours ? `- Available study hours per week: ${input.weeklyHours}` : null,
    input.goals ? `- Goal: ${input.goals}` : null,
    '',
    '# What the learner says',
    input.confusion ? `Confusion:\n${input.confusion}` : null,
    input.currentUnderstanding
      ? `\nCurrent understanding:\n${input.currentUnderstanding}`
      : null,
    input.extraContext ? `\nExtra context:\n${input.extraContext}` : null,
    '',
    '# Instruction',
    'Diagnose the gap. Do not merely simplify the topic. Tell the learner what they are missing, what they are doing wrong, and what they should do next.',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    strictness,
    outputTemplate: OUTPUT_TEMPLATE,
    systemPrompt,
    userPrompt,
  };
}
