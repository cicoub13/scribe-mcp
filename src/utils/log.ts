import { getConfig } from '../config.js';

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;

type LogLevel = (typeof LEVELS)[number];

function shouldLog(level: LogLevel): boolean {
  const configured = getConfig().logLevel;
  return LEVELS.indexOf(level) >= LEVELS.indexOf(configured);
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const payload = meta ? ` ${JSON.stringify(meta)}` : '';
  process.stderr.write(`[scribe:${level}] ${message}${payload}\n`);
}

export function logDebug(message: string, meta?: Record<string, unknown>): void {
  write('debug', message, meta);
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  write('info', message, meta);
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  write('warn', message, meta);
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  write('error', message, meta);
}
