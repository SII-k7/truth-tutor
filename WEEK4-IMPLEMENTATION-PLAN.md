# Week 4+ Implementation Plan: Advanced Features

**Start Date:** March 17, 2025  
**Status:** In Progress  
**Goal:** Transform Truth-Tutor into a production-grade research paper reading tool

## Implementation Priority

### Phase 1: Core Functionality (High Impact) - Days 1-3
1. ✅ Multiple Annotation Types (math, experiment, prerequisite, citation, definition)
2. ✅ Ontology Integration (link annotations to knowledge graph)
3. ✅ Figure Analysis with Vision Models
4. ✅ Annotation Editing & Management
5. ✅ Export Functionality

### Phase 2: Production Readiness - Days 4-5
6. ✅ Multi-Model Diagnosis Integration
7. ✅ Performance & Scalability
8. ✅ Security & Privacy
9. ✅ Advanced Search

### Phase 3: Enhanced Features - Days 6-7
10. ⏳ Collaborative Features (basic)
11. ⏳ Learning Path Recommendations
12. ⏳ Automation Integration
13. ⏳ Mobile Optimization
14. ⏳ Analytics & Monitoring

### Phase 4: Documentation & Deployment - Day 8
15. ⏳ Complete Documentation
16. ⏳ Production Deployment Setup

## Detailed Implementation Tasks

### 1. Multiple Annotation Types ✅

**Files to Create/Modify:**
- `src/services/annotation-types.mjs` - Type definitions and handlers
- `src/services/annotation-generator.mjs` - Add type-specific generation
- `src/web-ui/components/AnnotationLayer.js` - Add type icons and colors
- `src/database/schema.sql` - Ensure annotation_type field exists

**Features:**
- Math annotations: Detect LaTeX/equations, add step-by-step explanations
- Experiment annotations: Identify methodology sections, explain design
- Prerequisite annotations: Mark required background knowledge
- Citation annotations: Link to referenced papers (extract from bibliography)
- Definition annotations: Highlight key terms with definitions
- Color-coding: Different colors for each type
- Type icons: Visual indicators on stickers

**Implementation:**
```javascript
// Annotation types
const ANNOTATION_TYPES = {
  TRANSLATION: 'translation',
  EXPLANATION: 'explanation',
  CONCEPT: 'concept',
  MATH: 'math',
  EXPERIMENT: 'experiment',
  PREREQUISITE: 'prerequisite',
  CITATION: 'citation',
  DEFINITION: 'definition',
  FIGURE: 'figure'
};

// Type-specific colors
const TYPE_COLORS = {
  translation: '#4CAF50',
  explanation: '#2196F3',
  concept: '#FF9800',
  math: '#9C27B0',
  experiment: '#00BCD4',
  prerequisite: '#F44336',
  citation: '#795548',
  definition: '#FFEB3B',
  figure: '#E91E63'
};
```

### 2. Ontology Integration ✅

**Files to Create/Modify:**
- `src/services/ontology-annotator.mjs` - Link annotations to ontology
- `src/web-ui/components/ConceptGraph.js` - Visualize concept relationships
- `src/web-ui/components/PrerequisiteChain.js` - Show prerequisite chains

**Features:**
- Create Concept entities for key terms in annotations
- Create LearningGap entities for identified gaps
- Link annotations to concepts via ontology
- Build concept relationship graph
- Add "Related Concepts" section to annotation popups
- Show prerequisite chains in sidebar
- Query ontology for concept definitions and relationships

**Implementation:**
```javascript
// When creating annotation
async function createAnnotationWithOntology(annotation, paperId) {
  // 1. Create annotation in database
  const created = await createAnnotation(annotation);
  
  // 2. Extract concepts from annotation content
  const concepts = extractConcepts(annotation.content);
  
  // 3. Create concept entities in ontology
  for (const concept of concepts) {
    await createConcept(concept, {
      source: 'annotation',
      paperId,
      annotationId: annotation.id
    });
  }
  
  // 4. Link annotation to concepts
  await linkAnnotationToConcepts(annotation.id, concepts);
  
  // 5. Identify prerequisites
  const prerequisites = await identifyPrerequisites(concepts);
  
  // 6. Link prerequisites in ontology
  for (const [concept, prereq] of prerequisites) {
    await linkPrerequisite(concept, prereq);
  }
  
  return created;
}
```

### 3. Figure Analysis with Vision Models ✅

**Files to Create/Modify:**
- `src/services/figure-analyzer.mjs` - Extract and analyze figures
- `src/services/vision-model-client.mjs` - GPT-4o-vision API client
- `src/web-ui/components/FigureViewer.js` - Interactive figure viewer
- `src/web-ui/components/FigureComparison.js` - Side-by-side comparison

