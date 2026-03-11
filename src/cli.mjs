import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildPrompt } from './build-prompt.mjs';
import { formatPromptAsMarkdown } from './format.mjs';
import { loadInput, validateInput } from './input.mjs';
import { askOpenAICompatible } from './openai-compatible.mjs';

const OPTIONS = {
  input: { type: 'string' },
  topic: { type: 'string' },
  'material-title': { type: 'string' },
  'material-type': { type: 'string' },
  confusion: { type: 'string' },
  understanding: { type: 'string' },
  goals: { type: 'string' },
  'study-level': { type: 'string' },
  'weekly-hours': { type: 'string' },
  strictness: { type: 'string' },
  language: { type: 'string' },
  'extra-context': { type: 'string' },
  output: { type: 'string' },
  json: { type: 'boolean', default: false },
  'api-base-url': { type: 'string' },
  'api-key': { type: 'string' },
  model: { type: 'string' },
  temperature: { type: 'string' },
  help: { type: 'boolean', short: 'h', default: false },
};

const HELP = `Truth Tutor CLI

Usage:
  truth-tutor <command> [options]
  node ./bin/truth-tutor.mjs <command> [options]

Commands:
  prompt   Generate a prompt pack
  ask      Generate the prompt and send it to an OpenAI-compatible chat API

Common options:
  --input <file.json>
  --topic <text>
  --material-title <text>
  --material-type <paper|book|video|concept|other>
  --confusion <text>
  --understanding <text>
  --goals <text>
  --study-level <text>
  --weekly-hours <number>
  --strictness <soft|direct|strict|brutal|0-10>
  --language <text>
  --extra-context <text>
  --output <path>
  --json

Model options for ask:
  --api-base-url <url>
  --api-key <key>
  --model <name>
  --temperature <number>

Examples:
  truth-tutor prompt --topic "Diffusion models" --confusion "I don't get the latent space tradeoff"
  truth-tutor ask --input ./examples/paper-reading.json --strictness strict
`;

export async function run(argv = process.argv.slice(2)) {
  const [command] = argv;

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
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

  const input = validateInput(
    await loadInput({
      inputPath: parsed.values.input,
      flags: parsed.values,
    }),
  );

  const promptPack = buildPrompt(input);

  if (command === 'prompt') {
    const body = parsed.values.json
      ? JSON.stringify(promptPack, null, 2)
      : formatPromptAsMarkdown(promptPack);

    await maybeWriteOutput(parsed.values.output, body);
    console.log(body);
    return;
  }

  if (command === 'ask') {
    const result = await askOpenAICompatible({
      apiBaseUrl: parsed.values['api-base-url'],
      apiKey: parsed.values['api-key'],
      model: parsed.values.model,
      temperature: parsed.values.temperature
        ? Number(parsed.values.temperature)
        : undefined,
      systemPrompt: promptPack.systemPrompt,
      userPrompt: promptPack.userPrompt,
    });

    const body = parsed.values.json
      ? JSON.stringify(result, null, 2)
      : result.content;

    await maybeWriteOutput(parsed.values.output, body);
    console.log(body);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

async function maybeWriteOutput(outputPath, body) {
  if (!outputPath) {
    return;
  }

  const resolved = resolve(outputPath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, body, 'utf8');
}
