#!/usr/bin/env node
import { McpServer, StdioServerTransport } from '@modelcontextprotocol/server';
import { registerBulkRead } from './tools/bulk-read.js';
import { registerWriteDocs } from './tools/write-docs.js';
import { registerWriteBoilerplate } from './tools/write-boilerplate.js';

const server = new McpServer(
  { name: 'scribe', version: '0.1.0' },
  {
    instructions: [
      'This server delegates routine file I/O to a cheaper LLM so the host model can spend its context on tasks that actually need its reasoning.',
      '',
      'When to use scribe tools:',
      '- bulk_read: when you would otherwise read ≥3 files or any file >400 lines and the task is summarisation, search, or explanation. Do not use it when you need precise line numbers for editing.',
      '- write_docs: to generate documentation (READMEs, JSDoc, module comments).',
      '- write_boilerplate: to generate repetitive code (tests, types, CRUD handlers, fixtures). Pass 1–2 reference_paths so output matches existing style.',
      '',
      'NEVER delegate to scribe:',
      '- Architectural decisions',
      '- Debugging or root-cause analysis',
      '- Safety-critical code (authentication, cryptography, permissions)',
      '- Complex refactoring',
      '- Edits that require precise line numbers',
      '',
      'Per-tool input schemas are authoritative; this guidance applies across all three tools.',
    ].join('\n'),
  },
);

registerBulkRead(server);
registerWriteDocs(server);
registerWriteBoilerplate(server);

const transport = new StdioServerTransport();
await server.connect(transport);
