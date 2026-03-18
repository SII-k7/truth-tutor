-- Papers table: stores uploaded PDF metadata
CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  authors TEXT,
  abstract TEXT,
  pdf_path TEXT NOT NULL,
  page_count INTEGER,
  created_at INTEGER NOT NULL
);

-- Paper structure: stores extracted document structure as JSON
CREATE TABLE IF NOT EXISTS paper_structure (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id TEXT NOT NULL,
  sections TEXT NOT NULL,  -- JSON array of sections
  paragraphs TEXT NOT NULL,  -- JSON array of paragraphs with coordinates
  figures TEXT,  -- JSON array of figures
  created_at INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

-- Annotations: stores AI-generated and user annotations
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL,
  target_type TEXT NOT NULL,  -- 'paragraph', 'section', 'figure', 'page'
  target_id TEXT NOT NULL,  -- identifier for the target element
  annotation_type TEXT NOT NULL,  -- 'translation', 'explanation', 'concept', 'user'
  position TEXT NOT NULL,  -- JSON with page, bbox coordinates
  content TEXT NOT NULL,  -- annotation content
  created_at INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

-- Reading state: tracks user progress through papers
CREATE TABLE IF NOT EXISTS reading_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'default',
  paper_id TEXT NOT NULL,
  current_page INTEGER DEFAULT 1,
  progress REAL DEFAULT 0.0,  -- 0.0 to 1.0
  visited_sections TEXT,  -- JSON array of visited section IDs
  last_updated INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  UNIQUE(user_id, paper_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_annotations_paper ON annotations(paper_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(annotation_type);
CREATE INDEX IF NOT EXISTS idx_structure_paper ON paper_structure(paper_id);
CREATE INDEX IF NOT EXISTS idx_reading_state_user ON reading_state(user_id, paper_id);
