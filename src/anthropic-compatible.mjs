const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_TOKENS = 2048;

export async function askAnthropicCompatible({
  apiBaseUrl,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxTokens = DEFAULT_MAX_TOKENS,
}) {
  const baseUrl = (apiBaseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  const resolvedApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
  const resolvedModel = model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';

  if (!resolvedApiKey) {
    throw new Error('Missing API key. Set ANTHROPIC_API_KEY or pass --api-key.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': resolvedApiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: resolvedModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Model call failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    const content = extractText(data?.content);

    if (!content) {
      throw new Error('Model call succeeded but no text content was returned.');
    }

    return {
      model: resolvedModel,
      content,
      raw: data,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Model call timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(blocks) {
  if (!Array.isArray(blocks)) {
    return '';
  }

  return blocks
    .filter((block) => block?.type === 'text' && typeof block?.text === 'string')
    .map((block) => block.text)
    .join('\n\n')
    .trim();
}
