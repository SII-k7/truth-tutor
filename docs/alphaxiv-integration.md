# alphaXiv Integration Guide

## What this integration is

This is a workflow-level integration, not a fragile browser hack.

The idea is simple:

1. the user reads a paper on alphaXiv,
2. asks alphaXiv a question,
3. still feels confused,
4. passes the question, answer, and remaining confusion into Truth Tutor,
5. Truth Tutor diagnoses the real gap and writes better next questions.

That fits real paper-reading behavior much better than pretending we need a full official API on day one.

## Why this is the right v0.1.1 move

Most paper-reading frustration does not come from "I have no explanation." It comes from:

- the explanation being one abstraction level too high,
- the reader asking the wrong question,
- the reader entering the wrong section too early,
- or the reader missing prerequisites that no local explanation can patch.

Truth Tutor should diagnose those failure modes directly.

## Recommended user flow

### Flow A: Fast recovery

- Read paper on alphaXiv
- Ask a question
- Copy:
  - the paper title
  - your question
  - alphaXiv's answer
  - why you still feel stuck
- Run `alphaxiv-prompt` or `alphaxiv-ask`

### Flow B: Deep repair

- Use `alphaxiv` mode once to figure out the real blocker
- If the blocker is structural, switch to `paper-reading` mode
- Get a section-by-section reread order and prerequisite ladder

## Minimal JSON shape

```json
{
  "mode": "alphaxiv",
  "source": "alphaxiv",
  "paperTitle": "Attention Is All You Need",
  "paperStage": "method",
  "userQuestion": "Why is multi-head attention better than one large head?",
  "aiAnswer": "Each head attends to different representation subspaces.",
  "userReaction": "I can repeat that sentence, but I still do not feel the mechanism.",
  "currentUnderstanding": "I know QKV and softmax.",
  "strictness": "direct"
}
```

## What Truth Tutor should output in this mode

- why alphaXiv's answer did not land
- whether the user asked too vague a question
- whether the user lacks prerequisite footing
- 2-3 better next questions to ask
- the shortest recovery plan

## Future directions

- browser helper / extension bridge for one-click export into Truth Tutor
- structured import from copied alphaXiv conversation blocks
- paper-session memory across multiple questions
