import sqlite3 from 'sqlite3';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../data/papers.db');

let db = null;

// Initialize database connection
export async function initDatabase() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        // Load and execute schema
        const schema = await readFile(join(__dirname, 'schema.sql'), 'utf8');
        await runAsync(schema);
        resolve(db);
      } catch (schemaErr) {
        reject(schemaErr);
      }
    });
  });
}

// Get database instance (for synchronous operations)
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Helper to promisify db.run
export function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Helper to promisify db.get
export function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper to promisify db.all
export function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Papers CRUD
export async function createPaper(paper) {
  await initDatabase();
  const { id, title, authors, abstract, pdf_path, page_count } = paper;
  const created_at = Date.now();
  
  await runAsync(
    'INSERT INTO papers (id, title, authors, abstract, pdf_path, page_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, title, authors || '', abstract || '', pdf_path, page_count, created_at]
  );
  
  return { ...paper, created_at };
}

export async function getPaper(paperId) {
  await initDatabase();
  return getAsync('SELECT * FROM papers WHERE id = ?', [paperId]);
}

export async function listPapers() {
  await initDatabase();
  return allAsync('SELECT * FROM papers ORDER BY created_at DESC');
}

export async function deletePaper(paperId) {
  await initDatabase();
  return runAsync('DELETE FROM papers WHERE id = ?', [paperId]);
}

// Paper structure CRUD
export async function savePaperStructure(paperId, structure) {
  await initDatabase();
  const { sections, paragraphs, figures } = structure;
  const created_at = Date.now();
  
  const result = await runAsync(
    'INSERT INTO paper_structure (paper_id, sections, paragraphs, figures, created_at) VALUES (?, ?, ?, ?, ?)',
    [
      paperId,
      JSON.stringify(sections),
      JSON.stringify(paragraphs),
      JSON.stringify(figures || []),
      created_at
    ]
  );
  
  return { id: result.lastID, paper_id: paperId, ...structure, created_at };
}

export async function getPaperStructure(paperId) {
  await initDatabase();
  const row = await getAsync(
    'SELECT * FROM paper_structure WHERE paper_id = ? ORDER BY created_at DESC LIMIT 1',
    [paperId]
  );
  
  if (!row) return null;
  
  return {
    id: row.id,
    paper_id: row.paper_id,
    sections: JSON.parse(row.sections),
    paragraphs: JSON.parse(row.paragraphs),
    figures: JSON.parse(row.figures || '[]'),
    created_at: row.created_at
  };
}

// Annotations CRUD
export async function createAnnotation(annotation) {
  await initDatabase();
  const { id, paper_id, target_type, target_id, annotation_type, position, content } = annotation;
  const created_at = Date.now();
  
  await runAsync(
    'INSERT INTO annotations (id, paper_id, target_type, target_id, annotation_type, position, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, paper_id, target_type, target_id, annotation_type, JSON.stringify(position), content, created_at]
  );
  
  return { ...annotation, created_at };
}

export async function getAnnotations(paperId, filters = {}) {
  await initDatabase();
  let sql = 'SELECT * FROM annotations WHERE paper_id = ?';
  const params = [paperId];
  
  if (filters.annotation_type) {
    sql += ' AND annotation_type = ?';
    params.push(filters.annotation_type);
  }
  
  if (filters.target_type) {
    sql += ' AND target_type = ?';
    params.push(filters.target_type);
  }
  
  sql += ' ORDER BY created_at ASC';
  
  const rows = await allAsync(sql, params);
  return rows.map(row => ({
    ...row,
    position: JSON.parse(row.position)
  }));
}

export async function deleteAnnotation(annotationId) {
  await initDatabase();
  return runAsync('DELETE FROM annotations WHERE id = ?', [annotationId]);
}

export async function updateAnnotation(annotationId, updates) {
  await initDatabase();
  const { content, position } = updates;
  const sets = [];
  const params = [];
  
  if (content !== undefined) {
    sets.push('content = ?');
    params.push(content);
  }
  
  if (position !== undefined) {
    sets.push('position = ?');
    params.push(JSON.stringify(position));
  }
  
  if (sets.length === 0) return;
  
  params.push(annotationId);
  return runAsync(`UPDATE annotations SET ${sets.join(', ')} WHERE id = ?`, params);
}

// Reading state CRUD
export async function saveReadingState(userId, paperId, state) {
  await initDatabase();
  const { current_page, progress, visited_sections } = state;
  const last_updated = Date.now();
  
  await runAsync(
    `INSERT INTO reading_state (user_id, paper_id, current_page, progress, visited_sections, last_updated)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, paper_id) DO UPDATE SET
       current_page = excluded.current_page,
       progress = excluded.progress,
       visited_sections = excluded.visited_sections,
       last_updated = excluded.last_updated`,
    [userId, paperId, current_page, progress, JSON.stringify(visited_sections || []), last_updated]
  );
  
  return { user_id: userId, paper_id: paperId, ...state, last_updated };
}

export async function getReadingState(userId, paperId) {
  await initDatabase();
  const row = await getAsync(
    'SELECT * FROM reading_state WHERE user_id = ? AND paper_id = ?',
    [userId, paperId]
  );
  
  if (!row) return null;
  
  return {
    user_id: row.user_id,
    paper_id: row.paper_id,
    current_page: row.current_page,
    progress: row.progress,
    visited_sections: JSON.parse(row.visited_sections || '[]'),
    last_updated: row.last_updated
  };
}

// Close database connection
export function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    
    db.close((err) => {
      if (err) reject(err);
      else {
        db = null;
        resolve();
      }
    });
  });
}
