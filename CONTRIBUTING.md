# Contributing to Truth Tutor

Thank you for your interest in contributing! This guide will help you get started quickly.

## Quick Start

```bash
git clone https://github.com/SII-k7/truth-tutor.git
cd truth-tutor
npm install
npm test        # Run tests
npm run lint    # Check code style
```

## Project Structure

```
truth-tutor/
├── src/
│   ├── *.mjs              # Core: input.mjs, modes.mjs, build-prompt.mjs, etc.
│   ├── web-server.mjs     # Web UI server
│   ├── modules/           # Diagnosis modules (general, paper-reading, alphaxiv)
│   └── web-ui/            # Frontend assets
├── test/                  # Unit tests
├── skill/truth-tutor/     # OpenClaw skill package
└── examples/              # Example JSON inputs
```

## Adding New Features

### Adding a new diagnosis mode

1. Create module in `src/modules/`
2. Add to `modes.mjs` exports
3. Add validation in `input.mjs`
4. Add tests in `test/`

### Adding drill templates

Edit `src/web-server.mjs` → `drills/library` section.

### Adding learning styles

Edit `src/learning-profile.mjs` → `detectLearningStyle()` function.

## Code Standards

- **ES Modules**: Use `.mjs` extension
- **Tests**: All new features need tests in `test/`
- **Validation**: Use `input.mjs` validation functions
- **Errors**: Throw descriptive errors with fix suggestions

## Pull Request Process

1. Create feature branch: `git checkout -b feature/name`
2. Make changes + add tests
3. Run `npm test` (must pass)
4. Update `CHANGELOG.md` with your changes
5. Commit and push
6. Open PR with description

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Commit: `git commit -am 'v1.x.x'`
- [ ] Tag: `git tag v1.x.x`
- [ ] Push: `git push origin main --tags`
- [ ] Publish to npm: `npm publish`
- [ ] Publish to ClawHub: `clawhub publish ./skill/truth-tutor --version 1.x.x`

## Questions?

Open an issue with the `question` label.
