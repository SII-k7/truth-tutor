const CACHE = new Map();
const ARXIV_API = 'https://export.arxiv.org/api/query';
const MAX_SUMMARY_CHARS = 2400;
const MAX_EXTRACT_CHARS = 12000;

export async function searchArxiv(query, maxResults = 5) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) {
    return [];
  }

  const cacheKey = `search:${cleanQuery}:${maxResults}`;
  if (CACHE.has(cacheKey)) {
    return CACHE.get(cacheKey);
  }

  // Fuzzy search: use ti: without quotes for partial title matching
  const titleUrl = `${ARXIV_API}?search_query=${encodeURIComponent(`ti:${cleanQuery}`)}&start=0&max_results=${maxResults}`;
  let entries = parseArxivFeed(await fetchText(titleUrl)).slice(0, maxResults);

  if (!entries.length) {
    // Fallback to all fields search if title search yields no results
    const fallbackUrl = `${ARXIV_API}?search_query=${encodeURIComponent(`all:${cleanQuery}`)}&start=0&max_results=${maxResults}`;
    entries = parseArxivFeed(await fetchText(fallbackUrl)).slice(0, maxResults);
  }

  CACHE.set(cacheKey, entries);
  return entries;
}

export async function enrichInputWithPaperContext(input) {
  const normalized = { ...input };
  const paperRef = await resolvePaperReference(normalized);

  if (!paperRef?.paperId) {
    return normalized;
  }

  const cacheKey = `paper:${paperRef.paperId}`;
  let enriched = CACHE.get(cacheKey);
  if (!enriched) {
    enriched = await fetchPaperContext(paperRef.paperId);
    CACHE.set(cacheKey, enriched);
  }

  const paragraphs = enriched.paperParagraphs || [];
  const excerptParagraphs = selectRelevantExcerpt(paragraphs, normalized.confusion) || [];
  const selected = excerptParagraphs.length ? excerptParagraphs : paragraphs.slice(0, 18);
  const numberedExcerpt = formatNumberedExcerpt(selected);

  return {
    ...normalized,
    paperId: paperRef.paperId,
    paperUrl: normalized.paperUrl || enriched.paperUrl,
    paperTitle: normalized.paperTitle || enriched.paperTitle,
    topic: normalized.topic || enriched.paperTitle || paperRef.paperId,
    paperDomain: normalized.paperDomain || enriched.paperDomain,
    paperSummary: enriched.paperSummary,
    // Provide numbered paragraphs so the model can cite evidence as [Sx-Py]
    paperExtract: numberedExcerpt || enriched.paperExtractDefault,
    // A compact index so UI can auto-fill Section/Quote without trusting the model
    paperEvidenceIndex: buildEvidenceIndex(selected),
    paperContextSource: enriched.paperContextSource,
  };
}

async function resolvePaperReference(input) {
  const directId = extractArxivId(input.paperId) || extractArxivId(input.paperUrl) || extractArxivId(input.confusion);
  if (directId) {
    return { paperId: directId };
  }

  const title = String(input.paperTitle || '').trim();
  if (!title) {
    return null;
  }

  const results = await searchArxiv(title, 1);
  if (!results.length) {
    return null;
  }

  return { paperId: results[0].paperId };
}

async function fetchPaperContext(paperId) {
  const metadata = await fetchArxivMetadata(paperId);
  const htmlUrl = `https://arxiv.org/html/${paperId}`;
  let htmlText = '';

  try {
    htmlText = await fetchText(htmlUrl);
  } catch {
    htmlText = '';
  }

  const paperParagraphs = htmlText ? extractArxivParagraphs(htmlText) : [];
  const paperExtractDefault = paperParagraphs
    .map((p) => (typeof p === 'string' ? p : p.text))
    .join('\n\n')
    .slice(0, MAX_EXTRACT_CHARS);

  return {
    paperId,
    paperTitle: metadata.paperTitle,
    paperUrl: `https://arxiv.org/pdf/${paperId}.pdf`,
    paperDomain: metadata.paperDomain,
    paperSummary: metadata.paperSummary.slice(0, MAX_SUMMARY_CHARS),
    paperParagraphs,
    paperExtractDefault,
    paperContextSource: paperParagraphs.length ? 'arXiv HTML + metadata' : 'arXiv metadata only',
  };
}

async function fetchArxivMetadata(paperId) {
  const xml = await fetchText(`${ARXIV_API}?id_list=${encodeURIComponent(paperId)}`);
  const [entry] = parseArxivFeed(xml);

  return {
    paperTitle: entry?.title || paperId,
    paperSummary: entry?.summary || '',
    paperDomain: entry?.primaryCategory || '',
  };
}

function parseArxivFeed(xml) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries.map((entry) => {
    const idUrl = extractTag(entry, 'id');
    const paperId = extractArxivId(idUrl);
    const primaryCategory = extractAttribute(entry, 'arxiv:primary_category', 'term');

    return {
      idUrl,
      paperId,
      title: normalizeWhitespace(decodeEntities(extractTag(entry, 'title'))),
      summary: normalizeWhitespace(decodeEntities(extractTag(entry, 'summary'))),
      published: extractTag(entry, 'published'),
      primaryCategory,
      pdfUrl: paperId ? `https://arxiv.org/pdf/${paperId}.pdf` : '',
    };
  });
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function extractAttribute(xml, tag, attribute) {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attribute}="([^"]+)"`, 'i'));
  return match ? match[1].trim() : '';
}

function extractArxivId(value) {
  const match = String(value || '').match(/(\d{4}\.\d{4,5}(?:v\d+)?)/i);
  return match ? match[1] : '';
}

