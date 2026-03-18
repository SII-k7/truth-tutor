/**
 * Export Service
 * 
 * Export annotated papers in various formats:
 * - PDF with highlights
 * - JSON (structured data)
 * - Markdown (readable format)
 * - Notion/Obsidian (knowledge base formats)
 * - Print-friendly HTML
 */

import { readFile } from 'node:fs/promises';
import { getPaper, getAnnotations, getPaperStructure } from '../database/db.mjs';
import { TYPE_COLORS, TYPE_ICONS, getTypeMetadata } from './annotation-types.mjs';

/**
 * Export paper with annotations as JSON
 */
export async function exportAsJSON(paperId) {
  try {
    const paper = await getPaper(paperId);
    if (!paper) {
      throw new Error(`Paper not found: ${paperId}`);
    }
    
    const annotations = await getAnnotations(paperId);
    const structure = await getPaperStructure(paperId);
    
    return {
      paper: {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        pdf_path: paper.pdf_path,
        page_count: paper.page_count,
        created_at: paper.created_at
      },
      structure: structure || {},
      annotations: annotations.map(a => ({
        id: a.id,
        type: a.annotation_type,
        target: {
          type: a.target_type,
          id: a.target_id
        },
        position: a.position,
        content: a.content,
        created_at: a.created_at
      })),
      exported_at: new Date().toISOString(),
      format: 'json',
      version: '1.0'
    };
  } catch (error) {
    console.error('Error exporting as JSON:', error);
    throw error;
  }
}

/**
 * Export paper with annotations as Markdown
 */
export async function exportAsMarkdown(paperId) {
  try {
    const paper = await getPaper(paperId);
    if (!paper) {
      throw new Error(`Paper not found: ${paperId}`);
    }
    
    const annotations = await getAnnotations(paperId);
    const structure = await getPaperStructure(paperId);
    
    let markdown = '';
    
    // Header
    markdown += `# ${paper.title}\n\n`;
    
    if (paper.authors) {
      markdown += `**Authors:** ${paper.authors}\n\n`;
    }
    
    if (paper.abstract) {
      markdown += `## Abstract\n\n${paper.abstract}\n\n`;
    }
    
    markdown += `---\n\n`;
    
    // Annotations by type
    const annotationsByType = groupAnnotationsByType(annotations);
    
    for (const [type, typeAnnotations] of Object.entries(annotationsByType)) {
      if (typeAnnotations.length === 0) continue;
      
      const metadata = getTypeMetadata(type);
      const icon = TYPE_ICONS[type] || '📌';
      
      markdown += `## ${icon} ${metadata?.name || type}\n\n`;
      
      for (const annotation of typeAnnotations) {
        markdown += `### Page ${annotation.position.page}\n\n`;
        markdown += `${annotation.content}\n\n`;
        
        if (annotation.target_type === 'paragraph') {
          markdown += `*Target: ${annotation.target_id}*\n\n`;
        }
        
        markdown += `---\n\n`;
      }
    }
    
    // Footer
    markdown += `\n\n*Exported from Truth-Tutor on ${new Date().toISOString()}*\n`;
    
    return markdown;
  } catch (error) {
    console.error('Error exporting as Markdown:', error);
    throw error;
  }
}

/**
 * Export paper with annotations for Notion
 */
export async function exportForNotion(paperId) {
  try {
    const paper = await getPaper(paperId);
    if (!paper) {
      throw new Error(`Paper not found: ${paperId}`);
    }
    
    const annotations = await getAnnotations(paperId);
    
    // Notion uses blocks format
    const blocks = [];
    
    // Title block
    blocks.push({
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{ type: 'text', text: { content: paper.title } }]
      }
    });
    
    // Authors block
    if (paper.authors) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: 'Authors: ' }, annotations: { bold: true } },
            { type: 'text', text: { content: paper.authors } }
          ]
        }
      });
    }
    
    // Abstract block
    if (paper.abstract) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Abstract' } }]
        }
      });
      
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: paper.abstract } }]
        }
      });
    }
    
    // Divider
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });
    
    // Annotations by type
    const annotationsByType = groupAnnotationsByType(annotations);
    
    for (const [type, typeAnnotations] of Object.entries(annotationsByType)) {
      if (typeAnnotations.length === 0) continue;
      
      const metadata = getTypeMetadata(type);
      const icon = TYPE_ICONS[type] || '📌';
      
      // Type heading
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: `${icon} ${metadata?.name || type}` } }]
        }
      });
      
      // Annotations as callouts
      for (const annotation of typeAnnotations) {
        blocks.push({
          object: 'block',
          type: 'callout',
          callout: {
            icon: { type: 'emoji', emoji: icon },
            rich_text: [
              { type: 'text', text: { content: `Page ${annotation.position.page}: ` }, annotations: { bold: true } },
              { type: 'text', text: { content: annotation.content } }
            ]
          }
        });
      }
    }
    
    return {
      parent: { type: 'page_id', page_id: 'NOTION_PAGE_ID' }, // User would need to provide this
      properties: {
        title: {
          title: [{ type: 'text', text: { content: paper.title } }]
        }
      },
      children: blocks
    };
  } catch (error) {
    console.error('Error exporting for Notion:', error);
    throw error;
  }
}

