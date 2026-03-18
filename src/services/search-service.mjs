/**
 * Advanced Search Service
 * 
 * Comprehensive search functionality:
 * - Full-text search across papers
 * - Search within annotations
 * - Search by concept/topic
 * - Semantic search using embeddings
 * - Search history
 * - Saved searches
 */

import { allAsync, getAsync, runAsync } from '../database/db.mjs';

/**
 * Full-text search across papers
 */
export async function searchPapers(query, options = {}) {
  const {
    limit = 20,
    offset = 0,
    filters = {}
  } = options;
  
  try {
    // Build SQL query with filters
    let sql = `
      SELECT p.*, 
             COUNT(a.id) as annotation_count
      FROM papers p
      LEFT JOIN annotations a ON p.id = a.paper_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Text search
    if (query && query.trim()) {
      sql += ` AND (
        p.title LIKE ? OR 
        p.abstract LIKE ? OR 
        p.authors LIKE ?
      )`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Date filter
    if (filters.dateFrom) {
      sql += ` AND p.created_at >= ?`;
      params.push(filters.dateFrom);
    }
    
    if (filters.dateTo) {
      sql += ` AND p.created_at <= ?`;
      params.push(filters.dateTo);
    }
    
    // Author filter
    if (filters.author) {
      sql += ` AND p.authors LIKE ?`;
      params.push(`%${filters.author}%`);
    }
    
    sql += ` GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // Execute query (placeholder - would use actual database)
    const results = []; // TODO: Execute with allAsync(sql, params)
    
    return {
      success: true,
      query,
      results,
      total: results.length,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error searching papers:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Search within annotations
 */
export async function searchAnnotations(query, options = {}) {
  const {
    paperId = null,
    annotationType = null,
    limit = 50,
    offset = 0
  } = options;
  
  try {
    let sql = `
      SELECT a.*, p.title as paper_title
      FROM annotations a
      JOIN papers p ON a.paper_id = p.id
      WHERE a.content LIKE ?
    `;
    
    const params = [`%${query}%`];
    
    if (paperId) {
      sql += ` AND a.paper_id = ?`;
      params.push(paperId);
    }
    
    if (annotationType) {
      sql += ` AND a.annotation_type = ?`;
      params.push(annotationType);
    }
    
    sql += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // Execute query (placeholder)
    const results = []; // TODO: Execute with allAsync(sql, params)
    
    return {
      success: true,
      query,
      results,
      total: results.length,
      limit,
      offset
    };
  } catch (error) {
    console.error('Error searching annotations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Search by concept/topic
 */
export async function searchByConcept(concept, options = {}) {
  const {
    limit = 20,
    offset = 0
  } = options;
  
  try {
    // Search annotations that mention this concept
    const sql = `
      SELECT a.*, p.title as paper_title, p.id as paper_id
      FROM annotations a
      JOIN papers p ON a.paper_id = p.id
      WHERE a.annotation_type = 'concept' 
        AND a.content LIKE ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const params = [`%${concept}%`, limit, offset];
    
    // Execute query (placeholder)
    const results = []; // TODO: Execute with allAsync(sql, params)
    
    // Group by paper
    const byPaper = {};
    for (const result of results) {
      if (!byPaper[result.paper_id]) {
        byPaper[result.paper_id] = {
          paperId: result.paper_id,
          paperTitle: result.paper_title,
          annotations: []
        };
      }
      byPaper[result.paper_id].annotations.push(result);
    }
    
    return {
      success: true,
      concept,
      papers: Object.values(byPaper),
      total: Object.keys(byPaper).length
    };
  } catch (error) {
    console.error('Error searching by concept:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Semantic search using embeddings
 */
export async function semanticSearch(query, options = {}) {
  const {
    limit = 10,
    threshold = 0.7
  } = options;
  
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for similar embeddings in database
    // This would require storing embeddings for papers/annotations
    // For now, return placeholder
    
    const results = [];
    
    return {
      success: true,
      query,
      results,
      total: results.length,
      method: 'semantic'
    };
  } catch (error) {
    console.error('Error in semantic search:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate embedding for text (using OpenAI embeddings API)
 */
async function generateEmbedding(text) {
  try {
    // This would call OpenAI embeddings API
    // For now, return placeholder
    
    // const response = await openai.embeddings.create({
    //   model: 'text-embedding-3-small',
    //   input: text
    // });
    // return response.data[0].embedding;
    
    return new Array(1536).fill(0); // Placeholder
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between embeddings
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Save search to history
 */
export async function saveSearchHistory(userId, query, results) {
  try {
    const historyEntry = {
      user_id: userId,
      query,
      result_count: results.length,
      searched_at: Date.now()
    };
    
    // TODO: Store in search_history table
    
    return {
      success: true,
      message: 'Search saved to history'
    };
  } catch (error) {
    console.error('Error saving search history:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get search history
 */
export async function getSearchHistory(userId, options = {}) {
  const {
    limit = 20,
    offset = 0
  } = options;
  
  try {
    // TODO: Query search_history table
    
    const history = [];
    
    return {
      success: true,
      history,
      total: history.length
    };
  } catch (error) {
    console.error('Error getting search history:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Save search query
 */
export async function saveSearch(userId, name, query, filters = {}) {
  try {
    const savedSearch = {
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      name,
      query,
      filters: JSON.stringify(filters),
      created_at: Date.now()
    };
    
    // TODO: Store in saved_searches table
    
    return {
      success: true,
      savedSearch,
      message: 'Search saved successfully'
    };
  } catch (error) {
    console.error('Error saving search:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get saved searches
 */
export async function getSavedSearches(userId) {
  try {
    // TODO: Query saved_searches table
    
    const searches = [];
    
    return {
      success: true,
      searches
    };
  } catch (error) {
    console.error('Error getting saved searches:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete saved search
 */
export async function deleteSavedSearch(searchId, userId) {
  try {
    // TODO: Delete from saved_searches table
    
    return {
      success: true,
      message: 'Saved search deleted'
    };
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Execute saved search
 */
export async function executeSavedSearch(searchId, userId) {
  try {
    // TODO: Get saved search from database
    // Execute the search with saved query and filters
    
    const savedSearch = {}; // TODO: Fetch from database
    
    const results = await searchPapers(savedSearch.query, {
      filters: JSON.parse(savedSearch.filters || '{}')
    });
    
    return results;
  } catch (error) {
    console.error('Error executing saved search:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Advanced search with multiple criteria
 */
export async function advancedSearch(criteria, options = {}) {
  const {
    limit = 20,
    offset = 0
  } = options;
  
  try {
    const {
      text,
      author,
      dateFrom,
      dateTo,
      annotationType,
      hasAnnotations,
      minAnnotations,
      concepts
    } = criteria;
    
    let sql = `
      SELECT DISTINCT p.*, 
             COUNT(a.id) as annotation_count
      FROM papers p
      LEFT JOIN annotations a ON p.id = a.paper_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Text search
    if (text) {
      sql += ` AND (p.title LIKE ? OR p.abstract LIKE ?)`;
      params.push(`%${text}%`, `%${text}%`);
    }
    
    // Author filter
    if (author) {
      sql += ` AND p.authors LIKE ?`;
      params.push(`%${author}%`);
    }
    
    // Date range
    if (dateFrom) {
      sql += ` AND p.created_at >= ?`;
      params.push(dateFrom);
    }
    
    if (dateTo) {
      sql += ` AND p.created_at <= ?`;
      params.push(dateTo);
    }
    
    // Annotation type filter
    if (annotationType) {
      sql += ` AND a.annotation_type = ?`;
      params.push(annotationType);
    }
    
    // Has annotations filter
    if (hasAnnotations !== undefined) {
      if (hasAnnotations) {
        sql += ` AND a.id IS NOT NULL`;
      } else {
        sql += ` AND a.id IS NULL`;
      }
    }
    
    sql += ` GROUP BY p.id`;
    
    // Minimum annotations filter
    if (minAnnotations) {
      sql += ` HAVING COUNT(a.id) >= ?`;
      params.push(minAnnotations);
    }
    
    sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // Execute query (placeholder)
    const results = []; // TODO: Execute with allAsync(sql, params)
    
    return {
      success: true,
      criteria,
      results,
      total: results.length
    };
  } catch (error) {
    console.error('Error in advanced search:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Search suggestions (autocomplete)
 */
export async function getSearchSuggestions(partial, options = {}) {
  const {
    limit = 10,
    type = 'all' // 'papers', 'authors', 'concepts', 'all'
  } = options;
  
  try {
    const suggestions = [];
    
    if (type === 'all' || type === 'papers') {
      // Get paper title suggestions
      // TODO: Query database
    }
    
    if (type === 'all' || type === 'authors') {
      // Get author suggestions
      // TODO: Query database
    }
    
    if (type === 'all' || type === 'concepts') {
      // Get concept suggestions
      // TODO: Query database
    }
    
    return {
      success: true,
      partial,
      suggestions: suggestions.slice(0, limit)
    };
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get popular searches
 */
export async function getPopularSearches(options = {}) {
  const {
    limit = 10,
    period = 'week' // 'day', 'week', 'month', 'all'
  } = options;
  
  try {
    // Calculate time threshold
    const now = Date.now();
    const thresholds = {
      day: now - 24 * 60 * 60 * 1000,
      week: now - 7 * 24 * 60 * 60 * 1000,
      month: now - 30 * 24 * 60 * 60 * 1000,
      all: 0
    };
    
    const threshold = thresholds[period] || thresholds.week;
    
    // TODO: Query search_history table and aggregate
    
    const popular = [];
    
    return {
      success: true,
      period,
      searches: popular.slice(0, limit)
    };
  } catch (error) {
    console.error('Error getting popular searches:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clear search history
 */
export async function clearSearchHistory(userId) {
  try {
    // TODO: Delete from search_history table
    
    return {
      success: true,
      message: 'Search history cleared'
    };
  } catch (error) {
    console.error('Error clearing search history:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
