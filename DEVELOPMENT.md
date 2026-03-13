# Development Guide

This guide provides information for developers working on Truth Tutor.

## Architecture Overview

Truth Tutor is built as a modular system with three main components:

### 1. Core Prompt Engine (`src/modules/`)

- **general.mjs** - General learning diagnosis
- **paper-reading.mjs** - Research paper reading guidance
- **alphaxiv.mjs** - alphaXiv recovery mode
- **shared.mjs** - Shared utilities and templates

Each module exports a function that builds a system prompt and user prompt based on input parameters.

### 2. CLI Interface (`bin/truth-tutor.mjs`)

Command-line interface with the following commands:

- `prompt` - Build a prompt (no model call)
- `paper-prompt` - Build a paper-reading prompt
- `alphaxiv-prompt` - Build an alphaXiv prompt
- `ask` - Call a model with a prompt
- `paper-ask` - Call a model with a paper-reading prompt
- `alphaxiv-ask` - Call a model with an alphaXiv prompt
- `web` - Start the Web UI server

### 3. Web UI (`src/web-ui/`)

- **index.html** - Main interface
- **app.js** - Client-side logic
- **styles.css** - Styling
- **library.html** - Drill library
- **compare.html** - Comparison view

## Key Concepts

### Strictness Levels

- **soft** - Low sugar, still calm
- **direct** - Blunt and efficient
- **strict** - Sharp, urgent, corrective
- **brutal** - Severe reality check (never abusive)

### Response Contracts

Each mode has a specific response structure:

**General Mode:**
1. Reality Check
2. Root Cause
3. Missing Foundations
4. Stop Doing
5. Recovery Plan
6. Practice Drills
7. Win Condition

**Paper-Reading Mode:**
1. Reality Check
2. Paper in Plain Terms
3. Why You Are Stuck Here
4. Missing Foundations
5. Section-by-Section Reread Order
6. Paper Recovery Plan
7. Verification Drills

**alphaXiv Mode:**
1. Reality Check
2. What alphaXiv Already Gave You
3. Why It Still Did Not Land
4. Missing Foundations
5. Better Next Question for alphaXiv
6. Recovery Plan
7. Verification Drills

## Development Workflow

### Running Tests

```bash
npm test
```

### Running the Web UI

```bash
npm run web
# or
node bin/truth-tutor.mjs web
```

The Web UI will be available at `http://127.0.0.1:3474/`

### Building a Prompt

```bash
node bin/truth-tutor.mjs prompt \
  --topic "Transformer attention" \
  --confusion "I can recite QKV but still don't feel why attention works." \
  --understanding "I know matrix multiplication and linear algebra." \
  --strictness direct
```

### Calling a Model

```bash
export OPENAI_API_KEY=your_key
export OPENAI_MODEL=gpt-4

node bin/truth-tutor.mjs ask --input ./examples/concept-debugging.json
```

## Adding a New Feature

1. Create a new module in `src/modules/` if needed
2. Add tests in `test/`
3. Update CLI in `bin/truth-tutor.mjs` if needed
4. Update Web UI if needed
5. Update documentation
6. Update CHANGELOG.md

## Code Style

- Use ES modules (`.mjs` files)
- Use 2-space indentation
- Use meaningful variable names
- Add comments for complex logic
- Follow the existing code style

## Testing

- Write tests for new features
- Use Node.js built-in test runner
- Aim for high test coverage
- Run `npm test` to execute the test suite

Example test:

```javascript
import test from 'node:test';
import assert from 'node:assert';
import { buildPrompt } from '../src/index.mjs';

test('buildPrompt returns correct structure', () => {
  const result = buildPrompt({
    mode: 'general',
    topic: 'Test Topic',
    confusion: 'Test confusion',
    currentUnderstanding: 'Test understanding',
    strictness: 'direct',
  });

  assert(result.mode === 'general');
  assert(result.systemPrompt);
  assert(result.userPrompt);
});
```

## Debugging

### Enable Verbose Logging

Set the `DEBUG` environment variable:

```bash
DEBUG=truth-tutor:* node bin/truth-tutor.mjs ask --input ./examples/concept-debugging.json
```

### Inspect Generated Prompts

Use the `prompt` command to see the generated prompts without calling a model:

```bash
node bin/truth-tutor.mjs prompt --topic "Test" --confusion "Test" --understanding "Test" --strictness direct
```

## Performance Considerations

- Prompt building is fast (< 100ms)
- Model calls depend on the API (typically 5-30s)
- Web UI should remain responsive during model calls
- Consider caching for repeated queries

## Security Considerations

- Never log API keys or sensitive information
- Validate all user inputs
- Sanitize HTML output in Web UI
- Use HTTPS in production
- Keep dependencies up-to-date

## Common Issues

### Model API Connection Issues

- Check API key is set correctly
- Verify API endpoint is accessible
- Check network connectivity
- Review API rate limits

### Web UI Not Loading

- Ensure Node.js >= 20
- Check port 3474 is available
- Review browser console for errors
- Check server logs

### Tests Failing

- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version`
- Run tests with verbose output: `npm test -- --verbose`

## Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [OpenClaw Documentation](https://docs.openclaw.ai/)

## Getting Help

- Check existing issues and discussions
- Review the FAQ
- Open a new issue with detailed information
- Contact the maintainers
