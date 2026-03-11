import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

export async function resolveApiConfig({ apiStyle, apiBaseUrl, apiKey, model }) {
  const explicitStyle = apiStyle || process.env.TRUTH_TUTOR_API_STYLE;

  if (apiKey || apiBaseUrl || model || explicitStyle) {
    return {
      style: explicitStyle || inferStyleFromBaseUrl(apiBaseUrl) || 'openai',
      baseUrl: apiBaseUrl || process.env.OPENAI_BASE_URL || process.env.ANTHROPIC_BASE_URL,
      apiKey: apiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
      model: model || process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL,
      source: 'explicit-or-env',
    };
  }

  if (process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL || process.env.OPENAI_MODEL) {
    return {
      style: 'openai',
      baseUrl: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
      source: 'openai-env',
    };
  }

  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_BASE_URL || process.env.ANTHROPIC_MODEL) {
    return {
      style: 'anthropic',
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL,
      source: 'anthropic-env',
    };
  }

  const localMiniMax = await tryLoadOpenClawMiniMax();
  if (localMiniMax) {
    return { ...localMiniMax, source: 'openclaw-minimax' };
  }

  return {
    style: 'openai',
    baseUrl: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    source: 'empty',
  };
}

function inferStyleFromBaseUrl(baseUrl) {
  const value = String(baseUrl || '').toLowerCase();
  if (!value) return undefined;
  if (value.includes('/anthropic')) return 'anthropic';
  return 'openai';
}

async function tryLoadOpenClawMiniMax() {
  try {
    const file = resolve(homedir(), '.openclaw/agents/main/agent/models.json');
    const raw = await readFile(file, 'utf8');
    const json = JSON.parse(raw);
    const provider = json?.providers?.['minimax-cn'];
    const model = provider?.models?.[0]?.id;

    if (!provider?.baseUrl || !provider?.apiKey || !model) {
      return null;
    }

    return {
      style: 'anthropic',
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model,
    };
  } catch {
    return null;
  }
}
