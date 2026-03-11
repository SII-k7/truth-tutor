import { askOpenAICompatible } from './openai-compatible.mjs';
import { askAnthropicCompatible } from './anthropic-compatible.mjs';
import { resolveApiConfig } from './provider-config.mjs';

export async function askModel({
  apiStyle,
  apiBaseUrl,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  temperature,
  timeoutMs,
}) {
  const config = await resolveApiConfig({
    apiStyle,
    apiBaseUrl,
    apiKey,
    model,
  });

  if (config.style === 'anthropic') {
    return askAnthropicCompatible({
      apiBaseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      systemPrompt,
      userPrompt,
      timeoutMs,
    });
  }

  return askOpenAICompatible({
    apiBaseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    systemPrompt,
    userPrompt,
    temperature,
    timeoutMs,
  });
}
