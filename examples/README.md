# Truth Tutor Examples

This directory contains example input files for different use cases.

## File Descriptions

### concept-debugging.json
General concept debugging and learning diagnosis.

### paper-reading.json
Research paper reading with full context.

### paper-equations.json
Paper reading focused on understanding equations.

### study-planning.json
Study plan diagnosis and optimization.

### alphaxiv-session.json
alphaXiv recovery workflow example.

### sample-truth-tutor-report.md
Sample output showing the Truth Tutor response format.

## Usage

```bash
# Use an example with the CLI
truth-tutor ask --input ./examples/paper-reading.json

# Or use with paper-prompt
truth-tutor paper-prompt --input ./examples/paper-reading.json
```

## Creating Your Own

Copy an existing example and modify the fields:

```json
{
  "mode": "paper-reading",
  "strictness": "direct",
  "topic": "Your topic here",
  "paperTitle": "Paper Title",
  "paperId": "arXiv:1234.5678",
  "confusion": "What specifically you don't understand",
  "currentUnderstanding": "What you already know",
  "studyLevel": "Your background",
  "goals": "What you want to achieve"
}
```

For more details, see the README.md or visit the GitHub repository.