**Features:**
- Extract figures from PDF (using pdf-parse or pdfjs-dist)
- Send figures to GPT-4o-vision for analysis
- Generate captions and explanations
- Identify diagram types (architecture, chart, plot, flowchart, etc.)
- Add interactive figure annotations
- Zoom in on figures
- Compare figures side-by-side
- Link figures to related text sections

**Implementation:**
```javascript
// Extract figures from PDF
async function extractFigures(pdfPath) {
  const pdf = await pdfjs.getDocument(pdfPath).promise;
  const figures = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const ops = await page.getOperatorList();
    
    // Find image operations
    for (let j = 0; j < ops.fnArray.length; j++) {
      if (ops.fnArray[j] === pdfjs.OPS.paintImageXObject) {
        const image = await extractImage(page, ops.argsArray[j][0]);
        figures.push({
          page: i,
          image,
          bbox: calculateBBox(ops, j)
        });
      }
    }
  }
  
  return figures;
}

// Analyze figure with GPT-4o-vision
async function analyzeFigure(imageData) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this figure from a research paper. Identify: 1) Type (chart/diagram/plot/architecture/etc), 2) Main elements, 3) Key insights, 4) Caption suggestion' },
        { type: 'image_url', image_url: { url: imageData } }
      ]
    }]
  });
  
  return parseFigureAnalysis(response.choices[0].message.content);
}
```

### 4. Annotation Editing & Management ✅

**Files to Create/Modify:**
- `src/web-ui/components/AnnotationEditor.js` - Edit annotation UI
- `src/web-ui/components/AnnotationManager.js` - Bulk operations
- `src/database/db.mjs` - Add annotation versioning

**Features:**
- Edit annotation text in UI (inline editing)
- Delete annotations (with confirmation)
- Add custom annotations manually (user-created)
- Rate annotation quality (thumbs up/down)
- Report incorrect annotations (feedback system)
- Annotation history/versioning (track changes)
- Bulk operations (delete all, hide all, export all)
- Undo/redo support

### 5. Export Functionality ✅

**Files to Create/Modify:**
- `src/services/export-service.mjs` - Export handlers
- `src/services/pdf-exporter.mjs` - PDF with highlights
- `src/services/markdown-exporter.mjs` - Markdown format
- `src/services/notion-exporter.mjs` - Notion format

**Features:**
- Export annotated paper as PDF with highlights
- Export annotations as JSON
- Export annotations as Markdown
- Export to Notion/Obsidian format
- Share annotated paper (generate shareable link)
- Print-friendly view
- Export reading progress report

### 6. Multi-Model Diagnosis Integration ✅

**Files to Modify:**
- `src/multi-model-diagnosis.mjs` - Connect to actual APIs
- `src/web-ui/components/ModelComparison.js` - UI for comparison
- `src/web-server.mjs` - Add API endpoints

**Features:**
- Run multiple AI models in parallel (Claude, GPT, Gemini)
- Compare diagnoses side-by-side
- Show consensus and disagreements
- Let user choose preferred model
- Model performance tracking
- Save model preferences

### 7. Performance & Scalability ✅

**Files to Create/Modify:**
- `src/services/cache-service.mjs` - Caching layer
- `src/services/job-queue.mjs` - Background jobs
- `src/database/db.mjs` - Query optimization

**Features:**
- Implement caching layer (in-memory + optional Redis)
- Optimize database queries (indexes, prepared statements)
- Add pagination for large result sets
- Lazy load images and annotations
- Background job queue for analysis
- Rate limiting for API calls
- Connection pooling

### 8. Security & Privacy ✅

**Files to Create/Modify:**
- `src/services/auth-service.mjs` - JWT authentication
- `src/services/access-control.mjs` - Permission management
- `src/middleware/rate-limiter.mjs` - Rate limiting

**Features:**
- User authentication (JWT tokens)
- Paper access control (private/public/shared)
- API key management (secure storage)
- Rate limiting per user
- Data encryption at rest (SQLite encryption)
- GDPR compliance (data export/delete)
- Input sanitization
- CORS configuration

### 9. Advanced Search ✅

**Files to Create/Modify:**
- `src/services/search-service.mjs` - Search engine
- `src/services/embedding-service.mjs` - Semantic search
- `src/web-ui/components/AdvancedSearch.js` - Search UI

**Features:**
- Full-text search across papers (SQLite FTS5)
- Search within annotations
- Search by concept/topic
- Semantic search using embeddings (OpenAI embeddings)
- Search history (save recent searches)
- Saved searches (bookmarked queries)
- Search filters (date, type, author, etc.)

