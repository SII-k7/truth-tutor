export async function askOpenAICompatible({
  apiBaseUrl,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.7,
}) {
  const baseUrl = (apiBaseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const resolvedApiKey = apiKey || process.env.OPENAI_API_KEY;
  const resolvedModel = model || process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  if (!resolvedApiKey) {
    throw new Error('Missing API key. Set OPENAI_API_KEY or pass --api-key.');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${resolvedApiKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Model call failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Model call succeeded but no message content was returned.');
  }

  return {
    model: resolvedModel,
    content,
    raw: data,
  };
}
