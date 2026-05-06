import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSafe, expandGlobs } from '../src/utils/files.js';

// Config mock — no workspace root by default
vi.mock('../src/config.js', () => ({
  getConfig: vi.fn(() => ({ workspaceRoot: undefined })),
}));

import { getConfig } from '../src/config.js';
const mockGetConfig = vi.mocked(getConfig);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'scribe-test-'));
  mockGetConfig.mockReturnValue({ workspaceRoot: undefined } as ReturnType<typeof getConfig>);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.clearAllMocks();
});

// --- readSafe ---

describe('readSafe', () => {
  it('returns file content for a normal text file', async () => {
    const p = join(dir, 'hello.ts');
    writeFileSync(p, 'const x = 1;');
    expect(await readSafe(p)).toBe('const x = 1;');
  });

  it('returns null for a binary extension', async () => {
    const p = join(dir, 'img.png');
    writeFileSync(p, 'fake png');
    expect(await readSafe(p)).toBeNull();
  });

  it('returns null for a file containing a null byte', async () => {
    const p = join(dir, 'binary.bin');
    writeFileSync(p, Buffer.from([0x68, 0x65, 0x00, 0x6c, 0x6f])); // he\0lo
    expect(await readSafe(p)).toBeNull();
  });

  it('returns a truncation message for files over 1 MB', async () => {
    const p = join(dir, 'big.txt');
    writeFileSync(p, 'a'.repeat(1_100_000));
    const result = await readSafe(p);
    expect(result).toContain('truncated');
  });

  it('returns null for a non-existent file', async () => {
    expect(await readSafe(join(dir, 'no-such-file.ts'))).toBeNull();
  });
});

// --- assertInWorkspace (via readSafe with workspace root set) ---

describe('assertInWorkspace', () => {
  it('allows paths inside the workspace', async () => {
    mockGetConfig.mockReturnValue({ workspaceRoot: dir } as ReturnType<typeof getConfig>);
    const p = join(dir, 'ok.ts');
    writeFileSync(p, 'ok');
    expect(await readSafe(p)).toBe('ok');
  });

  it('throws for paths outside the workspace', async () => {
    mockGetConfig.mockReturnValue({ workspaceRoot: dir } as ReturnType<typeof getConfig>);
    await expect(readSafe('/etc/passwd')).rejects.toThrow('outside workspace root');
  });

  it('rejects path traversal attempts', async () => {
    mockGetConfig.mockReturnValue({ workspaceRoot: dir } as ReturnType<typeof getConfig>);
    await expect(readSafe(join(dir, '..', 'escape.ts'))).rejects.toThrow('outside workspace root');
  });

  it('allows paths that go through a symlink inside the workspace', async () => {
    // Create: dir/real/file.ts  and  dir/link -> dir/real (symlink)
    const realDir = join(dir, 'real');
    mkdirSync(realDir);
    writeFileSync(join(realDir, 'file.ts'), 'content');
    symlinkSync(realDir, join(dir, 'link'));

    mockGetConfig.mockReturnValue({ workspaceRoot: dir } as ReturnType<typeof getConfig>);
    const result = await readSafe(join(dir, 'link', 'file.ts'));
    expect(result).toBe('content');
  });
});

// --- expandGlobs ---

describe('expandGlobs', () => {
  it('returns literal paths directly', async () => {
    const p = join(dir, 'a.ts');
    writeFileSync(p, '');
    const results = await expandGlobs([p], 10);
    expect(results).toEqual([p]);
  });

  it('expands glob patterns', async () => {
    writeFileSync(join(dir, 'a.ts'), '');
    writeFileSync(join(dir, 'b.ts'), '');
    const results = await expandGlobs([join(dir, '*.ts')], 10);
    expect(results).toHaveLength(2);
  });

  it('strictly caps results to maxFiles even within a single glob', async () => {
    for (let i = 0; i < 20; i++) writeFileSync(join(dir, `f${i}.ts`), '');
    const results = await expandGlobs([join(dir, '*.ts')], 5);
    expect(results).toHaveLength(5);
  });

  it('caps across multiple patterns', async () => {
    writeFileSync(join(dir, 'a.ts'), '');
    writeFileSync(join(dir, 'b.ts'), '');
    writeFileSync(join(dir, 'c.ts'), '');
    const results = await expandGlobs([
      join(dir, 'a.ts'),
      join(dir, 'b.ts'),
      join(dir, 'c.ts'),
    ], 2);
    expect(results).toHaveLength(2);
  });

  it('returns empty array when no patterns match', async () => {
    const results = await expandGlobs([join(dir, '*.nonexistent')], 10);
    expect(results).toEqual([]);
  });
});
