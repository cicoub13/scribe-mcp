#!/usr/bin/env node
// Smoke test: spawn the built MCP server, send a tools/list request, verify all 3 tools are present.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BINARY = join(ROOT, 'dist', 'index.js');

const EXPECTED_TOOLS = ['bulk_read', 'write_docs', 'write_boilerplate'];

const initRequest = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '0' },
  },
}) + '\n';

const listRequest = JSON.stringify({
  jsonrpc: '2.0', id: 2, method: 'tools/list', params: {},
}) + '\n';

const proc = spawn('node', [BINARY], {
  env: { ...process.env, SCRIBE_API_KEY: 'smoke-test-key' },
  stdio: ['pipe', 'pipe', 'inherit'],
});

let output = '';
let initDone = false;

proc.stdout.on('data', (chunk) => {
  output += chunk.toString();
  const lines = output.split('\n');
  output = lines.pop() ?? '';

  for (const line of lines) {
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }

    if (msg.id === 1 && !initDone) {
      initDone = true;
      proc.stdin.write(listRequest);
    } else if (msg.id === 2) {
      const names = (msg.result?.tools ?? []).map((t) => t.name);
      const missing = EXPECTED_TOOLS.filter((n) => !names.includes(n));
      if (missing.length > 0) {
        console.error(`Smoke test FAILED — missing tools: ${missing.join(', ')}`);
        proc.kill();
        process.exit(1);
      }
      console.log(`Smoke test PASSED — tools: ${names.join(', ')}`);
      proc.kill();
      process.exit(0);
    }
  }
});

proc.on('error', (err) => { console.error('Failed to start server:', err.message); process.exit(1); });
proc.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(1);
  }
});

setTimeout(() => {
  console.error('Smoke test TIMED OUT');
  proc.kill();
  process.exit(1);
}, 10_000);

proc.stdin.write(initRequest);
