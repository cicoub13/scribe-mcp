import { describe, it, expect } from 'vitest';
import { buildCorpus } from '../src/utils/prompts.js';

describe('buildCorpus', () => {
  it('wraps a single file in XML tags', () => {
    const result = buildCorpus([{ path: 'src/foo.ts', content: 'const x = 1;' }]);
    expect(result).toBe('<file path="src/foo.ts">\nconst x = 1;\n</file>');
  });

  it('joins multiple files with a blank line', () => {
    const result = buildCorpus([
      { path: 'a.ts', content: 'a' },
      { path: 'b.ts', content: 'b' },
    ]);
    expect(result).toContain('\n\n');
    expect(result.split('\n\n')).toHaveLength(2);
  });

  it('returns empty string for empty array', () => {
    expect(buildCorpus([])).toBe('');
  });

  it('preserves content with XML-like characters', () => {
    const content = '<div>hello</div>';
    const result = buildCorpus([{ path: 'x.html', content }]);
    expect(result).toContain('<div>hello</div>');
  });
});
