#!/usr/bin/env node
import { McpServer, StdioServerTransport } from '@modelcontextprotocol/server';
import { registerBulkRead } from './tools/bulk-read.js';
import { registerWriteDocs } from './tools/write-docs.js';
import { registerWriteBoilerplate } from './tools/write-boilerplate.js';
import { SERVER_INSTRUCTIONS } from './instructions.js';

const server = new McpServer(
  { name: 'scribe', version: '0.2.0' },
  { instructions: SERVER_INSTRUCTIONS },
);

registerBulkRead(server);
registerWriteDocs(server);
registerWriteBoilerplate(server);

const transport = new StdioServerTransport();
await server.connect(transport);
