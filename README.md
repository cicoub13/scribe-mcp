# scribe-mcp

An MCP server that delegates bulk file reading and doc/boilerplate writing from Claude to a cheaper, OpenAI-compatible model — saving 60–90 % of tokens on tasks that don't require frontier-level reasoning.

Inspired by the [`deepseek-worker`](https://github.com) pattern: Claude sees `mcp__scribe__bulk_read` like any other MCP tool and routes heavy reading/writing tasks to a cheaper model automatically.

---

## Install

### Claude Code

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

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

---

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

| Parameter | Type | Default | Description |
|---|---|---|---|
| `target_path` | `string` | required | Output file path |
| `spec` | `string` | required | Description of what to generate |
| `reference_paths` | `string[]` | — | Existing files for style reference |
| `preview` | `boolean` | `false` | Return content without writing |
| `append` | `boolean` | `false` | Append instead of overwrite |

---

## CLAUDE.md snippet

Add this to your project's `CLAUDE.md` (or your global `~/.claude/CLAUDE.md`) to prime Claude to delegate at the right moments:

```markdown
## scribe-mcp — when to delegate

Use the `scribe` MCP tools instead of reading/writing yourself when:

- **`mcp__scribe__bulk_read`**: you are about to read ≥3 files OR a file >400 lines,
  and the task is "summarise / explain / find X in these files".
  Do NOT use if you need precise line numbers for editing.

- **`mcp__scribe__write_docs`**: generating a README, docstrings, JSDoc,
  or module-level comments. Writes directly to disk by default;
  pass `preview: true` to inspect before writing yourself.

- **`mcp__scribe__write_boilerplate`**: test stubs, type definitions, CRUD handlers,
  fixtures, repetitive code from an existing pattern.
  Pass 1–2 `reference_paths` so the style matches.
  Writes directly to disk by default; pass `preview: true` to inspect first.

NEVER delegate: architectural decisions, debugging, safety-critical code,
complex refactoring, or edits that require precise line numbers.
```

---

## Develop

```bash
git clone https://github.com/your-org/scribe-mcp
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
