# scribe-mcp

An MCP server that delegates bulk file reading and doc/boilerplate writing from Claude to a cheaper, OpenAI-compatible model — saving 60–90 % of tokens on tasks that don't require frontier-level reasoning.

Claude sees `mcp__scribe__bulk_read` like any other MCP tool and routes heavy reading/writing tasks to a cheaper model automatically.

---

## Table of Contents

- [Install](#install)
  - [Claude Code (CLI)](#claude-code-cli)
  - [Claude Code (manual)](#claude-code-manual)
  - [Tool search and `alwaysLoad`](#tool-search-and-alwaysload)
- [Configuration](#configuration)
- [Switching providers](#switching-providers)
- [Tools](#tools)
  - [`mcp__scribe__bulk_read`](#mcp__scribe__bulk_read)
  - [`mcp__scribe__write_docs`](#mcp__scribe__write_docs)
  - [`mcp__scribe__write_boilerplate`](#mcp__scribe__write_boilerplate)
- [Benchmark](#benchmark)
- [Develop](#develop)
- [License](#license)

---

## Install

### Claude Code (CLI)

**Niveau projet** (enregistré dans `.mcp.json`, partagé avec l'équipe) :

```bash
claude mcp add -s project -e SCRIBE_API_KEY=your-api-key-here scribe -- npx -y scribe-mcp
```

**Niveau global** (enregistré dans `~/.claude.json`, disponible dans tous vos projets) :

```bash
claude mcp add -s user -e SCRIBE_API_KEY=your-api-key-here scribe -- npx -y scribe-mcp
```

To pass additional variables, repeat the `-e` flag:

```bash
claude mcp add -s user \
  -e SCRIBE_API_KEY=your-api-key-here \
  -e SCRIBE_BASE_URL=https://openrouter.ai/api/v1 \
  -e SCRIBE_MODEL=deepseek/deepseek-chat-v3-0324 \
  scribe -- npx -y scribe-mcp
```

### Claude Code (manual)

Add to `~/.claude.json`:

```jsonc
{
  "mcpServers": {
    "scribe": {
      "command": "npx",
      "args": ["-y", "scribe-mcp"],
      "env": {
        "SCRIBE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Tool search and `alwaysLoad`

By default, Claude Code defers MCP tool schemas (only loading them on demand via a search step). With many MCP servers active this saves context, but it also means Claude does not see scribe's tool descriptions at session start and may default to its built-in `Read` / `Explore` tools instead.

To make scribe always visible in the tool catalog, set `alwaysLoad: true` on the server entry in `.mcp.json`:

```jsonc
{
  "mcpServers": {
    "scribe": {
      "command": "npx",
      "args": ["-y", "scribe-mcp"],
      "env": { "SCRIBE_API_KEY": "${SCRIBE_API_KEY}" },
      "alwaysLoad": true
    }
  }
}
```

Requires Claude Code v2.1.121 or later. See the [Claude Code MCP docs](https://code.claude.com/docs/en/mcp#scale-with-mcp-tool-search) for the full mechanism.

The server already ships with built-in usage instructions covering when to delegate and when not to (architectural decisions, debugging, safety-critical code, precise-line-number edits). A separate `CLAUDE.md` snippet is only needed if you want project-specific overrides.

---

## Configuration

All configuration is via environment variables (set in the `env` block above):

| Variable | Default | Description |
|---|---|---|
| `SCRIBE_API_KEY` | — **required** | API key for the LLM provider |
| `SCRIBE_BASE_URL` | `https://api.minimax.io/v1` | OpenAI-compatible endpoint |
| `SCRIBE_MODEL` | `MiniMax-Text-01` | Model identifier |
| `SCRIBE_MAX_TOKENS` | `8192` | Max tokens per response |
| `SCRIBE_REASONING` | `false` | Enable reasoning/thinking mode (off by default) |
| `SCRIBE_WORKSPACE_ROOT` | — optional | Restrict file access to this directory |
| `SCRIBE_LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

## Switching providers

Any OpenAI-compatible endpoint works. Just change `SCRIBE_BASE_URL` and `SCRIBE_MODEL`:

**OpenRouter (DeepSeek V3):**
```jsonc
"env": {
  "SCRIBE_API_KEY": "sk-or-...",
  "SCRIBE_BASE_URL": "https://openrouter.ai/api/v1",
  "SCRIBE_MODEL": "deepseek/deepseek-chat-v3-0324"
}
```

**DeepSeek direct:**
```jsonc
"env": {
  "SCRIBE_API_KEY": "sk-...",
  "SCRIBE_BASE_URL": "https://api.deepseek.com/v1",
  "SCRIBE_MODEL": "deepseek-chat"
}
```

**Groq (Llama 3.3 70B):**
```jsonc
"env": {
  "SCRIBE_API_KEY": "gsk_...",
  "SCRIBE_BASE_URL": "https://api.groq.com/openai/v1",
  "SCRIBE_MODEL": "llama-3.3-70b-versatile"
}
```

---

## Tools

### `mcp__scribe__bulk_read`

Reads multiple files or glob patterns and returns a targeted summary or answer.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `paths` | `string[]` | required | File paths or glob patterns |
| `question` | `string` | required | What to extract or summarise |
| `max_files` | `number` | `50` | Maximum files to read |

**When to use:** reading ≥ 3 files, or any file > 400 lines, where the task is summarisation, search, or explanation — not editing.

---

### `mcp__scribe__write_docs`

Generates documentation (README, JSDoc, module comments, etc.) and writes it to disk.

**When to use:** generating documentation that doesn't require frontier-level reasoning (READMEs, JSDoc, module comments).

| Parameter | Type | Default | Description |
|---|---|---|---|
| `target_path` | `string` | required | Output file path |
| `instruction` | `string` | required | What to generate |
| `context_paths` | `string[]` | — | Source files to read for context |
| `preview` | `boolean` | `false` | Return content without writing |
| `append` | `boolean` | `false` | Append instead of overwrite |

---

### `mcp__scribe__write_boilerplate`

Generates boilerplate code (tests, types, CRUD, fixtures) matching your project's style.

**When to use:** repetitive code (tests, types, CRUD handlers, fixtures). Pass 1–2 `reference_paths` so output matches existing style.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `target_path` | `string` | required | Output file path |
| `spec` | `string` | required | Description of what to generate |
| `reference_paths` | `string[]` | — | Existing files for style reference |
| `preview` | `boolean` | `false` | Return content without writing |
| `append` | `boolean` | `false` | Append instead of overwrite |

---

## Benchmark

Scribe MCP was benchmarked against Claude Code alone and [Serena](https://github.com/oraios/serena) on a real summarisation task. Key findings:

- **−41 % output tokens** vs Claude Only
- **−13 % total cost** vs Claude Only, with no setup required
- Serena achieves the lowest cost overall, but requires a per-repository onboarding step

→ See the [full benchmark results](./BENCHMARK.md) for token-by-token details.

---

## Develop

```bash
git clone https://github.com/cicoub13/scribe-mcp
cd scribe-mcp
npm install
npm run build

# Run locally (set env vars first)
export SCRIBE_API_KEY=your-key
node dist/index.js
```

Test with [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## License

MIT
