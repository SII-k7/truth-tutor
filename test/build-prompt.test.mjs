import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt } from '../src/build-prompt.mjs';

test('buildPrompt includes required structure and learner context', () => {
  const result = buildPrompt({
    topic: 'Transformers',
    confusion: 'I can repeat QKV but do not understand why attention works.',
    currentUnderstanding: 'I know matrix multiplication.',
    strictness: 'strict',
    language: 'Chinese',
  });

  assert.match(result.systemPrompt, /Truth Tutor/);
  assert.match(result.systemPrompt, /Reality Check/);
  assert.match(result.userPrompt, /Topic: Transformers/);
  assert.match(result.userPrompt, /Diagnose the gap/);
  assert.equal(result.strictness.id, 'strict');
});
