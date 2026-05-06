import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync, realpathSync } from 'node:fs';
import { resolve, dirname, isAbsolute, relative } from 'node:path';
import { globIterate } from 'glob';
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

function resolveReal(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    // Path may not exist yet (e.g. a file about to be written). Resolve the
    // nearest existing ancestor to still catch symlinks in the parent chain.
    const parent = dirname(p);
    if (parent === p) return p; // filesystem root
    return resolve(resolveReal(parent), p.slice(parent.length + 1));
  }
}

function assertInWorkspace(filePath: string): void {
  const config = getConfig();
  if (!config.workspaceRoot) return;
  const abs = resolveReal(resolve(filePath));
  const root = resolveReal(resolve(config.workspaceRoot));
  const rel = relative(root, abs);
  if (rel.startsWith('..') || isAbsolute(rel)) {
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
  outer: for (const pattern of patterns) {
    if (!pattern.includes('*') && !pattern.includes('{')) {
      const abs = isAbsolute(pattern) ? pattern : resolve(pattern);
      if (existsSync(abs)) results.push(abs);
      if (results.length >= maxFiles) break;
      continue;
    }
    for await (const match of globIterate(pattern, { absolute: true, nodir: true })) {
      results.push(match);
      if (results.length >= maxFiles) break outer;
    }
  }
  return results;
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
