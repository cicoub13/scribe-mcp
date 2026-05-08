# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning while it remains practical during early releases.

## [0.3.0] - 2026-05-08

### Added

- Unit test suite covering `config`, `files`, `llm`, and `prompts` modules (vitest).
- ESLint and Prettier configuration for consistent code style.
- Smoke test script (`scripts/smoke.mjs`) for end-to-end validation.
- `.nvmrc` to pin the Node.js version.

### Changed

- Optimized LLM request handling in `src/llm.ts`.
- Refactored file utilities in `src/utils/files.ts` for better performance.
- Updated CI workflow to run lint and tests on every push.

## [0.2.0] - 2026-05-06

### Added

- Streaming support for all three MCP tools (`bulk_read`, `write_docs`, `write_boilerplate`).
- Server-side delegation instructions: the MCP server now exposes its guidance (what to delegate and what not to) via the `instructions` field on `McpServer`. Hosts that surface server instructions (Claude Code with `alwaysLoad: true`) receive this automatically, without requiring users to add a CLAUDE.md snippet.

### Fixed

- Improved trigger efficiency for scribe tool invocations.

## [0.1.0] - 2026-05-03

### Added

- Initial public release of the `scribe-mcp` CLI and MCP server.
- `bulk_read`, `write_docs`, and `write_boilerplate` MCP tools.
- OpenAI-compatible provider configuration via environment variables.
