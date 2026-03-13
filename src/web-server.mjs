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
import { loadLearningProfile, saveLearningProfile, summarizeLearningProfile } from './learning-profile.mjs';
import { loadDrillState, saveDrillState } from './drill-tracker.mjs';

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

      if (req.method === 'GET' && url.pathname === '/api/profile') {
        const profile = await loadLearningProfile('default');
        return sendJson(res, 200, profile);
      }

      if (req.method === 'POST' && url.pathname === '/api/profile/reset') {
        await saveLearningProfile('default', {}, '');
        return sendJson(res, 200, { status: 'reset', profile: await loadLearningProfile('default') });
      }

      if (req.method === 'GET' && url.pathname === '/api/drills') {
        const state = await loadDrillState();
        return sendJson(res, 200, state);
      }

      if (req.method === 'POST' && url.pathname === '/api/drills') {
        const body = await readJsonBody(req);
        const items = Array.isArray(body.items) ? body.items : [];
        const state = await saveDrillState(items);
        return sendJson(res, 200, state);
      }

      if (req.method === 'POST' && url.pathname === '/api/drills/clear') {
        const state = await saveDrillState([]);
        return sendJson(res, 200, state);
      }

      if (req.method === 'GET' && url.pathname === '/api/drills/library') {
        // Return all available drill templates
        const templates = {
          derivation: {
            id: 'derivation',
            name: 'Derivation Check',
            description: 'Ask learner to derive one intermediate step',
            icon: '📐'
          },
          mechanism: {
            id: 'mechanism',
            name: 'Mechanism Check',
            description: 'Explain why one component changes outcome vs baseline',
            icon: '⚙️'
          },
          evidence: {
            id: 'evidence',
            name: 'Evidence Check',
            description: 'Point to paragraph/section/figure supporting a claim',
            icon: '📄'
          },
          ablation: {
            id: 'ablation',
            name: 'Ablation Check',
            description: 'What result worsens if one module is removed',
            icon: '🔬'
          },
          transfer: {
            id: 'transfer',
            name: 'Transfer Check',
            description: 'Apply idea to nearby example or toy case',
            icon: '🔀'
          },
          foundation: {
            id: 'foundation',
            name: 'Foundation Check',
            description: '2-sentence explanation of core prerequisite',
            icon: '🏗️'
          },
          section: {
            id: 'section',
            name: 'Section Check',
            description: 'Reread target section and answer narrow question',
            icon: '📖'
          }
        };
        return sendJson(res, 200, { templates: Object.values(templates), total: Object.keys(templates).length });
      }

      if (req.method === 'POST' && url.pathname === '/api/compare-strictness') {
        const body = await readJsonBody(req);
        const { question, mode: compareMode, paperId } = body;
        
        if (!question) {
          return sendJson(res, 400, { error: 'question is required' });
        }

        // Run with all 4 strictness levels in parallel
        const strictnessLevels = ['soft', 'direct', 'strict', 'brutal'];
        const results = await Promise.all(
          strictnessLevels.map(async (strictness) => {
            try {
              const input = {
                mode: compareMode || 'general',
                strictness,
                language: 'Chinese',
                confusion: question,
                topic: 'Comparison mode',
                paperId
              };
              const prompt = buildPrompt(validateInput(input));
              
              const result = await askModel({
                apiStyle: body.apiStyle,
                apiBaseUrl: body.apiBaseUrl,
                apiKey: body.apiKey,
                model: body.model,
                timeoutMs: body.timeoutMs,
                systemPrompt: prompt.systemPrompt,
                userPrompt: prompt.userPrompt,
              });

              return {
                strictness,
                content: result.content,
                success: true
              };
            } catch (error) {
              return {
                strictness,
                content: error.message,
                success: false
              };
            }
          })
        );

        return sendJson(res, 200, { question, mode: compareMode, results });
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
        
        // Load prior learning profile for context
        const profile = await loadLearningProfile('default');
        const profileSummary = summarizeLearningProfile(profile);
        
        // Inject profile context into prompt if available
        let enhancedUserPrompt = prompt.userPrompt;
        if (profileSummary) {
          enhancedUserPrompt += `\n\n# Prior Learning Profile\n${profileSummary}\n(Note: Reference recurring gaps if relevant to this diagnosis.)`;
        }
        
        const result = await askModel({
          apiStyle: body.apiStyle,
          apiBaseUrl: body.apiBaseUrl,
          apiKey: body.apiKey,
          model: body.model,
          temperature: body.temperature,
          timeoutMs: body.timeoutMs,
          systemPrompt: prompt.systemPrompt,
          userPrompt: enhancedUserPrompt,
        });

        // Save/update learning profile after response
        if (result.content) {
          await saveLearningProfile('default', input, result.content).catch(() => {});
        }

        return sendJson(res, 200, {
          input,
          prompt: { ...prompt, userPrompt: enhancedUserPrompt },
          result,
          profile: { 
            recurringGaps: profile.recurringGaps, 
            gapFrequency: profile.gapFrequency || {},
            recentTopics: profile.recentTopics,
            sessions: profile.sessions,
          },
          paperEvidenceIndex: input.paperEvidenceIndex || {},
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