### 10-15. Additional Features (Phase 3-4)

See detailed task breakdown in sections below.

## Technical Architecture

### Database Schema Extensions

```sql
-- Add annotation versioning
CREATE TABLE annotation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annotation_id TEXT NOT NULL,
  content TEXT NOT NULL,
  edited_by TEXT,
  edited_at INTEGER NOT NULL,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id)
);

-- Add user ratings
CREATE TABLE annotation_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annotation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER CHECK(rating IN (-1, 1)),
  created_at INTEGER NOT NULL,
  UNIQUE(annotation_id, user_id),
  FOREIGN KEY (annotation_id) REFERENCES annotations(id)
);

-- Add figure analysis
CREATE TABLE figures (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL,
  page INTEGER NOT NULL,
  bbox TEXT NOT NULL,
  image_data TEXT,
  analysis TEXT,
  diagram_type TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id)
);

-- Add search index (FTS5)
CREATE VIRTUAL TABLE papers_fts USING fts5(
  paper_id,
  title,
  abstract,
  content,
  content=papers
);

-- Add user authentication
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Add paper sharing
CREATE TABLE paper_shares (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  shared_with TEXT,
  access_level TEXT CHECK(access_level IN ('read', 'write', 'admin')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

### API Endpoints

```
# Annotation Types
POST   /api/papers/:paperId/annotations/generate
  - body: { types: ['math', 'experiment', ...], options: {...} }
  
GET    /api/papers/:paperId/annotations/types
  - returns: { types: [...], counts: {...} }

# Ontology Integration
GET    /api/papers/:paperId/concepts
  - returns: { concepts: [...], relationships: [...] }
  
GET    /api/concepts/:conceptId/prerequisites
  - returns: { prerequisites: [...], chain: [...] }

# Figure Analysis
POST   /api/papers/:paperId/figures/analyze
  - body: { figureIds: [...] }
  
GET    /api/papers/:paperId/figures
  - returns: { figures: [...] }
  
GET    /api/figures/:figureId/analysis
  - returns: { analysis: {...}, type: '...', caption: '...' }

# Annotation Management
PUT    /api/annotations/:annotationId
  - body: { content: '...', ... }
  
DELETE /api/annotations/:annotationId

POST   /api/annotations/:annotationId/rate
  - body: { rating: 1 or -1 }
  
GET    /api/annotations/:annotationId/history
  - returns: { history: [...] }

# Export
GET    /api/papers/:paperId/export/pdf
GET    /api/papers/:paperId/export/json
GET    /api/papers/:paperId/export/markdown
GET    /api/papers/:paperId/export/notion

# Multi-Model Diagnosis
POST   /api/diagnose/multi-model
  - body: { input: {...}, models: ['claude', 'gpt', 'gemini'] }
  
GET    /api/diagnose/:diagnosisId/comparison
  - returns: { results: [...], consensus: {...}, insights: {...} }

# Search
GET    /api/search?q=...&type=...&filters=...
POST   /api/search/semantic
  - body: { query: '...', limit: 10 }
  
GET    /api/search/history
POST   /api/search/save
  - body: { query: '...', name: '...' }

# Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

# Sharing
POST   /api/papers/:paperId/share
  - body: { email: '...', accessLevel: 'read' }
  
GET    /api/papers/:paperId/shares
DELETE /api/papers/:paperId/shares/:shareId
```

## Testing Strategy

### Unit Tests
- Annotation type detection
- Ontology entity creation
- Figure extraction
- Export formatters
- Search algorithms

### Integration Tests
- End-to-end annotation pipeline
- Multi-model diagnosis flow
- Export workflows
- Authentication flow

### Performance Tests
- Large document handling (100+ pages)
- Many annotations (1000+)
- Concurrent users
- Search performance

### Security Tests
- Authentication bypass attempts
- SQL injection
- XSS attacks
- Rate limit enforcement

## Deployment Checklist

- [ ] All features implemented
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Docker Compose setup
- [ ] CI/CD pipeline configured
- [ ] Monitoring setup
- [ ] Backup strategy
- [ ] Rollback plan

## Progress Tracking

**Day 1:** Multiple annotation types, ontology integration  
**Day 2:** Figure analysis, annotation editing  
**Day 3:** Export functionality, multi-model diagnosis  
**Day 4:** Performance optimizations, security features  
**Day 5:** Advanced search, collaborative features (basic)  
**Day 6:** Learning paths, automation, mobile optimization  
**Day 7:** Analytics, monitoring  
**Day 8:** Documentation, deployment setup  

---

**Last Updated:** March 17, 2025  
**Implemented By:** executor-week4-advanced
