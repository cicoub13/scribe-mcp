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
