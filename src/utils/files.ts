import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { glob } from 'glob';
import { getConfig } from '../config.js';

const MAX_FILE_BYTES = 1_000_000; // 1 MB per file

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.ttf', '.otf', '.woff', '.woff2',
  '.db', '.sqlite',
]);

function isBinaryPath(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function assertInWorkspace(filePath: string): void {
  const config = getConfig();
  if (!config.workspaceRoot) return;
  const abs = resolve(filePath);
  const root = resolve(config.workspaceRoot);
  if (!abs.startsWith(root + '/') && abs !== root) {
    throw new Error(`Path "${abs}" is outside workspace root "${root}"`);
  }
}

export async function readSafe(filePath: string): Promise<string | null> {
  assertInWorkspace(filePath);
  if (isBinaryPath(filePath)) return null;

  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;
  if (stat.size > MAX_FILE_BYTES) {
    return `[file truncated — size ${stat.size} bytes exceeds 1 MB limit]`;
  }

  const buf = await readFile(filePath);
  if (buf.includes(0)) return null; // null byte → binary
  return buf.toString('utf8');
}

export async function expandGlobs(
  patterns: string[],
  maxFiles: number,
): Promise<string[]> {
  const results: string[] = [];
  for (const pattern of patterns) {
    if (!pattern.includes('*') && !pattern.includes('{')) {
      const abs = isAbsolute(pattern) ? pattern : resolve(pattern);
      if (existsSync(abs)) results.push(abs);
      continue;
    }
    const matches = await glob(pattern, { absolute: true, nodir: true });
    results.push(...matches);
    if (results.length >= maxFiles) break;
  }
  return results.slice(0, maxFiles);
}

export async function writeWithMode(
  filePath: string,
  content: string,
  append: boolean,
): Promise<void> {
  assertInWorkspace(filePath);
  const abs = isAbsolute(filePath) ? filePath : resolve(filePath);
  await mkdir(dirname(abs), { recursive: true });
  if (append) {
    await writeFile(abs, content, { flag: 'a', encoding: 'utf8' });
  } else {
    await writeFile(abs, content, { encoding: 'utf8' });
  }
}
