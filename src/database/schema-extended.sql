-- Extended Schema for Week 4+ Features
-- This extends the base schema with tables for advanced features

-- Annotation history: track changes to annotations
CREATE TABLE IF NOT EXISTS annotation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annotation_id TEXT NOT NULL,
  content TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'edit', 'delete', 'create'
  edited_by TEXT DEFAULT 'default',
  edited_at INTEGER NOT NULL,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

-- Annotation ratings: user feedback on annotation quality
CREATE TABLE IF NOT EXISTS annotation_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annotation_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default',
  rating INTEGER CHECK(rating IN (-1, 1)),  -- -1 = thumbs down, 1 = thumbs up
  created_at INTEGER NOT NULL,
  UNIQUE(annotation_id, user_id),
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

-- Annotation reports: user reports of incorrect annotations
CREATE TABLE IF NOT EXISTS annotation_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annotation_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default',
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending', 'reviewed', 'resolved'
  reported_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

-- Figures: extracted figures from PDFs with analysis
CREATE TABLE IF NOT EXISTS figures (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL,
  page INTEGER NOT NULL,
  bbox TEXT NOT NULL,  -- JSON with x, y, width, height
  image_data TEXT,  -- Base64 encoded image or path
  analysis TEXT,  -- JSON with type, elements, insights, caption
  diagram_type TEXT,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

-- Users: user authentication and profiles
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_login INTEGER
);

-- API keys: user API keys for authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Paper shares: sharing papers with other users
CREATE TABLE IF NOT EXISTS paper_shares (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  shared_with TEXT,  -- user_id or email
  access_level TEXT CHECK(access_level IN ('read', 'write', 'admin')) DEFAULT 'read',
  share_token TEXT UNIQUE,  -- for public sharing
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Search history: track user searches
CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'default',
  query TEXT NOT NULL,
  filters TEXT,  -- JSON with search filters
  result_count INTEGER DEFAULT 0,
  searched_at INTEGER NOT NULL
);

-- Saved searches: bookmarked search queries
CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters TEXT,  -- JSON with search filters
  created_at INTEGER NOT NULL,
  last_used INTEGER
);

-- Paper embeddings: for semantic search
CREATE TABLE IF NOT EXISTS paper_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id TEXT NOT NULL,
  embedding_type TEXT NOT NULL,  -- 'title', 'abstract', 'full'
  embedding BLOB NOT NULL,  -- Vector embedding
  model TEXT NOT NULL,  -- 'text-embedding-3-small', etc.
  created_at INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

-- Annotation embeddings: for semantic search within annotations
CREATE TABLE IF NOT EXISTS annotation_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annotation_id TEXT NOT NULL,
  embedding BLOB NOT NULL,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

-- Multi-model diagnoses: store results from multiple AI models
CREATE TABLE IF NOT EXISTS multi_model_diagnoses (
  id TEXT PRIMARY KEY,
  paper_id TEXT,
  input TEXT NOT NULL,  -- JSON with diagnosis input
  models TEXT NOT NULL,  -- JSON array of model IDs
  results TEXT NOT NULL,  -- JSON with results from each model
  consensus TEXT,  -- JSON with consensus findings
  created_at INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE SET NULL
);

-- Model preferences: user preferences for AI models
CREATE TABLE IF NOT EXISTS model_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'default',
  model_id TEXT NOT NULL,
  preference_score REAL DEFAULT 0.5,  -- 0.0 to 1.0
  use_count INTEGER DEFAULT 0,
  last_used INTEGER,
  UNIQUE(user_id, model_id)
);

-- API rate limits: track API usage per user
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'default',
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL,
  UNIQUE(user_id, endpoint, window_start)
);

-- Export history: track paper exports
CREATE TABLE IF NOT EXISTS export_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default',
  format TEXT NOT NULL,  -- 'json', 'markdown', 'pdf', 'notion', etc.
  exported_at INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

-- Collaborative annotations: comments and discussions
CREATE TABLE IF NOT EXISTS annotation_comments (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default',
  parent_comment_id TEXT,  -- for threaded discussions
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES annotation_comments(id) ON DELETE CASCADE
);

-- Activity feed: track user and collaborative activities
CREATE TABLE IF NOT EXISTS activity_feed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'default',
  paper_id TEXT,
  activity_type TEXT NOT NULL,  -- 'annotation_created', 'comment_added', 'paper_shared', etc.
  activity_data TEXT,  -- JSON with activity details
  created_at INTEGER NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

-- Learning paths: recommended reading sequences
CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  description TEXT,
  papers TEXT NOT NULL,  -- JSON array of paper IDs in order
  progress REAL DEFAULT 0.0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

-- Concept graph: knowledge graph of concepts
CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  definition TEXT,
  category TEXT,
  metadata TEXT,  -- JSON with additional metadata
  created_at INTEGER NOT NULL
);

