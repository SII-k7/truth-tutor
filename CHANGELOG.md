# Changelog

## 2.0.0-beta - 2026-03-13

### Added - Core Differentiation Features
- **Knowledge Gap Analyzer** (`gap-analyzer.mjs`)
  - Pattern recognition for learning gaps
  - Learning style detection (visual-conceptual, hands-on-practice, bottom-up-learner, etc.)
  - Automatic recommendations generation
  
- **Adaptive Drill System** (`adaptive-drills.mjs`)
  - Self-adjusting difficulty based on completion rate
  - Drill effectiveness tracking
  - Personalized drill guidance based on learning style
  
- **Learning Path Recommender** (`learning-path-recommender.mjs`)
  - Personalized learning path generation
  - Resource recommendations
  - Progress tracking and estimation
  
- **Enhanced Learning Profile**
  - Integrated gap analysis
  - Progress metrics calculation
  - Dashboard data generation
  - Learning style detection

### Changed
- Version bump to 2.0.0-beta (major release with new core features)
- All new features are backward compatible

---

## 1.0.5 - 2026-03-13

### Added
- Added Dockerfile for containerized deployment
- Added .dockerignore for cleaner Docker builds
- Added more badges to README (test, npm, discord)
- Added Docker section to README with usage examples
- Updated CHANGELOG with complete version history
- Fixed version numbers to be consistent

---

## 1.0.3 - 2026-03-13

### Added
- Added responsive design to Web UI (mobile/tablet/desktop breakpoints)
- Added accessibility improvements (focus states, reduced motion, print styles)
- Added .npmignore for better npm publishing
- Added .env.example for environment configuration
- Added examples/README.md with usage instructions

### Fixed
- Enhanced drill templates with 2 new types (analogy, counterfactual)

---

## 1.0.2 - 2026-03-13

### Added
- Added VERSION export to index.mjs
- Added responsive design to Web UI

---

## 1.0.1 - 2026-03-13

### Fixed
- Input field clearing bug fix

---

## 1.0.0 - 2026-03-13

### Added
- **Diagnosis-first learning coach** - Tell you WHY you don't understand, not just explain it more simply
- **Evidence-based output** - Every diagnosis includes "Evidence: Section / Paragraph / Quote" structure
- **Personalized learning profile** - Tracks recurring gaps across sessions for smarter future diagnoses
- **Verification drills** - Interactive checkboxes for practice tasks with pass/fail criteria
- **Strictness levels** - Four tone options: soft, direct, strict, brutal
- **Three operating modes:**
  - General: Concepts, interview prep, skill gaps
  - Paper-reading: Research papers with section-by-section reread order
  - alphaXiv recovery: When you already asked alphaXiv and still don't get it
- **Full-stack Web UI** - Clean split-view: paper on left, conversation on right
- **Learning profile persistence** - Saves user gaps and session history locally
- **Drill tracker** - Tracks completed/incomplete drills across sessions

### Changed
- Rebranded as a complete open-source product, not just a prompt tool
- Optimized response contracts with structured output formats
- Enhanced evidence extraction and citation system

### Fixed
- Input field now clears immediately after sending (not after response)
- UI polish and bug fixes

---

## 0.3.5 - 2026-03-11

### Added
- Wireframe mascot with SVG line art (simple, clean)
- Fuzzy search with dropdown results (auto-suggest as you type)
- Bug fixes and UI polish

---

## 0.3.1 - 2026-03-11

### Fixed
- Mascot redesign: 3D head with glasses, full head rotation tracking mouse
- Text input clears after send
- Text input height reduced, chat window expanded
- Search box moved to top bar, removed default thumbnail

---

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
