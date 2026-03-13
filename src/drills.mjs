export function buildDrillGuidance({ mode, strictness, hasPaperEvidence }) {
  const templates = [
    'Derivation check: ask the learner to derive one intermediate step, not the whole proof.',
    'Mechanism check: ask the learner to explain why one component changes the outcome versus a baseline.',
    'Evidence check: ask the learner to point to one paragraph / section / figure that supports a claim.',
    'Ablation check: ask what result should worsen if one module is removed, and why.',
    'Transfer check: ask the learner to apply the same idea to a nearby example or toy case.',
  ];

  if (mode === 'general') {
    templates.unshift('Foundation check: ask for a 2-sentence explanation of the core prerequisite in plain language.');
  }

  if (mode === 'paper-reading' || mode === 'alphaxiv') {
    templates.unshift('Section check: ask the learner to reread one target section and answer one narrow question from it.');
  }

  return [
    `Strictness implementation hint: ${strictness.drillStyle}`,
    'For every drill, use this exact mini-structure:',
    '- Drill type',
    '- Task',
    '- Pass check',
    '- Why this closes the gap',
    hasPaperEvidence ? '- Evidence anchor: cite [Sx-Py] or [Py] when relevant' : null,
    'Use 3-5 drills total. Keep them short, concrete, and checkable.',
    'Preferred drill patterns:',
    ...templates.map((item) => `- ${item}`),
  ].filter(Boolean).join('\n');
}
