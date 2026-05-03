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
- Run `npm run build` before opening a pull request.
- Add or update tests when the project gains a test harness.

## Release process

- Update `package.json` version.
- Update `CHANGELOG.md`.
- Create and push a `v*` tag to trigger the release workflow, or publish manually from a trusted environment.
