# Changelog

## 0.3.0 - 2026-03-11

### Added
- Enter key sends message (Shift+Enter for newline)
- ArXiv paper title search in left panel
- Smart paper context injection (no more "cannot access PDF")
- Enhanced response readability with markdown rendering
- Interactive follow-up options based on AI-identified weak areas
- AI thinking animation (spinner)
- Animated AI mascot (Sherlock Holmes style) with mouse tracking
- Premium UI refinements

### Changed
- Improved paper excerpt selection based on user question keywords

---

## 0.2.0 - 2026-03-11

### Added
- Minimal local Web UI focused on the core workflow: left PDF, right conversation, top-only controls
- Automatic paper link parsing from the main chat input for arXiv / PDF-first testing

### Changed
- Promoted the Web UI from MVP experiment to the headline local experience
- Simplified the home screen aggressively: removed prompt / JSON / inspector clutter
- Tightened the product framing around real paper-reading guidance rather than a generic form-heavy tool
- Local CLI/Web usage continues to support automatic fallback to the machine's OpenClaw MiniMax profile

## 0.1.2 - 2026-03-11

### Added
- Anthropic-compatible model call path
- Automatic local fallback to the existing OpenClaw MiniMax profile when no explicit API settings are provided
- `--api-style <openai|anthropic>` CLI option
- Local Web UI MVP via `truth-tutor web`

### Changed
- Local CLI usage can now run directly against the machine's MiniMax setup without manual environment-variable export
- Added a browser-based local testing surface for faster paper-reading and alphaXiv iteration

## 0.1.1 - 2026-03-11

### Added
- Dedicated `paper-reading` mode for graduate-student / researcher paper reading workflows
- Dedicated `alphaxiv` mode for diagnosing why an alphaXiv explanation still did not land
- New CLI aliases: `paper-prompt`, `paper-ask`, `alphaxiv-prompt`, `alphaxiv-ask`
- New paper-specific input fields: `paperTitle`, `paperId`, `paperUrl`, `paperStage`, `confusionLocation`, `mainBlocker`
- New alphaXiv-specific input fields: `userQuestion`, `aiAnswer`, `userReaction`
- New examples: `paper-equations.json`, `alphaxiv-session.json`
- New docs: alphaXiv integration guide and launch copy
- More tests for modes and specialized prompt flows

### Changed
- Repositioned the project as a diagnosis-first coach with a dedicated paper-reading module
- Improved README hero copy, examples, and mode documentation
- Improved input validation for paper-reading and alphaXiv flows
- Added request timeout support for OpenAI-compatible API calls

## 0.1.0 - 2026-03-11

### Added
- Initial release
- Diagnosis-first CLI and prompt engine
- Strictness presets: `soft`, `direct`, `strict`, `brutal`
- OpenAI-compatible model call path
- OpenClaw / ClawHub skill package