function extractArxivParagraphs(html) {
  // Extract in document order: headings + paragraphs.
  // We associate each paragraph with the most recent heading ("section").
  const blocks = extractBlocks(html);

  let currentSection = 'Abstract';
  let sectionIndex = 0;
  const sectionIds = new Map();

  const paragraphs = [];
  for (const block of blocks) {
    if (block.type === 'heading') {
      const title = block.text;
      if (title) {
        currentSection = title;
        if (!sectionIds.has(currentSection)) {
          sectionIndex += 1;
          sectionIds.set(currentSection, `S${sectionIndex}`);
        }
      }
      continue;
    }

    if (block.type === 'para') {
      const text = block.text;
      if (!text || text.length <= 40) continue;
      if (/content selection saved|describe the issue below|license: arxiv\.org|skip to main content/i.test(text)) continue;

      const sectionId = sectionIds.get(currentSection) || 'S0';
      paragraphs.push({ sectionId, sectionTitle: currentSection, text });
      if (paragraphs.length >= 60) break;
    }
  }

  return dedupeParagraphObjects(paragraphs);
}

function extractBlocks(html) {
  const abstractBlock = html.match(/<div[^>]*class="[^"]*ltx_abstract[^"]*"[\s\S]*?<\/div>/i)?.[0] || '';

  const blocks = [];

  // Abstract paragraphs first
  for (const para of extractParagraphs(abstractBlock)) {
    blocks.push({ type: 'para', text: para });
  }

  const patterns = [
    { type: 'heading', re: /<h[1-6][^>]*class="[^"]*ltx_title[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/gi },
    { type: 'para', re: /<p[^>]*class="[^"]*ltx_p[^"]*"[^>]*>([\s\S]*?)<\/p>/gi },
  ];

  // Collect matches with positions
  const matches = [];
  for (const { type, re } of patterns) {
    for (const match of html.matchAll(re)) {
      matches.push({ type, index: match.index ?? 0, raw: match[1] ?? '' });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  for (const m of matches) {
    if (m.type === 'heading') {
      const text = normalizeWhitespace(decodeEntities(stripTags(m.raw)));
      if (text && text.length < 160) blocks.push({ type: 'heading', text });
    } else {
      const text = normalizeWhitespace(decodeEntities(normalizeMath(stripTags(m.raw))));
      if (text) blocks.push({ type: 'para', text });
    }
  }

  return blocks;
}

function normalizeMath(text) {
  return String(text || '').replace(/\s*\[MATH\]\s*/g, ' [MATH] ');
}

function stripTags(htmlText) {
  return String(htmlText || '').replace(/<math[\s\S]*?<\/math>/gi, ' [MATH] ').replace(/<[^>]+>/g, ' ');
}

function extractParagraphs(html) {
  return Array.from(html.matchAll(/<p[^>]*class="[^"]*ltx_p[^"]*"[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => match[1])
    .map((text) => stripTags(text))
    .map((text) => normalizeWhitespace(decodeEntities(text)))
    .filter(Boolean);
}

function dedupeParagraphObjects(items) {
  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    const key = item.text.slice(0, 180);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

// Format paragraphs with [Sx-Py] tags for evidence citation
function formatNumberedExcerpt(paragraphs) {
  if (!Array.isArray(paragraphs) || !paragraphs.length) return '';

  // paragraphs can be strings (legacy) or objects {sectionId, sectionTitle, text}
  return paragraphs
    .map((p, i) => {
      if (typeof p === 'string') {
        return `[P${i + 1}] ${p}`;
      }
      const sectionId = p.sectionId || 'S0';
      return `[${sectionId}-P${i + 1}] ${p.text}`;
    })
    .join('\n\n');
}

function buildEvidenceIndex(paragraphs) {
  if (!Array.isArray(paragraphs) || !paragraphs.length) return {};
  const index = {};
  paragraphs.forEach((p, i) => {
    if (!p || typeof p === 'string') return;
    const tag = `${p.sectionId || 'S0'}-P${i + 1}`;
    index[tag] = {
      sectionId: p.sectionId || 'S0',
      sectionTitle: p.sectionTitle || 'N/A',
      text: p.text || '',
    };
  });
  return index;
}

function selectRelevantExcerpt(paragraphs, confusion) {
  if (!Array.isArray(paragraphs) || !paragraphs.length) {
    return '';
  }

  const keywords = extractKeywords(confusion);
  if (!keywords.length) {
    return paragraphs.join('\n\n').slice(0, MAX_EXTRACT_CHARS);
  }

  const scored = paragraphs
    .map((paragraph, index) => {
      const text = typeof paragraph === 'string' ? paragraph : paragraph.text;
      return {
        index,
        paragraph,
        score: scoreParagraph(text, keywords),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 12)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.paragraph);

  const excerpt = (scored.length ? scored : paragraphs.slice(0, 18)).join('\n\n');
  return excerpt.slice(0, MAX_EXTRACT_CHARS);
}

function extractKeywords(text) {
  return Array.from(
    new Set(
      String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff\- ]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length >= 3)
        .filter((token) => !['this', 'that', 'with', 'from', 'what', 'why', 'please', 'paper', 'section', 'dont', '不要', '直接', '告诉我'].includes(token)),
    ),
  ).slice(0, 12);
}

function scoreParagraph(paragraph, keywords) {
  const haystack = paragraph.toLowerCase();
  return keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'truth-tutor/0.2.0 (+https://github.com/SII-k7/truth-tutor)',
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status}) for ${url}`);
  }

  return response.text();
}
