# Contributing to Truth Tutor

Thank you for your interest in contributing to Truth Tutor! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps which reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs if possible**
- **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and the expected behavior**
- **Explain why this enhancement would be useful**

### Pull Requests

- Fill in the required template
- Follow the JavaScript/Node.js styleguides
- Include appropriate test cases
- Update documentation as needed
- End all files with a newline

## Development Setup

### Prerequisites

- Node.js >= 20
- npm or yarn

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/truth-tutor.git`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Run tests: `npm test`
7. Commit your changes: `git commit -am 'Add some feature'`
8. Push to the branch: `git push origin feature/your-feature-name`
9. Create a Pull Request

## Styleguides

### JavaScript/Node.js

- Use ES modules (`.mjs` files)
- Use 2-space indentation
- Use meaningful variable names
- Add comments for complex logic
- Follow the existing code style

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Documentation

- Use clear and concise language
- Include code examples where appropriate
- Keep documentation up-to-date with code changes
- Use Markdown for formatting

## Testing

- Write tests for new features
- Ensure all tests pass before submitting a PR
- Aim for high test coverage
- Run `npm test` to execute the test suite

## Project Structure

```
truth-tutor/
├── bin/              # CLI entry points
├── src/              # Source code
│   ├── modules/      # Core modules (general, paper-reading, alphaxiv)
│   ├── web-ui/       # Web UI files
│   └── *.mjs         # Core utilities
├── test/             # Test files
├── docs/             # Documentation
├── examples/         # Example inputs
└── skill/            # OpenClaw skill package
```

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Commit changes: `git commit -am 'v1.x.x'`
4. Create a git tag: `git tag v1.x.x`
5. Push changes and tags: `git push origin main --tags`
6. Create a GitHub release with release notes
7. Publish to npm: `npm publish`
8. Publish to ClawHub: `clawhub publish ./skill/truth-tutor --version 1.x.x`

## Questions?

Feel free to open an issue with the `question` label or reach out to the maintainers.

Thank you for contributing!
