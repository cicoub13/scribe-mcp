export const SERVER_INSTRUCTIONS = `This server delegates routine file I/O to a cheaper LLM so the host model can spend its context on tasks that actually need its reasoning.

When to use scribe tools:
- bulk_read: when you would otherwise read ≥3 files or any file >400 lines and the task is summarisation, search, or explanation. Do not use it when you need precise line numbers for editing.
- write_docs: to generate documentation (READMEs, ARCHITECTURE.md, AGENTS.md, CLAUDE.md, JSDoc, module comments, any .md doc file).
- write_boilerplate: to generate repetitive code (tests, types, CRUD handlers, fixtures). Pass 1–2 reference_paths so output matches existing style.

NEVER delegate to scribe:
- Architectural decisions
- Debugging or root-cause analysis
- Safety-critical code (authentication, cryptography, permissions)
- Complex refactoring
- Edits that require precise line numbers

Per-tool input schemas are authoritative; this guidance applies across all three tools.`;