-- Concept relationships: prerequisites and related concepts
CREATE TABLE IF NOT EXISTS concept_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_concept_id TEXT NOT NULL,
  to_concept_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,  -- 'prerequisite', 'related', 'part_of', etc.
  strength REAL DEFAULT 1.0,  -- 0.0 to 1.0
  created_at INTEGER NOT NULL,
  FOREIGN KEY (from_concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
  FOREIGN KEY (to_concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
  UNIQUE(from_concept_id, to_concept_id, relationship_type)
);

-- Concept annotations: link annotations to concepts
CREATE TABLE IF NOT EXISTS concept_annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concept_id TEXT NOT NULL,
  annotation_id TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,  -- 0.0 to 1.0
  created_at INTEGER NOT NULL,
  FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE,
  UNIQUE(concept_id, annotation_id)
);

-- Learning gaps: identified knowledge gaps
CREATE TABLE IF NOT EXISTS learning_gaps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default',
  description TEXT NOT NULL,
  concepts TEXT,  -- JSON array of related concept IDs
  severity TEXT DEFAULT 'medium',  -- 'low', 'medium', 'high'
  status TEXT DEFAULT 'open',  -- 'open', 'in_progress', 'closed'
  paper_id TEXT,
  annotation_id TEXT,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE SET NULL,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_annotation_history_annotation ON annotation_history(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_ratings_annotation ON annotation_ratings(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_reports_annotation ON annotation_reports(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_reports_status ON annotation_reports(status);
CREATE INDEX IF NOT EXISTS idx_figures_paper ON figures(paper_id);
CREATE INDEX IF NOT EXISTS idx_figures_page ON figures(paper_id, page);
CREATE INDEX IF NOT EXISTS idx_paper_shares_paper ON paper_shares(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_shares_owner ON paper_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_paper_shares_token ON paper_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_embeddings_paper ON paper_embeddings(paper_id);
CREATE INDEX IF NOT EXISTS idx_annotation_embeddings_annotation ON annotation_embeddings(annotation_id);
CREATE INDEX IF NOT EXISTS idx_multi_model_diagnoses_paper ON multi_model_diagnoses(paper_id);
CREATE INDEX IF NOT EXISTS idx_model_preferences_user ON model_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user ON api_rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_export_history_paper ON export_history(paper_id);
CREATE INDEX IF NOT EXISTS idx_export_history_user ON export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_annotation_comments_annotation ON annotation_comments(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_comments_parent ON annotation_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_paper ON activity_feed(paper_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_relationships_from ON concept_relationships(from_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_relationships_to ON concept_relationships(to_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_annotations_concept ON concept_annotations(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_annotations_annotation ON concept_annotations(annotation_id);
CREATE INDEX IF NOT EXISTS idx_learning_gaps_user ON learning_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_gaps_status ON learning_gaps(status);
CREATE INDEX IF NOT EXISTS idx_learning_gaps_paper ON learning_gaps(paper_id);

-- Full-text search virtual table for papers
CREATE VIRTUAL TABLE IF NOT EXISTS papers_fts USING fts5(
  paper_id UNINDEXED,
  title,
  abstract,
  authors,
  content='papers',
  content_rowid='rowid'
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS papers_fts_insert AFTER INSERT ON papers BEGIN
  INSERT INTO papers_fts(paper_id, title, abstract, authors)
  VALUES (new.id, new.title, new.abstract, new.authors);
END;

CREATE TRIGGER IF NOT EXISTS papers_fts_delete AFTER DELETE ON papers BEGIN
  DELETE FROM papers_fts WHERE paper_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS papers_fts_update AFTER UPDATE ON papers BEGIN
  UPDATE papers_fts 
  SET title = new.title, abstract = new.abstract, authors = new.authors
  WHERE paper_id = new.id;
END;

-- Full-text search virtual table for annotations
CREATE VIRTUAL TABLE IF NOT EXISTS annotations_fts USING fts5(
  annotation_id UNINDEXED,
  content,
  annotation_type UNINDEXED,
  content='annotations',
  content_rowid='rowid'
);

-- Triggers to keep annotations FTS table in sync
CREATE TRIGGER IF NOT EXISTS annotations_fts_insert AFTER INSERT ON annotations BEGIN
  INSERT INTO annotations_fts(annotation_id, content, annotation_type)
  VALUES (new.id, new.content, new.annotation_type);
END;

CREATE TRIGGER IF NOT EXISTS annotations_fts_delete AFTER DELETE ON annotations BEGIN
  DELETE FROM annotations_fts WHERE annotation_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS annotations_fts_update AFTER UPDATE ON annotations BEGIN
  UPDATE annotations_fts 
  SET content = new.content, annotation_type = new.annotation_type
  WHERE annotation_id = new.id;
END;
