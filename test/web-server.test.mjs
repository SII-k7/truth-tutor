import test from 'node:test';
import assert from 'node:assert/strict';
import { startWebServer } from '../src/web-server.mjs';

test('web server serves info and prompt endpoints', async () => {
  const { server, url } = await startWebServer({ host: '127.0.0.1', port: 0, openBrowser: false });

  try {
    const info = await fetch(`${url}/api/info`).then((res) => res.json());
    assert.equal(info.appName, 'Truth Tutor Web');
    assert.ok(Array.isArray(info.examples));

    const prompt = await fetch(`${url}/api/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'paper-reading',
        paperTitle: 'Attention Is All You Need',
        confusion: 'I do not get why multi-head attention helps.',
      }),
    }).then((res) => res.json());

    assert.equal(prompt.mode, 'paper-reading');
    assert.match(prompt.outputTemplate, /Paper Reading Truth Report/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
