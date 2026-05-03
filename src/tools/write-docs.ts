import { z } from 'zod';
import { resolve } from 'node:path';
import type { McpServer, ServerContext } from '@modelcontextprotocol/server';
import { callLLM, callLLMStream } from '../llm.js';
import { expandGlobs, readSafe, writeWithMode } from '../utils/files.js';
import { buildCorpus, SYSTEM_WRITE_DOCS } from '../utils/prompts.js';

const inputSchema = z.object({
  target_path: z.string().describe('File path where the documentation will be written'),
  instruction: z.string().describe('What documentation to generate (e.g. "write a README for this module")'),
  context_paths: z.array(z.string()).optional().describe('Files to read as context for generating the documentation'),
  preview: z.boolean().optional().default(false).describe('If true, return the generated content without writing to disk'),
  append: z.boolean().optional().default(false).describe('If true, append to the file instead of overwriting'),
});

export function registerWriteDocs(server: McpServer): void {
  server.registerTool(
    'write_docs',
    {
      title: 'Write Documentation',
      description:
        'Generate documentation (README, JSDoc, module comments, etc.) using a cheaper LLM and write it to disk. ' +
        'Pass preview: true to inspect the result before writing. ' +
        'Pass context_paths to give the LLM source files to document.',
      inputSchema,
    },
    async (args, ctx: ServerContext) => {
      const { target_path, instruction, context_paths, preview, append } = args;

      let corpusSection = '';
      if (context_paths && context_paths.length > 0) {
        const resolved = await expandGlobs(context_paths, 50);
        const fileContents: Array<{ path: string; content: string }> = [];
        for (const p of resolved) {
          const content = await readSafe(p);
          if (content !== null) fileContents.push({ path: p, content });
        }
        if (fileContents.length > 0) {
          corpusSection = `<corpus>\n${buildCorpus(fileContents)}\n</corpus>\n\n`;
        }
      }

      const userMessage = `${corpusSection}Target file: ${resolve(target_path)}\n\nInstruction: ${instruction}`;

      const progressToken = ctx.mcpReq._meta?.progressToken;
      let content: string;
      let model: string;

      if (progressToken !== undefined) {
        let progress = 0;
        ({ content, model } = await callLLMStream({
          system: SYSTEM_WRITE_DOCS,
          user: userMessage,
          onChunk: async (chunk) => {
            progress += chunk.length;
            await ctx.mcpReq.notify({
              method: 'notifications/progress',
              params: { progressToken, progress, message: chunk },
            });
          },
        }));
      } else {
        ({ content, model } = await callLLM({ system: SYSTEM_WRITE_DOCS, user: userMessage }));
      }

      if (!preview) {
        await writeWithMode(target_path, content, append ?? false);
        const label = (append ?? false) ? 'appended' : 'written';
        return {
          content: [{
            type: 'text',
            text: `Documentation ${label} to ${resolve(target_path)} (${content.length} chars) · model: ${model}\n\n${content}`,
          }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: `[preview — not written to disk]\n\n${content}\n\n---\n*model: ${model}*`,
        }],
      };
    },
  );
}
