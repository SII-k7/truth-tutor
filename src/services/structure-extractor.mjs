/**
 * Extract hierarchical document structure from parsed PDF
 * Identifies sections, subsections, paragraphs, and figures
 */

/**
 * Extract document structure from parsed PDF data
 * @param {Object} parsedPDF - Output from pdf-parser.mjs
 * @returns {Object} Structured document with sections, paragraphs, figures
 */
export function extractStructure(parsedPDF) {
  const { pages, fullText } = parsedPDF;
  
  // Extract sections and subsections
  const sections = extractSections(fullText, pages);
  
  // Extract paragraphs with coordinates
  const paragraphs = extractParagraphs(pages);
  
  // Detect figures and captions
  const figures = extractFigures(fullText, pages);
  
  return {
    sections,
    paragraphs,
    figures,
    metadata: {
      totalSections: sections.length,
      totalParagraphs: paragraphs.length,
      totalFigures: figures.length
    }
  };
}

/**
 * Extract sections and subsections using regex and heuristics
 */
function extractSections(fullText, pages) {
  const sections = [];
  const lines = fullText.split('\n');
  
  // Common section header patterns
  const sectionPatterns = [
    /^(\d+\.?\s+[A-Z][^\n]{3,80})$/,  // "1. Introduction" or "1 Introduction"
    /^([A-Z][A-Z\s]{3,50})$/,  // "INTRODUCTION" (all caps)
    /^(Abstract|Introduction|Related Work|Methodology|Methods|Results|Discussion|Conclusion|References|Acknowledgments?)/i,
    /^(\d+\.\d+\.?\s+[A-Z][^\n]{3,80})$/  // "1.1 Background"
  ];
  
  let currentPage = 1;
  let lineCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Track approximate page number
    lineCount++;
    if (pages && lineCount > 50 * currentPage) {
      currentPage++;
    }
    
    // Check if line matches section pattern
    for (const pattern of sectionPatterns) {
      const match = line.match(pattern);
      if (match) {
        const title = match[1].trim();
        
        // Determine section level
        const level = determineSectionLevel(title);
        
        // Extract section number if present
        const numberMatch = title.match(/^(\d+(?:\.\d+)*)/);
        const number = numberMatch ? numberMatch[1] : null;
        
        sections.push({
          id: `section-${sections.length}`,
          title,
          number,
          level,
          page: currentPage,
          lineIndex: i
        });
        
        break;
      }
    }
  }
  
  // Build hierarchical structure
  return buildHierarchy(sections);
}

/**
 * Determine section level (1 = main section, 2 = subsection, etc.)
 */
function determineSectionLevel(title) {
  // Check for numbered sections
  const numberMatch = title.match(/^(\d+(?:\.\d+)*)/);
  if (numberMatch) {
    const parts = numberMatch[1].split('.');
    return parts.length;
  }
  
  // All caps = level 1
  if (title === title.toUpperCase()) {
    return 1;
  }
  
  // Default to level 1
  return 1;
}

/**
 * Build hierarchical section structure
 */
function buildHierarchy(sections) {
  const hierarchy = [];
  const stack = [];
  
  for (const section of sections) {
    // Pop stack until we find parent level
    while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
      stack.pop();
    }
    
    // Add parent reference
    if (stack.length > 0) {
      section.parent = stack[stack.length - 1].id;
    }
    
    // Add to hierarchy
    if (section.level === 1) {
      hierarchy.push(section);
    }
    
    stack.push(section);
  }
  
  return sections; // Return flat list with parent references
}

/**
 * Extract paragraphs with coordinates from pages
 */
function extractParagraphs(pages) {
  const paragraphs = [];
  
  for (const page of pages || []) {
    const { items, pageNumber } = page;
    if (!items || items.length === 0) continue;
    
    // Group items into paragraphs based on vertical spacing
    let currentParagraph = [];
    let lastY = null;
    let paragraphStartY = null;
    
    for (const item of items) {
      const text = item.text.trim();
      if (!text) continue;
      
      // Check for paragraph break (large vertical gap)
      if (lastY !== null && Math.abs(item.bbox.y - lastY) > 20) {
        // Save current paragraph
        if (currentParagraph.length > 0) {
          paragraphs.push(createParagraph(currentParagraph, pageNumber, paragraphStartY));
          currentParagraph = [];
          paragraphStartY = null;
        }
      }
      
      if (paragraphStartY === null) {
        paragraphStartY = item.bbox.y;
      }
      
      currentParagraph.push(item);
      lastY = item.bbox.y;
    }
    
    // Save last paragraph
    if (currentParagraph.length > 0) {
      paragraphs.push(createParagraph(currentParagraph, pageNumber, paragraphStartY));
    }
  }
  
  return paragraphs;
}

/**
 * Create paragraph object from text items
 */
function createParagraph(items, pageNumber, startY) {
  const text = items.map(item => item.text).join(' ').trim();
  
  // Calculate bounding box
  const minX = Math.min(...items.map(item => item.bbox.x));
  const maxX = Math.max(...items.map(item => item.bbox.x + item.bbox.width));
  const minY = Math.min(...items.map(item => item.bbox.y));
  const maxY = Math.max(...items.map(item => item.bbox.y + item.bbox.height));
  
  return {
    id: `para-${pageNumber}-${Math.round(startY)}`,
    text,
    page: pageNumber,
    bbox: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    },
    wordCount: text.split(/\s+/).length
  };
}

/**
 * Extract figures and captions
 */
function extractFigures(fullText, pages) {
  const figures = [];
  const lines = fullText.split('\n');
  
  // Pattern for figure captions
  const figurePattern = /^(Figure|Fig\.?|Table)\s+(\d+)[:\.]?\s*(.{0,200})/i;
  
  let currentPage = 1;
  let lineCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Track approximate page number
    lineCount++;
    if (pages && lineCount > 50 * currentPage) {
      currentPage++;
    }
    
    const match = line.match(figurePattern);
    if (match) {
      const type = match[1].toLowerCase().includes('table') ? 'table' : 'figure';
      const number = match[2];
      const caption = match[3].trim();
      
      figures.push({
        id: `${type}-${number}`,
        type,
        number,
        caption,
        page: currentPage,
        lineIndex: i
      });
    }
  }
  
  return figures;
}

/**
 * Find section containing a specific paragraph
 */
export function findSectionForParagraph(paragraphId, sections, paragraphs) {
  const paragraph = paragraphs.find(p => p.id === paragraphId);
  if (!paragraph) return null;
  
  // Find the last section before this paragraph's page
  let matchingSection = null;
  for (const section of sections) {
    if (section.page <= paragraph.page) {
      matchingSection = section;
    } else {
      break;
    }
  }
  
  return matchingSection;
}

/**
 * Get paragraphs in a specific section
 */
export function getParagraphsInSection(sectionId, sections, paragraphs) {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return [];
  
  // Find next section to determine range
  const sectionIndex = sections.findIndex(s => s.id === sectionId);
  const nextSection = sections[sectionIndex + 1];
  
  const startPage = section.page;
  const endPage = nextSection ? nextSection.page : Infinity;
  
  return paragraphs.filter(p => p.page >= startPage && p.page < endPage);
}
