import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { buildPrompt } from './build-prompt.mjs';
import { validateInput } from './input.mjs';
import { askModel } from './model-client.mjs';
import { normalizeMode } from './modes.mjs';
import { searchArxiv, enrichInputWithPaperContext } from './paper-context.mjs';
import { resolveApiConfig } from './provider-config.mjs';

const PUBLIC_DIR = new URL('./web-ui/', import.meta.url);
const EXAMPLES_DIR = new URL('../examples/', import.meta.url);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export async function startWebServer({ host = '127.0.0.1', port = 3474, openBrowser = true } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${host}:${port}`);

      if (req.method === 'GET' && url.pathname === '/api/info') {
        return sendJson(res, 200, await getInfo());
      }

      if (req.method === 'GET' && url.pathname === '/api/examples') {
        return sendJson(res, 200, { items: await listExamples() });
      }

      if (req.method === 'GET' && url.pathname === '/api/arxiv-search') {
        const query = url.searchParams.get('q') || '';
        return sendJson(res, 200, { items: await searchArxiv(query, 6) });
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/examples/')) {
        const name = decodeURIComponent(url.pathname.replace('/api/examples/', ''));
        return sendJson(res, 200, await readExample(name));
      }

      if (req.method === 'POST' && url.pathname === '/api/prompt') {
        const input = await readJsonBody(req);
        const normalized = await enrichInputWithPaperContext(normalizeInputPayload(input));
        const prompt = buildPrompt(validateInput(normalized));
        return sendJson(res, 200, prompt);
      }

      if (req.method === 'POST' && url.pathname === '/api/ask') {
        const body = await readJsonBody(req);
        const input = await enrichInputWithPaperContext(normalizeInputPayload(body.input || body));
        const prompt = buildPrompt(validateInput(input));
        const result = await askModel({
          apiStyle: body.apiStyle,
          apiBaseUrl: body.apiBaseUrl,
          apiKey: body.apiKey,
          model: body.model,
          temperature: body.temperature,
          timeoutMs: body.timeoutMs,
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
        });

        return sendJson(res, 200, {
          input,
          prompt,
          result,
        });
      }

      if (req.method === 'GET') {
        const assetPath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        return sendStatic(res, assetPath);
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Internal Server Error' });
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const resolvedPort = typeof address === 'object' && address ? address.port : port;
  const appUrl = `http://${host}:${resolvedPort}`;

  if (openBrowser) {
    openUrl(appUrl).catch(() => {});
  }

  return {
    server,
    url: appUrl,
    host,
    port: resolvedPort,
  };
}

async function getInfo() {
  const config = await resolveApiConfig({});
  return {
    appName: 'Truth Tutor Web',
    defaultMode: 'paper-reading',
    api: {
      source: config.source,
      style: config.style,
      model: config.model || null,
      baseUrl: config.baseUrl || null,
    },
    examples: await listExamples(),
  };
}

async function listExamples() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
}

async function readExample(name) {
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(name)) {
    throw new Error('Invalid example name');
  }

  const raw = await readFile(new URL(name, EXAMPLES_DIR), 'utf8');
  return JSON.parse(raw);
}

async function sendStatic(res, assetPath) {
  const safePath = assetPath.includes('..') ? 'index.html' : assetPath;
  const fileUrl = new URL(safePath, PUBLIC_DIR);

  try {
    const data = await readFile(fileUrl);
    const type = MIME_TYPES[extname(safePath)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(data);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    throw error;
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function normalizeInputPayload(input) {
  const normalized = Object.fromEntries(
    Object.entries(input || {}).filter(([, value]) => value !== undefined && value !== '' && value !== null),
  );
  normalized.mode = normalizeMode(normalized.mode, normalized.source);
  return normalized;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
}

async function openUrl(url) {
  const platform = process.platform;
  if (platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
}
