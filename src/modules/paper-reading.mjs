import { buildCommonSystemPrompt, bullet, cleanLines } from './shared.mjs';

export const PAPER_READING_OUTPUT_TEMPLATE = `# Paper Reading Truth Report

## 1. Reality Check
State bluntly why this reader is not actually through the paper yet. [Cite evidence: Section / [Sx-Py]]

## 2. Paper in Plain Terms
Explain what problem the paper is solving, what it proposes, and what evidence it uses.

## 3. Why You Are Stuck Here
Identify the exact bottleneck: notation, math, objective, architecture intuition, experiments, or reading method. [Evidence: Cite specific paragraph(s) like [S3.2-P12], [S4-P5] that reveal this bottleneck]

## 4. Missing Foundations
List the prerequisite topics that are missing or weak, in priority order. [For each gap, cite any paper paragraph that assumes this knowledge using [Sx-Py] format]

## 5. Section-by-Section Reread Order
Tell the reader what to reread first, what to skip for now, and what question to answer in each section. [Reference target sections by name, e.g., "Section 3.1"]

## 6. Paper Recovery Plan
Give an immediate next move, a short repair sequence, and a next-stage reading plan.

## 7. Verification Drills
Give 3-5 specific, checkable drills that prove the reader now understands the paper instead of merely recognizing it.
- Each drill should have: (1) Task description, (2) Pass/fail criteria, (3) Evidence anchor (cite [Sx-Py] when relevant)
- Example: "Explain in 2 sentences why [S3.2-P8]'s method outperforms the baseline. Pass: specific mechanism mentioned. Fail: vague slogan."

## Evidence Citation Rule (MANDATORY)
Every diagnosis claim that relates to the paper content MUST cite specific paragraph evidence in [Sx-Py] format (Section number + Paragraph number).
- "Why You Are Stuck Here" → MUST cite [Sx-Py]
- "Missing Foundations" → MUST cite which paragraphs assume the prerequisite
- "Verification Drills" → SHOULD cite [Sx-Py] when the drill targets specific paper content
- The system will auto-fill Section title and Quote text from the paper - you MUST provide the correct [Sx-Py] tag.
- If no paragraph evidence exists for a claim, state "No direct paragraph evidence for this claim" instead of citing.
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
      'If paper evidence is supplied below, use it directly. Do not say you cannot access the paper.',
      'Write for scanability: short sections, bullets, and compact paragraphs.',
      'If Paper Evidence is supplied below, reason from it directly.',
      'Do not say you cannot access the paper or PDF when Paper Evidence is already provided.',
      'Make the answer highly scannable in markdown. Keep each section tight and readable.',
      // NEW: Evidence citation rules
      'When citing evidence from the paper, use the paragraph tags like [P3], [P12], etc.',
      'Every diagnosis claim should reference specific paragraph evidence when available.',
      'For "Why You Are Stuck Here", cite which paragraph(s) reveal the bottleneck.',
      'For "Missing Foundations", cite any paragraph that assumes the prerequisite knowledge.',
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
    input.paperSummary || input.paperExtract
      ? '# Paper Evidence'
      : null,
    input.paperEvidenceSource ? bullet('Evidence source', input.paperEvidenceSource) : null,
    input.paperSummary ? `Paper summary:\n${input.paperSummary}` : null,
    input.paperExtract ? `\nExtracted paper text:\n${input.paperExtract}` : null,
    '',
    '# Learner Footing',
    bullet('Self-reported level', input.studyLevel),
    bullet('Available study hours per week', input.weeklyHours),
    bullet('Goal', input.goals),
    input.currentUnderstanding ? `Current understanding:\n${input.currentUnderstanding}` : null,
    '',
    '# Supplied Paper Evidence',
    bullet('Context source', input.paperContextSource),
    input.paperSummary ? `Paper abstract / metadata summary:\n${input.paperSummary}` : null,
    input.paperExtract ? `\nAuto-extracted paper text:\n${input.paperExtract}` : null,
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
