import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt } from '../src/build-prompt.mjs';

test('buildPrompt includes required structure and learner context in general mode', () => {
  const result = buildPrompt({
    topic: 'Transformers',
    confusion: 'I can repeat QKV but do not understand why attention works.',
    currentUnderstanding: 'I know matrix multiplication.',
    strictness: 'strict',
    language: 'Chinese',
  });

  assert.equal(result.mode, 'general');
  assert.match(result.systemPrompt, /Truth Tutor/);
  assert.match(result.systemPrompt, /Reality Check/);
  assert.match(result.userPrompt, /Topic: Transformers/);
  assert.match(result.userPrompt, /Diagnose the gap/);
  assert.equal(result.strictness.id, 'strict');
});

test('buildPrompt uses the paper-reading module when mode is paper-reading', () => {
  const result = buildPrompt({
    mode: 'paper-reading',
    paperTitle: 'Attention Is All You Need',
    topic: 'Transformer attention',
    paperStage: 'method',
    confusionLocation: 'multi-head attention',
    confusion: 'I still do not get why multi-head attention helps.',
    currentUnderstanding: 'I know QKV.',
    strictness: 'direct',
    language: 'Chinese',
  });

  assert.equal(result.mode, 'paper-reading');
  assert.match(result.outputTemplate, /Section-by-Section Reread Order/);
  assert.match(result.userPrompt, /Paper title: Attention Is All You Need/);
  assert.match(result.userPrompt, /Reading stage: method/);
  assert.match(result.systemPrompt, /paper reading coach/i);
});

test('buildPrompt uses the alphaXiv module when mode/source points to alphaXiv', () => {
  const result = buildPrompt({
    mode: 'alphaxiv',
    source: 'alphaarxiv',
    paperTitle: 'Attention Is All You Need',
    userQuestion: 'Why does multi-head attention help?',
    aiAnswer: 'It attends to different subspaces.',
    userReaction: 'That still feels vague.',
    strictness: 'direct',
    language: 'Chinese',
  });

  assert.equal(result.mode, 'alphaxiv');
  assert.match(result.outputTemplate, /Better Next Question for alphaXiv/);
  assert.match(result.userPrompt, /alphaXiv answer/);
  assert.match(result.systemPrompt, /alphaXiv integration mode/i);
});
