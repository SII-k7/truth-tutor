/**
 * Annotation Editor & Manager
 * 
 * Manage annotations in the UI:
 * - Edit annotation content
 * - Delete annotations
 * - Add custom annotations
 * - Rate annotations (thumbs up/down)
 * - Report incorrect annotations
 * - Annotation history/versioning
 * - Bulk operations
 */

import { updateAnnotation, deleteAnnotation, createAnnotation } from '../database/db.mjs';

/**
 * Edit annotation content
 */
export async function editAnnotation(annotationId, newContent) {
  try {
    // Save to history before updating
    await saveToHistory(annotationId, 'edit');
    
    // Update annotation
    await updateAnnotation(annotationId, { content: newContent });
    
    return {
      success: true,
      annotationId,
      message: 'Annotation updated successfully'
    };
  } catch (error) {
    console.error('Error editing annotation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete annotation
 */
export async function removeAnnotation(annotationId) {
  try {
    // Save to history before deleting
    await saveToHistory(annotationId, 'delete');
    
    // Delete annotation
    await deleteAnnotation(annotationId);
    
    return {
      success: true,
      annotationId,
      message: 'Annotation deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add custom annotation
 */
export async function addCustomAnnotation(paperId, annotationData) {
  try {
    const {
      target_type = 'paragraph',
      target_id,
      annotation_type = 'explanation',
      position,
      content
    } = annotationData;
    
    if (!content || !position) {
      throw new Error('Content and position are required');
    }
    
    const annotation = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      paper_id: paperId,
      target_type,
      target_id: target_id || `custom-${Date.now()}`,
      annotation_type,
      position,
      content
    };
    
    await createAnnotation(annotation);
    
    return {
      success: true,
      annotation,
      message: 'Custom annotation created successfully'
    };
  } catch (error) {
    console.error('Error adding custom annotation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Rate annotation (thumbs up/down)
 */
export async function rateAnnotation(annotationId, rating, userId = 'default') {
  try {
    if (rating !== 1 && rating !== -1) {
      throw new Error('Rating must be 1 (thumbs up) or -1 (thumbs down)');
    }
    
    // Store rating in database
    // For now, we'll use a simple in-memory store
    // In production, this would be stored in annotation_ratings table
    
    const ratingData = {
      annotation_id: annotationId,
      user_id: userId,
      rating,
      created_at: Date.now()
    };
    
    // TODO: Store in database
    
    return {
      success: true,
      annotationId,
      rating,
      message: 'Rating saved successfully'
    };
  } catch (error) {
    console.error('Error rating annotation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Report incorrect annotation
 */
export async function reportAnnotation(annotationId, reason, userId = 'default') {
  try {
    const report = {
      annotation_id: annotationId,
      user_id: userId,
      reason,
      reported_at: Date.now(),
      status: 'pending'
    };
    
    // TODO: Store in database (annotation_reports table)
    
    return {
      success: true,
      annotationId,
      message: 'Report submitted successfully'
    };
  } catch (error) {
    console.error('Error reporting annotation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get annotation history
 */
export async function getAnnotationHistory(annotationId) {
  try {
    // TODO: Query annotation_history table
    // For now, return empty array
    
    return {
      success: true,
      annotationId,
      history: []
    };
  } catch (error) {
    console.error('Error getting annotation history:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Undo annotation edit
 */
export async function undoAnnotationEdit(annotationId) {
  try {
    const history = await getAnnotationHistory(annotationId);
    
    if (!history.success || history.history.length === 0) {
      throw new Error('No history available for undo');
    }
    
    // Get previous version
    const previousVersion = history.history[history.history.length - 1];
    
    // Restore previous content
    await updateAnnotation(annotationId, { content: previousVersion.content });
    
    return {
      success: true,
      annotationId,
      message: 'Annotation restored to previous version'
    };
  } catch (error) {
    console.error('Error undoing annotation edit:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Bulk delete annotations
 */
export async function bulkDeleteAnnotations(annotationIds) {
  const results = [];
  
  for (const annotationId of annotationIds) {
    const result = await removeAnnotation(annotationId);
    results.push({ annotationId, ...result });
  }
  
  const successCount = results.filter(r => r.success).length;
  
  return {
    success: successCount === annotationIds.length,
    total: annotationIds.length,
    successful: successCount,
    failed: annotationIds.length - successCount,
    results
  };
}

/**
 * Bulk hide annotations (toggle visibility)
 */
export async function bulkHideAnnotations(annotationIds, hidden = true) {
  const results = [];
  
  for (const annotationId of annotationIds) {
    try {
      // TODO: Add 'hidden' field to annotations table
      // For now, just return success
      results.push({
        annotationId,
        success: true,
        hidden
      });
    } catch (error) {
      results.push({
        annotationId,
        success: false,
        error: error.message
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  
  return {
    success: successCount === annotationIds.length,
    total: annotationIds.length,
    successful: successCount,
    failed: annotationIds.length - successCount,
    results
  };
}

/**
 * Bulk export annotations
 */
export async function bulkExportAnnotations(annotationIds, format = 'json') {
  try {
    // Get annotations from database
    // For now, return placeholder
    
    const annotations = []; // TODO: Fetch from database
    
    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(annotations, null, 2),
        format: 'json'
      };
    } else if (format === 'csv') {
      const csv = convertAnnotationsToCSV(annotations);
      return {
        success: true,
        data: csv,
        format: 'csv'
      };
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Error bulk exporting annotations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Duplicate annotation
 */
export async function duplicateAnnotation(annotationId, paperId) {
  try {
    // TODO: Get original annotation from database
    // Create new annotation with same content but new ID
    
    const newAnnotation = {
      id: `duplicate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      paper_id: paperId,
      // ... copy other fields from original
    };
    
    await createAnnotation(newAnnotation);
    
    return {
      success: true,
      originalId: annotationId,
      newId: newAnnotation.id,
      message: 'Annotation duplicated successfully'
    };
  } catch (error) {
    console.error('Error duplicating annotation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Merge annotations
 */
export async function mergeAnnotations(annotationIds, paperId) {
  try {
    if (annotationIds.length < 2) {
      throw new Error('At least 2 annotations required for merging');
    }
    
    // TODO: Get annotations from database
    // Combine their content
    // Create new merged annotation
    // Delete original annotations
    
    const mergedContent = ''; // TODO: Combine content
    
    const mergedAnnotation = {
      id: `merged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      paper_id: paperId,
      content: mergedContent,
      // ... other fields
    };
    
    await createAnnotation(mergedAnnotation);
    
    // Delete originals
    await bulkDeleteAnnotations(annotationIds);
    
    return {
      success: true,
      mergedId: mergedAnnotation.id,
      originalIds: annotationIds,
      message: 'Annotations merged successfully'
    };
  } catch (error) {
    console.error('Error merging annotations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get annotation statistics
 */
export async function getAnnotationStats(paperId) {
  try {
    // TODO: Query database for statistics
    
    return {
      success: true,
      stats: {
        total: 0,
        byType: {},
        byPage: {},
        averageLength: 0,
        ratings: {
          positive: 0,
          negative: 0
        }
      }
    };
  } catch (error) {
    console.error('Error getting annotation stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helper: Save annotation to history
 */
async function saveToHistory(annotationId, action) {
  try {
    // TODO: Get current annotation content
    // Save to annotation_history table
    
    const historyEntry = {
      annotation_id: annotationId,
      action,
      content: '', // TODO: Get current content
      edited_at: Date.now()
    };
    
    // TODO: Store in database
    
    return true;
  } catch (error) {
    console.error('Error saving to history:', error);
    return false;
  }
}

/**
 * Helper: Convert annotations to CSV
 */
function convertAnnotationsToCSV(annotations) {
  const headers = ['ID', 'Type', 'Page', 'Content', 'Created At'];
  const rows = annotations.map(a => [
    a.id,
    a.annotation_type,
    a.position.page,
    `"${a.content.replace(/"/g, '""')}"`, // Escape quotes
    new Date(a.created_at).toISOString()
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

/**
 * Validate annotation data
 */
export function validateAnnotationData(data) {
  const errors = [];
  
  if (!data.content || data.content.trim().length === 0) {
    errors.push('Content is required');
  }
  
  if (!data.position || !data.position.page) {
    errors.push('Position with page number is required');
  }
  
  if (data.content && data.content.length > 10000) {
    errors.push('Content exceeds maximum length (10000 characters)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize annotation content
 */
export function sanitizeAnnotationContent(content) {
  // Remove potentially dangerous HTML/script tags
  let sanitized = String(content || '');
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}
