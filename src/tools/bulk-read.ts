import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { callLLM } from '../llm.js';
import { expandGlobs, readSafe } from '../utils/files.js';
import { buildCorpus, SYSTEM_BULK_READ } from '../utils/prompts.js';

const inputSchema = z.object({
  paths: z.array(z.string()).min(1).describe('File paths or glob patterns to read'),
  question: z.string().describe('What to extract or summarize from the files'),
  max_files: z.number().int().min(1).max(200).optional().default(50).describe('Maximum number of files to read'),
});

export function registerBulkRead(server: McpServer): void {
  server.registerTool(
    'bulk_read',
    {
      title: 'Bulk File Read',
      description:
        'Read multiple files or globs and get a targeted summary or answer from a cheaper LLM. ' +
        'Use this instead of reading files yourself when you need to read ≥3 files or a file >400 lines ' +
        'and the task is summarisation, search, or explanation.',
      inputSchema,
    },
    async (args) => {
      const { paths, question, max_files } = args;

      const resolvedPaths = await expandGlobs(paths, max_files ?? 50);
      if (resolvedPaths.length === 0) {
        return { content: [{ type: 'text', text: 'No files found for the given paths/patterns.' }], isError: true };
      }

      const fileContents: Array<{ path: string; content: string }> = [];
      const skipped: string[] = [];

      for (const filePath of resolvedPaths) {
        const content = await readSafe(filePath);
        if (content === null) {
          skipped.push(filePath);
        } else {
          fileContents.push({ path: filePath, content });
        }
      }

      if (fileContents.length === 0) {
        return { content: [{ type: 'text', text: 'All files were skipped (binary or unreadable).' }], isError: true };
      }

      const corpus = buildCorpus(fileContents);
      const userMessage = `<corpus>\n${corpus}\n</corpus>\n\n${question}`;

      const { content, model } = await callLLM({ system: SYSTEM_BULK_READ, user: userMessage });

      const meta = [
        `\n\n---`,
        `*scribe — model: ${model} · files read: ${fileContents.length}${skipped.length > 0 ? ` · skipped: ${skipped.length}` : ''}*`,
      ].join('\n');

      return { content: [{ type: 'text', text: content + meta }] };
    },
  );
}
