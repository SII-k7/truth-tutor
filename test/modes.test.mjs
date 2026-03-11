import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMode } from '../src/modes.mjs';

test('normalizeMode supports paper-reading aliases', () => {
  assert.equal(normalizeMode('paper', undefined), 'paper-reading');
  assert.equal(normalizeMode('paper_reading', undefined), 'paper-reading');
});

test('normalizeMode supports alphaXiv aliases', () => {
  assert.equal(normalizeMode('alphaarxiv', undefined), 'alphaxiv');
  assert.equal(normalizeMode(undefined, 'alphaxiv'), 'alphaxiv');
});

test('normalizeMode falls back to general', () => {
  assert.equal(normalizeMode('whatever', undefined), 'general');
});
