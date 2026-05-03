import OpenAI from 'openai';
import { getConfig } from './config.js';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const config = getConfig();
  _client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  return _client;
}

export interface LLMResult {
  content: string;
  model: string;
}

export async function callLLM(opts: {
  system: string;
  user: string;
}): Promise<LLMResult> {
  const config = getConfig();
  const response = await getClient().chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    max_tokens: config.maxTokens,
  });
  return {
    content: response.choices[0]?.message?.content ?? '',
    model: config.model,
  };
}

export async function callLLMStream(opts: {
  system: string;
  user: string;
  onChunk: (chunk: string) => void | Promise<void>;
}): Promise<LLMResult> {
  const config = getConfig();
  const stream = await getClient().chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    max_tokens: config.maxTokens,
    stream: true,
  });
  let content = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      content += delta;
      await opts.onChunk(delta);
    }
  }
  return { content, model: config.model };
}
