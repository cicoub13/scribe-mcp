export interface Config {
  apiKey: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  reasoningEnabled: boolean;
  workspaceRoot: string | undefined;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

let cached: Config | undefined;

function parseLogLevel(value: string | undefined): Config['logLevel'] {
  switch (value) {
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
      return value;
    default:
      return 'info';
  }
}

export function getConfig(): Config {
  if (cached) return cached;

  const apiKey = process.env.SCRIBE_API_KEY;
  if (!apiKey) {
    throw new Error('SCRIBE_API_KEY environment variable is required');
  }

  cached = {
    apiKey,
    baseURL: process.env.SCRIBE_BASE_URL ?? 'https://api.minimax.io/v1',
    model: process.env.SCRIBE_MODEL ?? 'MiniMax-Text-01',
    maxTokens: parseInt(process.env.SCRIBE_MAX_TOKENS ?? '8192', 10),
    reasoningEnabled: process.env.SCRIBE_REASONING === 'true',
    workspaceRoot: process.env.SCRIBE_WORKSPACE_ROOT,
    logLevel: parseLogLevel(process.env.SCRIBE_LOG_LEVEL),
  };

  return cached;
}
