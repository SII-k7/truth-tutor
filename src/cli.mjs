import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildPrompt } from './build-prompt.mjs';
import { formatPromptAsMarkdown } from './format.mjs';
import { loadInput, validateInput } from './input.mjs';
import { askModel } from './model-client.mjs';
import { startWebServer } from './web-server.mjs';

const OPTIONS = {
  input: { type: 'string' },
  mode: { type: 'string' },
  source: { type: 'string' },
  topic: { type: 'string' },
  'material-title': { type: 'string' },
  'material-type': { type: 'string' },
  'paper-title': { type: 'string' },
  'paper-id': { type: 'string' },
  'paper-url': { type: 'string' },
  'paper-domain': { type: 'string' },
  'paper-stage': { type: 'string' },
  'confusion-location': { type: 'string' },
  'main-blocker': { type: 'string' },
  confusion: { type: 'string' },
  understanding: { type: 'string' },
  goals: { type: 'string' },
  'study-level': { type: 'string' },
  'weekly-hours': { type: 'string' },
  strictness: { type: 'string' },
  language: { type: 'string' },
  'extra-context': { type: 'string' },
  'user-question': { type: 'string' },
  'ai-answer': { type: 'string' },
  'user-reaction': { type: 'string' },
  output: { type: 'string' },
  json: { type: 'boolean', default: false },
  'api-style': { type: 'string' },
  'api-base-url': { type: 'string' },
  'api-key': { type: 'string' },
  model: { type: 'string' },
  temperature: { type: 'string' },
  timeout: { type: 'string' },
  host: { type: 'string' },
  port: { type: 'string' },
  help: { type: 'boolean', short: 'h', default: false },
};

const HELP = `Truth Tutor CLI

Usage:
  truth-tutor <command> [options]
  node ./bin/truth-tutor.mjs <command> [options]

Commands:
  prompt           Generate a general prompt pack
  ask              Generate the prompt and call a model API
  paper-prompt     Generate a dedicated paper-reading prompt pack
  paper-ask        Call the paper-reading mode directly
  alphaxiv-prompt  Generate a prompt for an alphaXiv follow-up diagnosis flow
  alphaxiv-ask     Call the alphaXiv mode directly
  web              Launch the local Truth Tutor Web UI

Common options:
  --input <file.json>
  --mode <general|paper-reading|alphaxiv>
  --source <alphaxiv>
  --topic <text>
  --material-title <text>
  --material-type <paper|book|video|concept|other>
  --paper-title <text>
  --paper-id <text>
  --paper-url <url>
  --paper-domain <ml|systems|math|bio|other>
  --paper-stage <abstract|intro|method|equations|experiments|full>
  --confusion-location <text>
  --main-blocker <text>
  --confusion <text>
  --understanding <text>
  --goals <text>
  --study-level <text>
  --weekly-hours <number>
  --strictness <soft|direct|strict|brutal|0-10>
  --language <text>
  --extra-context <text>
  --user-question <text>
  --ai-answer <text>
  --user-reaction <text>
  --output <path>
  --json

Model options for ask:
  --api-style <openai|anthropic>
  --api-base-url <url>
  --api-key <key>
  --model <name>
  --temperature <number>
  --timeout <ms>

Default local behavior:
  If no API options are provided, Truth Tutor will first try local env vars.
  If none are set, it will automatically fall back to the local OpenClaw MiniMax profile when available.

Web options:
  --host <host>     Default: 127.0.0.1
  --port <port>     Default: 3474

Examples:
  truth-tutor paper-prompt --input ./examples/paper-reading.json
  truth-tutor alphaxiv-prompt --input ./examples/alphaxiv-session.json
  truth-tutor ask --mode paper-reading --paper-title "Attention Is All You Need" --confusion "I still don't get why multi-head attention helps"
  truth-tutor web --port 3474
`;

const COMMAND_MODES = {
  prompt: null,
  ask: null,
  'paper-prompt': 'paper-reading',
  'paper-ask': 'paper-reading',
  'alphaxiv-prompt': 'alphaxiv',
  'alphaxiv-ask': 'alphaxiv',
  web: null,
};

export async function run(argv = process.argv.slice(2)) {
  const [command] = argv;

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(COMMAND_MODES, command)) {
    throw new Error(`Unknown command: ${command}`);
  }

  const parsed = parseArgs({
    args: argv.slice(1),
    options: OPTIONS,
    allowPositionals: true,
    strict: true,
  });

  if (parsed.values.help) {
    console.log(HELP);
    return;
  }

  if (command === 'web') {
    const { url } = await startWebServer({
      host: parsed.values.host || '127.0.0.1',
      port: parsed.values.port ? Number(parsed.values.port) : 3474,
      openBrowser: true,
    });

    console.log(`Truth Tutor Web is running at ${url}`);
    console.log('Press Ctrl+C to stop.');
    return await new Promise(() => {});
  }

  const forcedMode = COMMAND_MODES[command];
  if (forcedMode) {
    parsed.values.mode = forcedMode;
  }

  if (forcedMode === 'alphaxiv' && !parsed.values.source) {
    parsed.values.source = 'alphaxiv';
  }

  const input = validateInput(
    await loadInput({
      inputPath: parsed.values.input,
      flags: parsed.values,
    }),
  );

  const promptPack = buildPrompt(input);
  const shouldAsk = command.endsWith('ask') || command === 'ask';

  if (!shouldAsk) {
    const body = parsed.values.json
      ? JSON.stringify(promptPack, null, 2)
      : formatPromptAsMarkdown(promptPack);

    await maybeWriteOutput(parsed.values.output, body);
    console.log(body);
    return;
  }

  const result = await askModel({
    apiStyle: parsed.values['api-style'],
    apiBaseUrl: parsed.values['api-base-url'],
    apiKey: parsed.values['api-key'],
    model: parsed.values.model,
    temperature: parsed.values.temperature ? Number(parsed.values.temperature) : undefined,
    timeoutMs: parsed.values.timeout ? Number(parsed.values.timeout) : undefined,
    systemPrompt: promptPack.systemPrompt,
    userPrompt: promptPack.userPrompt,
  });

  const body = parsed.values.json ? JSON.stringify(result, null, 2) : result.content;
  await maybeWriteOutput(parsed.values.output, body);
  console.log(body);
}

async function maybeWriteOutput(outputPath, body) {
  if (!outputPath) {
    return;
  }

  const resolved = resolve(outputPath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, body, 'utf8');
}
