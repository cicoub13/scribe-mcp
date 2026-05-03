import { z } from 'zod';
import { resolve } from 'node:path';
import type { McpServer, ServerContext } from '@modelcontextprotocol/server';
import { callLLM, callLLMStream } from '../llm.js';
import { expandGlobs, readSafe, writeWithMode } from '../utils/files.js';
import { buildCorpus, SYSTEM_WRITE_BOILERPLATE } from '../utils/prompts.js';

const inputSchema = z.object({
  target_path: z.string().describe('File path where the boilerplate will be written'),
  spec: z.string().describe('Description of the boilerplate to generate (e.g. "unit tests for the User class")'),
  reference_paths: z.array(z.string()).optional().describe('Existing files to use as style/pattern reference'),
  preview: z.boolean().optional().default(false).describe('If true, return the generated content without writing to disk'),
  append: z.boolean().optional().default(false).describe('If true, append to the file instead of overwriting'),
});

export function registerWriteBoilerplate(server: McpServer): void {
  server.registerTool(
    'write_boilerplate',
    {
      title: 'Write Boilerplate',
      description:
        'Generate boilerplate code (tests, types, CRUD handlers, fixtures, etc.) using a cheaper LLM and write it to disk. ' +
        'Pass reference_paths so the LLM can match your project\'s style. ' +
        'Pass preview: true to inspect the result before writing.',
      inputSchema,
    },
    async (args, ctx: ServerContext) => {
      const { target_path, spec, reference_paths, preview, append } = args;

      let corpusSection = '';
      if (reference_paths && reference_paths.length > 0) {
        const resolved = await expandGlobs(reference_paths, 10);
        const fileContents: Array<{ path: string; content: string }> = [];
        for (const p of resolved) {
          const content = await readSafe(p);
          if (content !== null) fileContents.push({ path: p, content });
        }
        if (fileContents.length > 0) {
          corpusSection = `<reference_files>\n${buildCorpus(fileContents)}\n</reference_files>\n\n`;
        }
      }

      const userMessage = `${corpusSection}Target file: ${resolve(target_path)}\n\nSpec: ${spec}`;

      const progressToken = ctx.mcpReq._meta?.progressToken;
      let content: string;
      let model: string;

      if (progressToken !== undefined) {
        let progress = 0;
        ({ content, model } = await callLLMStream({
          system: SYSTEM_WRITE_BOILERPLATE,
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
        ({ content, model } = await callLLM({ system: SYSTEM_WRITE_BOILERPLATE, user: userMessage }));
      }

      if (!preview) {
        await writeWithMode(target_path, content, append ?? false);
        const label = (append ?? false) ? 'appended' : 'written';
        return {
          content: [{
            type: 'text',
            text: `Boilerplate ${label} to ${resolve(target_path)} (${content.length} chars) · model: ${model}\n\n${content}`,
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
