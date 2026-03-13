# Frequently Asked Questions (FAQ)

## General Questions

### What is Truth Tutor?

Truth Tutor is an open-source diagnosis-first learning coach designed for people who don't need comfort — especially graduate students and researchers stuck on papers. It tells you **why** you don't understand something, identifies the **missing prerequisite knowledge**, and prescribes a **concrete recovery plan**.

### Who is Truth Tutor for?

- Graduate students and PhD students
- Researchers reading academic papers
- Self-learners studying technical topics
- Anyone who wants honest, diagnosis-first feedback on their learning

### How is Truth Tutor different from other AI study tools?

Most AI study tools try to explain things more simply. Truth Tutor does something harsher and more useful: it tells you what your actual bottleneck is. It focuses on diagnosis before explanation.

## Usage Questions

### How do I use Truth Tutor?

There are several ways to use Truth Tutor:

1. **Web UI**: Run `node bin/truth-tutor.mjs web` and open `http://127.0.0.1:3474/`
2. **CLI**: Use `node bin/truth-tutor.mjs ask --input <file>`
3. **Library**: Import `buildPrompt` from 'truth-tutor' in your code
4. **OpenClaw Skill**: Install the skill from ClawHub

### What are the different modes?

- **general** — For concepts, interview prep, skill gaps, study plans
- **paper-reading** — For research papers with section-by-section guidance
- **alphaxiv** — For when you already asked alphaXiv and still don't get it

### What are the strictness levels?

- **soft** — Low sugar, still calm
- **direct** — Blunt and efficient
- **strict** — Sharp, urgent, corrective
- **brutal** — Severe reality check (never abusive)

### How do I get the best results?

Provide as much context as possible:
- What you're trying to learn
- What you already know
- Where exactly you're stuck
- Your study level and goals

## Technical Questions

### What models does Truth Tutor support?

Truth Tutor supports:
- OpenAI-compatible models (GPT-4, GPT-4o, etc.)
- Anthropic-compatible models (Claude, MiniMax, etc.)
- Local models via compatible APIs

### Can I run Truth Tutor locally?

Yes! You can:
1. Use the Web UI locally (`node bin/truth-tutor.mjs web`)
2. Use the CLI locally
3. Connect to local model endpoints

### How do I configure my API keys?

Set environment variables:

```bash
# OpenAI
export OPENAI_API_KEY=your_key
export OPENAI_MODEL=gpt-4

# Anthropic-compatible
export TRUTH_TUTOR_API_STYLE=anthropic
export ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
export ANTHROPIC_API_KEY=your_key
export ANTHROPIC_MODEL=MiniMax-M2.5
```

### Can I use Truth Tutor without an API key?

Yes, if you have OpenClaw installed with a configured MiniMax profile, Truth Tutor will automatically fall back to your local setup.

## Troubleshooting

### The model is not responding

- Check your API key is set correctly
- Verify the API endpoint is accessible
- Check your network connectivity
- Review API rate limits

### The Web UI is not loading

- Ensure Node.js >= 20 is installed
- Check port 3474 is available
- Review browser console for errors
- Try restarting the server

### The diagnosis doesn't seem accurate

- Provide more context in your input
- Try a higher strictness level
- Be more specific about where you're stuck
- Include what you already know

### The input field doesn't clear after sending

This was a bug that has been fixed. Make sure you're using the latest version (1.0.0 or later).

## Security & Privacy

### Is my data secure?

- Truth Tutor runs locally by default
- Your conversations are not stored on external servers
- You can delete your learning profile and drill data at any time
- API keys are stored locally and never shared

### Can I use Truth Tutor offline?

Partially. The Web UI and CLI work offline, but model calls require an API connection unless you're running a local model.

## Contributing & Development

### How can I contribute?

See the CONTRIBUTING.md file for detailed guidelines. Generally:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

### Where can I report bugs?

Open an issue on GitHub with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment details

### How do I suggest a new feature?

Open an issue on GitHub with:
- Clear description of the feature
- Use cases
- Any relevant examples
- Why this would be useful

## License & Support

### What license does Truth Tutor use?

MIT License - see LICENSE file for details.

### How do I get support?

- Check the documentation
- Review existing issues
- Open a new issue
- Contact the maintainers

### Can I use Truth Tutor commercially?

Yes, the MIT license allows commercial use.

## Advanced Questions

### How does the learning profile work?

Truth Tutor tracks your recurring gaps across sessions. This helps provide more personalized diagnoses over time. You can view and clear your profile in the Web UI.

### What are verification drills?

Verification drills are interactive practice tasks generated by Truth Tutor. They include pass/fail criteria to help you verify your understanding. You can track your progress in the Web UI.

### How does evidence-based output work?

When reading papers, Truth Tutor includes citations to specific sections, paragraphs, and quotes from the paper to support its diagnosis. This helps you verify the claims and read the relevant parts yourself.
