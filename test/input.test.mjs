import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInput } from '../src/input.mjs';

test('validateInput requires topic', () => {
  assert.throws(() => validateInput({ confusion: 'x' }), /Missing required field: topic/);
});

test('validateInput requires at least one diagnostic field', () => {
  assert.throws(() => validateInput({ topic: 'Attention' }), /Provide at least one of/);
});

test('validateInput accepts a minimal valid payload', () => {
  const result = validateInput({ topic: 'Attention', confusion: 'I do not get it.' });
  assert.equal(result.topic, 'Attention');
});