/**
 * Export paper with annotations for Obsidian
 */
export async function exportForObsidian(paperId) {
  try {
    const paper = await getPaper(paperId);
    if (!paper) {
      throw new Error(`Paper not found: ${paperId}`);
    }
    
    const annotations = await getAnnotations(paperId);
    
    let markdown = '';
    
    // Frontmatter (YAML)
    markdown += `---\n`;
    markdown += `title: "${paper.title}"\n`;
    markdown += `authors: "${paper.authors || ''}"\n`;
    markdown += `paper_id: "${paper.id}"\n`;
    markdown += `created: ${new Date(paper.created_at).toISOString()}\n`;
    markdown += `tags: [paper, research, annotated]\n`;
    markdown += `---\n\n`;
    
    // Title
    markdown += `# ${paper.title}\n\n`;
    
    // Metadata
    markdown += `> [!info] Paper Info\n`;
    markdown += `> **Authors:** ${paper.authors || 'Unknown'}\n`;
    markdown += `> **Pages:** ${paper.page_count || 'Unknown'}\n`;
    markdown += `> **Added:** ${new Date(paper.created_at).toLocaleDateString()}\n\n`;
    
    // Abstract
    if (paper.abstract) {
      markdown += `## Abstract\n\n`;
      markdown += `${paper.abstract}\n\n`;
    }
    
    // Annotations by type
    const annotationsByType = groupAnnotationsByType(annotations);
    
    for (const [type, typeAnnotations] of Object.entries(annotationsByType)) {
      if (typeAnnotations.length === 0) continue;
      
      const metadata = getTypeMetadata(type);
      const icon = TYPE_ICONS[type] || '📌';
      
      markdown += `## ${icon} ${metadata?.name || type}\n\n`;
      
      for (const annotation of typeAnnotations) {
        // Use Obsidian callout syntax
        markdown += `> [!note] Page ${annotation.position.page}\n`;
        markdown += `> ${annotation.content.replace(/\n/g, '\n> ')}\n\n`;
      }
    }
    
    // Backlinks section
    markdown += `## Related Notes\n\n`;
    markdown += `- [[Research Papers]]\n`;
    markdown += `- [[Reading Notes]]\n\n`;
    
    // Footer
    markdown += `---\n\n`;
    markdown += `*Exported from Truth-Tutor on ${new Date().toISOString()}*\n`;
    
    return markdown;
  } catch (error) {
    console.error('Error exporting for Obsidian:', error);
    throw error;
  }
}

/**
 * Export paper with annotations as print-friendly HTML
 */
