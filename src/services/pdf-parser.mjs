import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { readFile } from 'node:fs/promises';

/**
 * Parse PDF and extract text with coordinates, metadata, and page boundaries
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<Object>} Parsed PDF data with text, coordinates, and metadata
 */
export async function parsePDF(pdfPath) {
  const dataBuffer = await readFile(pdfPath);
  
  // Parse PDF with pdf-parse
  const pdfData = await pdfParse(dataBuffer, {
    // Extract page-level text
    pagerender: renderPage
  });
  
  // Extract metadata
  const metadata = extractMetadata(pdfData);
  
  // Build structured output
  return {
    metadata,
    numPages: pdfData.numpages,
    pages: pdfData.pages || [],
    fullText: pdfData.text,
    info: pdfData.info
  };
}

/**
 * Custom page renderer to extract text with coordinates
 */
async function renderPage(pageData) {
  const textContent = await pageData.getTextContent();
  const viewport = pageData.getViewport({ scale: 1.0 });
  
  const items = textContent.items.map((item, index) => {
    // Extract transform matrix for positioning
    const transform = item.transform;
    const x = transform[4];
    const y = transform[5];
    const width = item.width;
    const height = item.height;
    
    return {
      id: `item-${pageData.pageNumber}-${index}`,
      text: item.str,
      bbox: {
        x: Math.round(x),
        y: Math.round(viewport.height - y), // Flip Y coordinate
        width: Math.round(width),
        height: Math.round(height)
      },
      fontName: item.fontName,
      fontSize: Math.round(item.height)
    };
  });
  
  // Combine text items into page text
  const pageText = items.map(item => item.text).join(' ');
  
  return {
    pageNumber: pageData.pageNumber,
    text: pageText,
    items,
    viewport: {
      width: viewport.width,
      height: viewport.height
    }
  };
}

/**
 * Extract metadata from PDF (title, authors, abstract)
 */
function extractMetadata(pdfData) {
  const info = pdfData.info || {};
  const text = pdfData.text || '';
  
  // Try to extract title from PDF info or first lines
  let title = info.Title || '';
  if (!title) {
    // Extract first non-empty line as potential title
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    title = lines[0] || 'Untitled';
  }
  
  // Try to extract authors
  let authors = info.Author || '';
  if (!authors) {
    // Look for common author patterns in first few lines
    const authorMatch = text.match(/(?:by|authors?:?)\s*([^\n]+)/i);
    if (authorMatch) {
      authors = authorMatch[1].trim();
    }
  }
  
  // Try to extract abstract
  let abstract = '';
  const abstractMatch = text.match(/abstract[:\s]+([^\n]+(?:\n[^\n]+){0,10})/i);
  if (abstractMatch) {
    abstract = abstractMatch[1].trim().substring(0, 500); // Limit to 500 chars
  }
  
  return {
    title: title.substring(0, 200), // Limit title length
    authors: authors.substring(0, 200),
    abstract,
    subject: info.Subject || '',
    keywords: info.Keywords || '',
    creator: info.Creator || '',
    producer: info.Producer || '',
    creationDate: info.CreationDate || null
  };
}

/**
 * Extract text from specific page range
 */
export async function extractPageRange(pdfPath, startPage, endPage) {
  const parsed = await parsePDF(pdfPath);
  
  if (!parsed.pages || parsed.pages.length === 0) {
    throw new Error('No pages found in PDF');
  }
  
  const start = Math.max(1, startPage);
  const end = Math.min(parsed.numPages, endPage);
  
  const pages = parsed.pages.filter(page => 
    page.pageNumber >= start && page.pageNumber <= end
  );
  
  return {
    pages,
    text: pages.map(p => p.text).join('\n\n')
  };
}

/**
 * Search for text in PDF and return locations
 */
export async function searchInPDF(pdfPath, searchText) {
  const parsed = await parsePDF(pdfPath);
  const results = [];
  
  for (const page of parsed.pages || []) {
    const pageText = page.text.toLowerCase();
    const search = searchText.toLowerCase();
    
    let index = pageText.indexOf(search);
    while (index !== -1) {
      // Find the text items that contain this match
      const matchingItems = findMatchingItems(page.items, index, search.length);
      
      results.push({
        page: page.pageNumber,
        text: searchText,
        context: extractContext(pageText, index, 50),
        items: matchingItems
      });
      
      index = pageText.indexOf(search, index + 1);
    }
  }
  
  return results;
}

function findMatchingItems(items, startIndex, length) {
  let currentIndex = 0;
  const matching = [];
  
  for (const item of items) {
    const itemLength = item.text.length + 1; // +1 for space
    
    if (currentIndex + itemLength > startIndex && currentIndex < startIndex + length) {
      matching.push(item);
    }
    
    currentIndex += itemLength;
    
    if (currentIndex > startIndex + length) break;
  }
  
  return matching;
}

function extractContext(text, index, contextLength) {
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + contextLength);
  return text.substring(start, end);
}
