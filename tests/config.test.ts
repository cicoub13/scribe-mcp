import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('config', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.resetModules();
    for (const key of ['SCRIBE_API_KEY', 'SCRIBE_BASE_URL', 'SCRIBE_MODEL', 'SCRIBE_MAX_TOKENS',
      'SCRIBE_REASONING', 'SCRIBE_WORKSPACE_ROOT', 'SCRIBE_LOG_LEVEL']) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  it('throws when SCRIBE_API_KEY is missing', async () => {
    const { getConfig } = await import('../src/config.js');
    expect(() => getConfig()).toThrow('SCRIBE_API_KEY');
  });

  it('returns defaults when only API key is set', async () => {
    process.env.SCRIBE_API_KEY = 'test-key';
    const { getConfig } = await import('../src/config.js');
    const cfg = getConfig();
    expect(cfg.apiKey).toBe('test-key');
    expect(cfg.baseURL).toBe('https://api.minimax.io/v1');
    expect(cfg.model).toBe('MiniMax-Text-01');
    expect(cfg.maxTokens).toBe(8192);
    expect(cfg.reasoningEnabled).toBe(false);
    expect(cfg.workspaceRoot).toBeUndefined();
    expect(cfg.logLevel).toBe('info');
  });

  it('reads all env vars correctly', async () => {
    process.env.SCRIBE_API_KEY = 'my-key';
    process.env.SCRIBE_BASE_URL = 'https://example.com/v1';
    process.env.SCRIBE_MODEL = 'gpt-4o';
    process.env.SCRIBE_MAX_TOKENS = '4096';
    process.env.SCRIBE_REASONING = 'true';
    process.env.SCRIBE_WORKSPACE_ROOT = '/workspace';
    process.env.SCRIBE_LOG_LEVEL = 'debug';
    const { getConfig } = await import('../src/config.js');
    const cfg = getConfig();
    expect(cfg.baseURL).toBe('https://example.com/v1');
    expect(cfg.model).toBe('gpt-4o');
    expect(cfg.maxTokens).toBe(4096);
    expect(cfg.reasoningEnabled).toBe(true);
    expect(cfg.workspaceRoot).toBe('/workspace');
    expect(cfg.logLevel).toBe('debug');
  });

  it('defaults logLevel to info for unknown value', async () => {
    process.env.SCRIBE_API_KEY = 'key';
    process.env.SCRIBE_LOG_LEVEL = 'verbose';
    const { getConfig } = await import('../src/config.js');
    expect(getConfig().logLevel).toBe('info');
  });
});
