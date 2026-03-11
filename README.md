# Truth Tutor

> An honest learning coach for people who need diagnosis, not comfort.

Truth Tutor is an open-source prompt engine and CLI for building AI study assistants that do three things well:

1. tell you **why** you did not understand something,
2. identify the **missing prerequisite knowledge**, and
3. prescribe a **concrete recovery plan**.

It is designed for paper reading, concept debugging, technical self-study, and skill building. The goal is not to sound kind. The goal is to help the user improve.

## Why this exists

A lot of AI study tools only do "let me explain this more simply." That helps a little, but it often hides the real problem:

- you are missing prerequisite math,
- your transformer/probability/optimization intuition is weak,
- you are reading details before understanding the problem setup,
- or your note-taking and verification loop is broken.

Truth Tutor is built to say the quiet part out loud.

## Core principles

- **Critique the work, not the person.**
- **No empty praise.** If the user is weak somewhere, say it clearly.
- **Diagnosis before explanation.** First find the gap. Then teach.
- **Action beats vibes.** Every critique should end with a repair plan.
- **Strictness is configurable.** Tone can range from direct to brutal, but never abusive.

## What it does

- Generates structured prompts for a "truth-first" tutor agent
- Supports configurable strictness levels: `soft`, `direct`, `strict`, `brutal`
- Produces a fixed response contract so outputs stay actionable
- Can call any OpenAI-compatible chat API when credentials are available
- Works especially well for:
  - paper reading
  - technical interview prep
  - concept debugging
  - study planning
  - learning gap diagnosis

## Response contract

Truth Tutor asks the model to answer with these sections:

1. **Reality Check** — what is actually going wrong
2. **Root Cause** — why the user is stuck
3. **Missing Foundations** — prerequisite topics that are weak or absent
4. **Stop Doing** — behaviors wasting time
5. **Recovery Plan** — concrete next steps by priority
6. **Practice Drills** — short exercises to close the gap
7. **Win Condition** — how the user can verify improvement

## Quick start

### 1) Generate a prompt pack

```bash
node ./bin/truth-tutor.mjs prompt \
  --topic "Diffusion models" \
  --material-title "High-Resolution Image Synthesis with Latent Diffusion Models" \
  --material-type paper \
  --confusion "I can follow the architecture section, but I don't understand why latent space helps and where the compression tradeoff comes from." \
  --understanding "I know basic CNNs and VAEs, but my probability background is weak." \
  --strictness strict
```

### 2) Call a model directly

```bash
export OPENAI_API_KEY=your_key
export OPENAI_MODEL=gpt-4.1-mini

node ./bin/truth-tutor.mjs ask \
  --topic "Transformer attention" \
  --confusion "I can recite QKV but still don't feel why attention works." \
  --understanding "I know matrix multiplication and basic linear algebra." \
  --strictness direct
```

You can also point it at any OpenAI-compatible endpoint with:

```bash
export OPENAI_BASE_URL=https://api.openai.com/v1
```

## Input model

Truth Tutor works best when you provide:

- `topic`
- `materialTitle` or `materialType`
- `confusion`
- `currentUnderstanding`
- `goals`
- `studyLevel`
- `weeklyHours`
- `strictness`

If context is incomplete, the prompt explicitly instructs the model to say what is missing instead of hallucinating a diagnosis.

## More examples

See the JSON examples in `examples/`:

- `paper-reading.json`
- `concept-debugging.json`
- `study-planning.json`

## Library usage

```js
import { buildPrompt } from 'truth-tutor';

const result = buildPrompt({
  topic: 'Attention',
  confusion: 'I can repeat QKV but I cannot explain why attention works.',
  currentUnderstanding: 'I know linear algebra.',
  strictness: 'direct',
  language: 'Chinese',
});

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
├── examples/
├── src/
├── test/
└── skill/
    └── truth-tutor/
```

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
- [ ] Web UI
- [ ] AlphaArxiv browser helper / integration
- [ ] Gap taxonomy expansion by subject (math / systems / ML / economics / writing)
- [ ] Longitudinal learner memory

## License

MIT
