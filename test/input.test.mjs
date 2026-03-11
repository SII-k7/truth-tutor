import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInput } from '../src/input.mjs';

test('validateInput requires topic or paper title', () => {
  assert.throws(() => validateInput({ confusion: 'x' }), /Missing required field: topic/);
});

test('validateInput requires at least one diagnostic field', () => {
  assert.throws(() => validateInput({ topic: 'Attention' }), /Provide at least one of/);
});

test('validateInput accepts a minimal valid payload', () => {
  const result = validateInput({ topic: 'Attention', confusion: 'I do not get it.' });
  assert.equal(result.topic, 'Attention');
});

test('validateInput accepts paper-reading payloads without topic when paper title is present', () => {
  const result = validateInput({
    mode: 'paper-reading',
    paperTitle: 'Attention Is All You Need',
    confusion: 'I do not understand the method section.',
  });
  assert.equal(result.paperTitle, 'Attention Is All You Need');
});

test('validateInput requires alphaXiv session evidence in alphaXiv mode', () => {
  assert.throws(
    () =>
      validateInput({
        mode: 'alphaxiv',
        paperTitle: 'Attention Is All You Need',
        confusion: 'Still stuck.',
      }),
    /AlphaXiv mode requires userQuestion or aiAnswer/,
  );
});
