# Truth Tutor

<a href="https://github.com/SII-k7/truth-tutor/releases"><img src="https://img.shields.io/github/v/release/SII-k7/truth-tutor?include_prereleases&label=version&style=flat-square" alt="Version"></a>
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License: MIT"></a>
<a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E=20-blue.svg?style=flat-square" alt="Node.js >= 20"></a>

> A diagnosis-first learning coach for people who do not need comfort — especially graduate students and researchers stuck on papers.

Truth Tutor is an open-source prompt engine, CLI, and OpenClaw skill for one specific job:

1. tell you **why** you did not understand something,
2. identify the **missing prerequisite knowledge**, and
3. prescribe a **concrete recovery plan**.

Most AI study tools try to explain things more simply. Truth Tutor is built to do something harsher and more useful: tell you what your actual bottleneck is.

## Quick Start

```bash
# Install
npm install -g truth-tutor

# Start Web UI
truth-tutor web

# Or use with npx
npx truth-tutor web
```

## Table of Contents

- [Features](#features)
- [Why This Exists](#why-this-exists)
- [Core Principles](#core-principles)
- [Modes](#modes)
- [Installation](#installation)
- [Usage](#usage)
- [Web UI](#web-ui)
- [Examples](#examples)
- [Strictness Levels](#strictness-levels)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Diagnosis-first learning coach** - Tell you WHY you don't understand, not just explain it more simply
- **Evidence-based output** - Every diagnosis includes structured citations from source materials
- **Personalized learning profile** - Tracks recurring gaps across sessions for smarter diagnoses
- **Verification drills** - Interactive practice tasks with pass/fail criteria
- **Three operating modes:**
  - General: Concepts, interview prep, skill gaps
  - Paper-reading: Research papers with section-by-section guidance
  - alphaXiv recovery: When you already asked alphaXiv and still don't get it
- **Four strictness levels:** soft, direct, strict, brutal
- **Full-stack Web UI** - Clean split-view interface
- **CLI tool** - Powerful command-line interface
- **Library API** - Import as a Node.js module

## What changed in v0.2.0

Truth Tutor now has a **minimal paper-reading Web UI** designed around the actual workflow:

- **left side:** the paper PDF
- **right side:** the conversation
- **top controls only:** feature mode + conversation style

No prompt inspector. No JSON pane. No form-heavy clutter on the home screen.

Truth Tutor is also split into **three operating modes**:

- **general** — diagnosis-first learning coach for concepts, interview prep, self-study, and skill building
- **paper-reading** — a dedicated module for research paper reading, with section-by-section reread order and prerequisite ladders
- **alphaxiv** — a recovery mode for when you already asked alphaXiv and still do not actually get the paper

If you are a grad student or PhD student, the paper-reading module is the point.

## Why this exists

A lot of AI study tools only do "let me explain this more simply." That helps a little, but it often hides the real problem:

- you are missing prerequisite math,
- your transformer / probability / optimization intuition is weak,
- you are reading details before understanding the problem setup,
- you are skimming derivations you are not ready for,
- or your note-taking and verification loop is broken.

Truth Tutor is built to say the quiet part out loud.

## Core principles

- **Critique the work, not the person.**
- **No empty praise.** If the user is weak somewhere, say it clearly.
- **Diagnosis before explanation.** First find the gap. Then teach.
- **Paper reading deserves its own module.** The failure modes are different and need specialized prompts.
- **Action beats vibes.** Every critique should end with a repair plan.
- **Strictness is configurable.** Tone can range from direct to brutal, but never abusive.

## Modes

### 1) general

Use this when the user wants a blunt diagnosis of a concept, topic, skill gap, study plan, or interview-prep weakness.

### 2) paper-reading

Use this when the user is reading a paper and needs more than simplification.

This mode is specialized for:
- problem framing
- notation bottlenecks
- architecture intuition gaps
- objective / derivation confusion
- experiment / ablation interpretation
- reread ordering
- prerequisite ladders for ML / systems / math papers

### 3) alphaxiv

Use this when the user already asked alphaXiv and still feels stuck.

This mode diagnoses:
- whether the problem is weak foundations,
- whether the question asked to alphaXiv was too vague,
- whether the answer was too abstract,
- and what sharper follow-up question should be asked next.

## Response contracts

### General mode

1. Reality Check
2. Root Cause
3. Missing Foundations
4. Stop Doing
5. Recovery Plan
6. Practice Drills
7. Win Condition

### Paper-reading mode

1. Reality Check
2. Paper in Plain Terms
3. Why You Are Stuck Here
4. Missing Foundations
5. Section-by-Section Reread Order
6. Paper Recovery Plan
7. Verification Drills

### alphaXiv mode

1. Reality Check
2. What alphaXiv Already Gave You
3. Why It Still Did Not Land
4. Missing Foundations
5. Better Next Question for alphaXiv
6. Recovery Plan
7. Verification Drills

## Quick start

### 1) General prompt pack

```bash
node ./bin/truth-tutor.mjs prompt \
  --topic "Transformer attention" \
  --confusion "I can recite QKV but still don't feel why attention works." \
  --understanding "I know matrix multiplication and linear algebra." \
  --strictness direct
```

### 2) Dedicated paper-reading prompt pack

```bash
node ./bin/truth-tutor.mjs paper-prompt \
  --paper-title "High-Resolution Image Synthesis with Latent Diffusion Models" \
  --paper-id "arXiv:2112.10752" \
  --paper-stage method \
  --confusion-location "latent space design and compression tradeoff" \
  --confusion "I still don't understand why latent space helps." \
  --understanding "I know CNNs and a little VAE intuition." \
  --strictness strict
```

### 3) alphaXiv recovery flow

```bash
node ./bin/truth-tutor.mjs alphaxiv-prompt \
  --paper-title "Attention Is All You Need" \
  --paper-stage method \
  --user-question "Why is multi-head attention better than one large head?" \
  --ai-answer "It attends to different representation subspaces." \
  --user-reaction "That still feels like a slogan, not a mechanism." \
  --understanding "I know QKV and softmax." \
  --strictness direct
```

### 4) Call a model directly

#### OpenAI-compatible

```bash
export OPENAI_API_KEY=your_key
export OPENAI_MODEL=gpt-4.1-mini

node ./bin/truth-tutor.mjs paper-ask --input ./examples/paper-reading.json
```

You can also point it at any OpenAI-compatible endpoint with:

```bash
export OPENAI_BASE_URL=https://api.openai.com/v1
```

#### Anthropic-compatible / local MiniMax

Truth Tutor now also supports Anthropic-compatible endpoints.

If you run it on the same machine as OpenClaw and you already have a local `minimax-cn` profile configured there, `truth-tutor *-ask` will automatically fall back to that MiniMax profile when no explicit API settings are provided.

You can also set it explicitly:

```bash
export TRUTH_TUTOR_API_STYLE=anthropic
export ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
export ANTHROPIC_API_KEY=your_key
export ANTHROPIC_MODEL=MiniMax-M2.5

truth-tutor paper-ask --input ./examples/paper-reading.json
```

## Input model

Truth Tutor works best when you provide:

- `mode`
- `topic` or `paperTitle`
- `confusion`
- `currentUnderstanding`
- `goals`
- `studyLevel`
- `strictness`

Paper-reading mode additionally benefits from:

- `paperId`
- `paperUrl`
- `paperStage`
- `confusionLocation`
- `mainBlocker`

alphaXiv mode additionally benefits from:

- `userQuestion`
- `aiAnswer`
- `userReaction`

For model calls, Truth Tutor supports both:

- OpenAI-compatible chat completions
- Anthropic-compatible messages APIs

If context is incomplete, the prompt explicitly instructs the model to say what is missing instead of hallucinating a diagnosis.

## Web UI

```bash
truth-tutor web
```

This launches a local browser-based interface designed around a simple rule: **less is more**.

- left-side PDF workspace
- right-side conversation pane
- top-only controls for feature mode and conversation style
- direct model calls against your local default setup

## Examples

See the JSON examples in `examples/`:

- `paper-reading.json`
- `paper-equations.json`
- `alphaxiv-session.json`
- `concept-debugging.json`
- `study-planning.json`

## Library usage

```js
import { buildPrompt } from 'truth-tutor';

const result = buildPrompt({
  mode: 'paper-reading',
  paperTitle: 'Attention Is All You Need',
  paperStage: 'method',
  confusion: 'I still do not get why multi-head attention helps.',
  currentUnderstanding: 'I know QKV and softmax.',
  strictness: 'direct',
  language: 'Chinese',
});

console.log(result.mode);
console.log(result.systemPrompt);
console.log(result.userPrompt);
```

## Strictness levels

- **soft** — low sugar, still calm
- **direct** — blunt and efficient
- **strict** — sharp, urgent, corrective
- **brutal** — severe reality check on the work quality, never identity-level abuse

"Brutal" means the agent is allowed to say things like:

- "You are skipping prerequisites and paying the price now."
- "You are trying to consume graduate-level material with undergraduate-level footing in this topic."
- "Stop pretending more rereads will fix a missing foundation."

It does **not** mean slurs, humiliation, self-harm encouragement, or attacks on personal worth.

## Safety boundary

Truth Tutor is intentionally harsh on bad reasoning, weak foundations, fake understanding, and inefficient study habits.

It is **not** for:

- abuse roleplay
- humiliation for entertainment
- mental health crisis handling
- attacks on identity, appearance, race, gender, or worth
- coercive or degrading language aimed at the user as a person

The system prompt includes guardrails to keep critique attached to the work and the learning process.

## Repo layout

```text
truth-tutor/
├── bin/
├── docs/
├── examples/
├── src/
│   └── modules/
├── test/
└── skill/
    └── truth-tutor/
```

## alphaXiv integration notes

There is no fragile browser automation in the current MVP. The first integration path is workflow-level:

1. ask alphaXiv,
2. copy the question + answer + what still feels unclear,
3. run Truth Tutor in `alphaxiv` mode,
4. get a sharper diagnosis plus better next questions.

This is the fastest realistic integration path and matches real paper-reading behavior.

More detail: `docs/alphaxiv-integration.md`

## Skill packaging

This repo also contains an OpenClaw / ClawHub skill version in:

```text
skill/truth-tutor
```

Package it with:

```bash
python3 /opt/homebrew/lib/node_modules/openclaw/skills/skill-creator/scripts/package_skill.py ./skill/truth-tutor
```

## Roadmap

- [x] Prompt builder
- [x] OpenAI-compatible CLI call path
- [x] Strictness presets
- [x] OpenClaw skill version
- [x] Dedicated paper-reading module
- [x] alphaXiv recovery mode
- [x] Web UI
- [ ] alphaXiv browser helper / extension bridge
- [ ] Subject-specific gap taxonomies (math / systems / ML / economics / writing)
- [ ] Longitudinal learner memory

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Security

If you discover a security vulnerability, please see our [Security Policy](SECURITY.md).

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Release / launch assets

- `docs/launch-copy.md`
- `CHANGELOG.md`
- `docs/alphaxiv-integration.md`
- `FAQ.md`
- `DEVELOPMENT.md`

## License

MIT

## Links

- [GitHub Repository](https://github.com/SII-k7/truth-tutor)
- [ClawHub Skill](https://clawhub.com/skills/truth-tutor)
- [Issues](https://github.com/SII-k7/truth-tutor/issues)
