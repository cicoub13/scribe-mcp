# Contributing

## Development

Requirements:
- Node.js 20+
- npm

Setup:

```bash
npm install
npm run build
```

Run locally:

```bash
export SCRIBE_API_KEY=your-key
npm run dev
```

## Pull requests

- Keep changes focused.
- Update documentation when behavior changes.
- Run `npm run lint && npm run build && npm test` before opening a pull request.
- Add or update tests for any changed behaviour.

## MCP SDK

The project uses `@modelcontextprotocol/server@2.0.0-alpha.2`, which is a pre-release SDK. Even minor version bumps may introduce breaking changes. Review the SDK changelog carefully before upgrading.

## Release process

- Update `package.json` version.
- Update `CHANGELOG.md`.
- Create and push a `v*` tag to trigger the release workflow, or publish manually from a trusted environment.
