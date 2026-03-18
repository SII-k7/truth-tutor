# User Guide

Complete guide to using Truth Tutor for reading and annotating research papers.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Uploading Papers](#uploading-papers)
3. [Reading Papers](#reading-papers)
4. [Annotations](#annotations)
5. [Search](#search)
6. [Export](#export)
7. [Collaboration](#collaboration)
8. [Tips & Tricks](#tips--tricks)

## Getting Started

### Creating an Account

1. Navigate to the Truth Tutor homepage
2. Click "Sign Up" in the top right
3. Enter your email, password, and name
4. Click "Create Account"
5. You'll receive a JWT token for authentication

### Logging In

1. Click "Log In"
2. Enter your email and password
3. Click "Sign In"
4. You'll be redirected to your dashboard

## Uploading Papers

### From Local File

1. Click "Upload Paper" button
2. Select a PDF file from your computer
3. Optionally add a title
4. Click "Upload"
5. The paper will be analyzed automatically

### From arXiv

1. Click "Import from arXiv"
2. Enter the arXiv ID (e.g., 2103.14030)
3. Click "Import"
4. The paper will be downloaded and analyzed

### Analysis Process

When you upload a paper, Truth Tutor:
- Extracts text and structure
- Identifies sections and paragraphs
- Detects figures and tables
- Generates initial annotations
- Builds a concept graph

This process takes 1-5 minutes depending on paper length.

## Reading Papers

### Paper Viewer

The paper viewer has three main sections:

1. **Left Sidebar**: Table of contents and navigation
2. **Center Panel**: Paper content with annotations
3. **Right Sidebar**: Annotation details and tools

### Navigation

- Click sections in the table of contents to jump
- Use arrow keys to navigate pages
- Scroll to read continuously
- Use the search bar to find specific text

### Annotation Types

Truth Tutor provides 10 types of annotations:

| Type | Icon | Description |
|------|------|-------------|
| Translation | 🌐 | Simplified explanations of complex text |
| Explanation | 💡 | Detailed explanations of concepts |
| Concept | 🏷️ | Key concepts and definitions |
| Math | ∑ | Mathematical equations and formulas |
| Experiment | 🔬 | Experimental methods and results |
| Prerequisite | 📚 | Required background knowledge |
| Citation | 📄 | References to other papers |
| Definition | 📖 | Formal definitions |
| Figure | 🖼️ | Figure descriptions and analysis |
| Summary | 📝 | Section summaries |

### Filtering Annotations

1. Click the filter icon in the toolbar
2. Select which annotation types to show
3. Click "Apply"
4. Only selected types will be visible

## Annotations

### Viewing Annotations

- Hover over highlighted text to see annotation preview
- Click highlighted text to open full annotation
- Annotations appear in the right sidebar

### Creating Annotations

1. Select text in the paper
2. Click "Add Annotation"
3. Choose annotation type
4. Enter your annotation text
5. Click "Save"

### Editing Annotations

1. Click the annotation to open it
2. Click the edit icon (pencil)
3. Modify the text
4. Click "Save"
5. Changes are tracked in history

### Rating Annotations

Help improve annotation quality:
- Click 👍 if the annotation is helpful
- Click 👎 if the annotation is incorrect or unhelpful

### Reporting Issues

If an annotation is incorrect:
1. Click the annotation
2. Click "Report Issue"
3. Describe the problem
4. Click "Submit"

### Annotation History

View all changes to an annotation:
1. Click the annotation
2. Click "View History"
3. See all edits with timestamps
4. Click any version to view it

## Search

### Basic Search

1. Click the search icon or press `/`
2. Enter your search query
3. Press Enter
4. Results appear below

### Search Types

**Papers**: Search paper titles, abstracts, and authors
```
neural networks
```

**Annotations**: Search within annotations
```
type:explanation gradient descent
```

**Concepts**: Find papers about specific concepts
```
concept:transformer
```

**Semantic**: AI-powered semantic search
```
papers about attention mechanisms in NLP
```

### Advanced Search

Use filters for precise results:

```
title:"neural networks" author:Hinton year:2020-2023
```

**Available Filters:**
- `title:` - Search in title
- `author:` - Filter by author
- `year:` - Filter by year or range
- `type:` - Filter by annotation type
- `has:annotations` - Only papers with annotations

### Saving Searches

1. Perform a search
2. Click "Save Search"
3. Enter a name
4. Click "Save"
5. Access from "Saved Searches" menu

## Export

### Export Formats

Truth Tutor supports multiple export formats:

#### JSON
Structured data format for programmatic access
```json
{
  "paper": {...},
  "annotations": [...]
}
```

#### Markdown
Plain text with formatting
```markdown
# Paper Title

## Abstract
...

## 🌐 Translation
...
```

#### Notion
Import directly into Notion
- Blocks format
- Callouts for annotations
- Emoji icons

#### Obsidian
Import into Obsidian vault
- YAML frontmatter
- Backlinks
- Tags

#### HTML
Print-friendly format
- Professional styling
- Color-coded annotations
- Page breaks

### Exporting a Paper

1. Open the paper
2. Click "Export" button
3. Select format
4. Click "Download"
5. File downloads to your computer

### Sharing Papers

Create a shareable link:
1. Click "Share" button
2. Set expiration (optional)
3. Click "Generate Link"
4. Copy and share the link

## Collaboration

### Sharing with Users

1. Click "Share" on a paper
2. Enter user email
3. Select permission level:
   - **Read**: View only
   - **Write**: Can add annotations
   - **Admin**: Full control
4. Click "Share"

### Comments

Add comments to annotations:
1. Click an annotation
2. Click "Add Comment"
3. Type your comment
4. Click "Post"

### Mentions

Mention other users in comments:
```
@username what do you think about this?
```

### Activity Feed

See recent activity:
- New annotations
- Comments
- Shares
- Edits

## Tips & Tricks

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Open search |
| `n` | Next page |
| `p` | Previous page |
| `f` | Toggle fullscreen |
| `h` | Toggle sidebar |
| `Esc` | Close dialogs |

### Reading Strategies

**First Pass**: Read with Translation annotations
- Get high-level understanding
- Identify key concepts
- Note unfamiliar terms

**Second Pass**: Read with Explanation annotations
- Deep dive into concepts
- Understand methodology
- Analyze results

**Third Pass**: Read with all annotations
- Complete understanding
- Connect concepts
- Prepare for implementation

### Organizing Papers

Use tags to organize:
- `#to-read` - Papers to read later
- `#important` - Key papers
- `#reference` - Reference materials
- `#project-name` - Project-specific papers

### Learning Paths

Truth Tutor can recommend reading sequences:
1. Go to "Learning Paths"
2. Click "Generate Path"
3. Select a topic or paper
4. Follow the recommended sequence

### Mobile Usage

Truth Tutor works on mobile:
- Responsive design
- Touch-friendly controls
- Swipe gestures
- Offline support (PWA)

### API Access

For programmatic access:
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name your key
4. Copy the key (shown once)
5. Use in API requests

Example:
```bash
curl -H "Authorization: tt_your_api_key" \
  https://api.truth-tutor.com/api/papers
```

## Troubleshooting

### Paper Won't Upload

- Check file size (max 50MB)
- Ensure it's a valid PDF
- Try a different browser
- Check internet connection

### Annotations Not Loading

- Refresh the page
- Clear browser cache
- Check console for errors
- Report issue if persists

### Search Not Working

- Check search syntax
- Try simpler query
- Use different search type
- Clear search history

### Export Failed

- Try different format
- Check paper has content
- Reduce annotation count
- Contact support

## Support

Need help?
- Documentation: https://docs.truth-tutor.com
- GitHub Issues: https://github.com/yourusername/truth-tutor/issues
- Email: support@truth-tutor.com
- Discord: https://discord.gg/truth-tutor

## Updates

Truth Tutor is actively developed. Check the changelog for new features:
- https://github.com/yourusername/truth-tutor/blob/main/CHANGELOG.md
