import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiConfig } from '../src/provider-config.mjs';

test('resolveApiConfig infers anthropic style from anthropic base URL', async () => {
  const result = await resolveApiConfig({
    apiStyle: undefined,
    apiBaseUrl: 'https://api.minimaxi.com/anthropic',
    apiKey: 'x',
    model: 'MiniMax-M2.5',
  });

  assert.equal(result.style, 'anthropic');
  assert.equal(result.model, 'MiniMax-M2.5');
});

test('resolveApiConfig honors explicit api style', async () => {
  const result = await resolveApiConfig({
    apiStyle: 'openai',
    apiBaseUrl: 'https://example.com/v1',
    apiKey: 'x',
    model: 'gpt-test',
  });

  assert.equal(result.style, 'openai');
  assert.equal(result.model, 'gpt-test');
});
