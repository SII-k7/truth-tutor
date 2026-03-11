import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStrictness } from '../src/strictness.mjs';

test('normalizeStrictness accepts named presets', () => {
  assert.equal(normalizeStrictness('strict').id, 'strict');
  assert.equal(normalizeStrictness('brutal').id, 'brutal');
});

test('normalizeStrictness maps numbers into bands', () => {
  assert.equal(normalizeStrictness('2').id, 'soft');
  assert.equal(normalizeStrictness('5').id, 'direct');
  assert.equal(normalizeStrictness('8').id, 'strict');
  assert.equal(normalizeStrictness('10').id, 'brutal');
});

test('normalizeStrictness falls back to direct', () => {
  assert.equal(normalizeStrictness('whatever').id, 'direct');
});
