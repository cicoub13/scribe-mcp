import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate, FakeAPIError, FakeAPIConnectionError } = vi.hoisted(() => {
  class FakeAPIError extends Error {
    status: number;
    constructor(status: number, msg: string) {
      super(msg);
      this.status = status;
    }
  }
  class FakeAPIConnectionError extends Error {}
  return { mockCreate: vi.fn(), FakeAPIError, FakeAPIConnectionError };
});

vi.mock('openai', () => {
  class MockOpenAI {
    static APIError = FakeAPIError;
    static APIConnectionError = FakeAPIConnectionError;
    chat = { completions: { create: mockCreate } };
  }
  return { default: MockOpenAI };
});

vi.mock('../src/config.js', () => ({
  getConfig: vi.fn(() => ({
    apiKey: 'test',
    baseURL: 'https://api.example.com',
    model: 'test-model',
    maxTokens: 512,
    reasoningEnabled: false,
    workspaceRoot: undefined,
    logLevel: 'info' as const,
  })),
}));

import { callLLM } from '../src/llm.js';
import { getConfig } from '../src/config.js';

const baseConfig = {
  apiKey: 'test', baseURL: 'https://api.example.com',
  model: 'test-model', maxTokens: 512, reasoningEnabled: false,
  workspaceRoot: undefined, logLevel: 'info' as const,
};

const makeCompletion = (content: string) => ({
  choices: [{ message: { content }, finish_reason: 'stop' }],
  model: 'test-model',
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getConfig).mockReturnValue(baseConfig);
});

describe('callLLM', () => {
  it('returns content from a successful completion', async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion('hello'));
    const result = await callLLM({ system: 'sys', user: 'usr' });
    expect(result.content).toBe('hello');
  });

  it('retries on a 429 and succeeds on the second attempt', async () => {
    mockCreate
      .mockRejectedValueOnce(new FakeAPIError(429, 'rate limit'))
      .mockResolvedValueOnce(makeCompletion('ok after retry'));

    const result = await callLLM({ system: 'sys', user: 'usr' });
    expect(result.content).toBe('ok after retry');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('does not retry on a 400 error', async () => {
    mockCreate.mockRejectedValueOnce(new FakeAPIError(400, 'bad request'));
    await expect(callLLM({ system: 'sys', user: 'usr' })).rejects.toThrow('bad request');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxRetries times then throws', async () => {
    mockCreate.mockRejectedValue(new FakeAPIError(503, 'unavailable'));
    await expect(callLLM({ system: 'sys', user: 'usr' })).rejects.toThrow('unavailable');
    // 1 initial + 2 retries = 3
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('falls back to request without reasoning_effort when provider rejects it', async () => {
    vi.mocked(getConfig).mockReturnValue({ ...baseConfig, reasoningEnabled: true });

    // 400 is not retryable → triggers reasoning_effort fallback
    mockCreate
      .mockRejectedValueOnce(new FakeAPIError(400, 'reasoning not supported'))
      .mockResolvedValueOnce(makeCompletion('fallback ok'));

    const result = await callLLM({ system: 'sys', user: 'usr' });
    expect(result.content).toBe('fallback ok');
    expect(mockCreate).toHaveBeenCalledTimes(2);
    const secondCall = mockCreate.mock.calls[1][0] as Record<string, unknown>;
    expect(secondCall.reasoning_effort).toBeUndefined();
  });
});
