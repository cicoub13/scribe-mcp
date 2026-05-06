import OpenAI from 'openai';
import { getConfig } from './config.js';
import { logDebug, logWarn } from './utils/log.js';

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelayMs = 500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      const httpStatus: unknown = error instanceof OpenAI.APIError ? error.status : undefined;
      const isRetryable =
        (typeof httpStatus === 'number' && RETRYABLE_STATUSES.has(httpStatus)) ||
        error instanceof OpenAI.APIConnectionError;
      if (!isRetryable || attempt >= maxRetries) throw error;
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 100;
      logWarn(`transient API error, retrying in ${Math.round(delay)}ms`, { attempt: attempt + 1 });
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }
}

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

function buildBaseRequest(opts: { system: string; user: string }) {
  const config = getConfig();
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: opts.system },
    { role: 'user', content: opts.user },
  ];

  return {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
    reasoning_effort: config.reasoningEnabled
      ? ('medium' as OpenAI.Chat.Completions.ChatCompletionReasoningEffort)
      : undefined,
  };
}

async function createCompletionWithFallback(
  request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await withRetry(() => getClient().chat.completions.create(request));
  } catch (error) {
    if (!request.reasoning_effort) throw error;

    logWarn('provider rejected reasoning_effort, retrying without it', {
      model: String(request.model),
    });

    const fallbackRequest = { ...request };
    delete fallbackRequest.reasoning_effort;
    return withRetry(() => getClient().chat.completions.create(fallbackRequest));
  }
}

async function createStreamingCompletionWithFallback(
  request: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  try {
    return await withRetry(() => getClient().chat.completions.create(request));
  } catch (error) {
    if (!request.reasoning_effort) throw error;

    logWarn('provider rejected reasoning_effort, retrying without it', {
      model: String(request.model),
    });

    const fallbackRequest = { ...request };
    delete fallbackRequest.reasoning_effort;
    return withRetry(() => getClient().chat.completions.create(fallbackRequest));
  }
}

export async function callLLM(opts: {
  system: string;
  user: string;
}): Promise<LLMResult> {
  const config = getConfig();
  logDebug('sending completion request', {
    model: config.model,
    maxTokens: config.maxTokens,
    reasoningEnabled: config.reasoningEnabled,
    stream: false,
  });

  const response = await createCompletionWithFallback(buildBaseRequest(opts));
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
  logDebug('sending streaming completion request', {
    model: config.model,
    maxTokens: config.maxTokens,
    reasoningEnabled: config.reasoningEnabled,
    stream: true,
  });

  const stream = await createStreamingCompletionWithFallback({
    ...buildBaseRequest(opts),
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