export async function exportAsPrintHTML(paperId) {
  try {
    const paper = await getPaper(paperId);
    if (!paper) {
      throw new Error(`Paper not found: ${paperId}`);
    }
    
    const annotations = await getAnnotations(paperId);
    const annotationsByType = groupAnnotationsByType(annotations);
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(paper.title)}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20mm; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
    
    body {
      font-family: 'Georgia', serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    
    h2 {
      color: #34495e;
      margin-top: 30px;
      border-bottom: 1px solid #bdc3c7;
      padding-bottom: 5px;
    }
    
    .metadata {
      background: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    
    .annotation {
      margin: 15px 0;
      padding: 15px;
      border-left: 4px solid #3498db;
      background: #f8f9fa;
    }
    
    .annotation-header {
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    
    .annotation-content {
      color: #555;
    }
    
    .type-translation { border-left-color: #4CAF50; }
    .type-explanation { border-left-color: #2196F3; }
    .type-concept { border-left-color: #FF9800; }
    .type-math { border-left-color: #9C27B0; }
    .type-experiment { border-left-color: #00BCD4; }
    .type-prerequisite { border-left-color: #F44336; }
    .type-citation { border-left-color: #795548; }
    .type-definition { border-left-color: #FFEB3B; }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #bdc3c7;
      color: #7f8c8d;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(paper.title)}</h1>
  
  <div class="metadata">
    ${paper.authors ? `<p><strong>Authors:</strong> ${escapeHtml(paper.authors)}</p>` : ''}
    <p><strong>Pages:</strong> ${paper.page_count || 'Unknown'}</p>
    <p><strong>Added:</strong> ${new Date(paper.created_at).toLocaleDateString()}</p>
  </div>
  
  ${paper.abstract ? `
    <h2>Abstract</h2>
    <p>${escapeHtml(paper.abstract)}</p>
  ` : ''}
  
  <div class="page-break"></div>
`;
    
    // Add annotations by type
    for (const [type, typeAnnotations] of Object.entries(annotationsByType)) {
      if (typeAnnotations.length === 0) continue;
      
      const metadata = getTypeMetadata(type);
      const icon = TYPE_ICONS[type] || '📌';
      
      html += `  <h2>${icon} ${metadata?.name || type}</h2>\n`;
      
      for (const annotation of typeAnnotations) {
        html += `  <div class="annotation type-${type}">
    <div class="annotation-header">Page ${annotation.position.page}</div>
    <div class="annotation-content">${escapeHtml(annotation.content)}</div>
  </div>\n`;
      }
    }
    
    html += `
  <div class="footer">
    <p>Exported from Truth-Tutor on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
    
    return html;
  } catch (error) {
    console.error('Error exporting as print HTML:', error);
    throw error;
  }
}

/**
 * Generate shareable link for annotated paper
 */
export async function generateShareableLink(paperId, options = {}) {
  const {
    expiresIn = 7 * 24 * 60 * 60 * 1000, // 7 days
    accessLevel = 'read',
    includeAnnotations = true
  } = options;
  
  // Generate unique share token
  const shareToken = generateShareToken();
  const expiresAt = Date.now() + expiresIn;
  
  // In production, this would store the share token in database
  // For now, return a mock shareable link
  
  return {
    shareToken,
    url: `https://truth-tutor.app/shared/${shareToken}`,
    expiresAt: new Date(expiresAt).toISOString(),
    accessLevel,
    includeAnnotations
  };
}

/**
 * Export reading progress report
 */
export async function exportProgressReport(paperId, userId = 'default') {
  try {
    const paper = await getPaper(paperId);
    const annotations = await getAnnotations(paperId);
    
    // Calculate statistics
    const stats = calculateAnnotationStats(annotations);
    
    return {
      paper: {
        id: paper.id,
        title: paper.title
      },
      user: userId,
      statistics: stats,
      annotations: {
        total: annotations.length,
        byType: stats.byType
      },
      exported_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error exporting progress report:', error);
    throw error;
  }
}

/**
 * Helper: Group annotations by type
 */
function groupAnnotationsByType(annotations) {
  const grouped = {};
  
  for (const annotation of annotations) {
    const type = annotation.annotation_type;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(annotation);
  }
  
  return grouped;
}

/**
 * Helper: Calculate annotation statistics
 */
function calculateAnnotationStats(annotations) {
  const byType = {};
  
  for (const annotation of annotations) {
    const type = annotation.annotation_type;
    byType[type] = (byType[type] || 0) + 1;
  }
  
  return {
    total: annotations.length,
    byType,
    averagePerPage: annotations.length / (Math.max(...annotations.map(a => a.position.page)) || 1)
  };
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

/**
 * Helper: Generate share token
 */
function generateShareToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Export dispatcher - route to appropriate export function
 */
export async function exportPaper(paperId, format, options = {}) {
  switch (format.toLowerCase()) {
    case 'json':
      return await exportAsJSON(paperId);
    case 'markdown':
    case 'md':
      return await exportAsMarkdown(paperId);
    case 'notion':
      return await exportForNotion(paperId);
    case 'obsidian':
      return await exportForObsidian(paperId);
    case 'html':
    case 'print':
      return await exportAsPrintHTML(paperId);
    case 'share':
      return await generateShareableLink(paperId, options);
    case 'progress':
      return await exportProgressReport(paperId, options.userId);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
