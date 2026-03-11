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

  const titleUrl = `${ARXIV_API}?search_query=${encodeURIComponent(`ti:"${cleanQuery}"`)}&start=0&max_results=${maxResults}`;
  let entries = parseArxivFeed(await fetchText(titleUrl)).slice(0, maxResults);

  if (!entries.length) {
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

  return {
    ...normalized,
    paperId: paperRef.paperId,
    paperUrl: normalized.paperUrl || enriched.paperUrl,
    paperTitle: normalized.paperTitle || enriched.paperTitle,
    topic: normalized.topic || enriched.paperTitle || paperRef.paperId,
    paperDomain: normalized.paperDomain || enriched.paperDomain,
    paperSummary: enriched.paperSummary,
    paperExtract: selectRelevantExcerpt(enriched.paperParagraphs || [], normalized.confusion) || enriched.paperExtractDefault,
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
  const paperExtractDefault = paperParagraphs.join('\n\n').slice(0, MAX_EXTRACT_CHARS);

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
  const abstractBlock = html.match(/<div[^>]*class="[^"]*ltx_abstract[^"]*"[\s\S]*?<\/div>/i)?.[0] || '';
  const abstractParagraphs = extractParagraphs(abstractBlock);

  const paragraphs = extractParagraphs(html)
    .filter((paragraph) => paragraph.length > 40)
    .filter((paragraph) => !/content selection saved|describe the issue below|license: arxiv\.org|skip to main content/i.test(paragraph));

  const deduped = [];
  const seen = new Set();

  for (const paragraph of [...abstractParagraphs, ...paragraphs]) {
    const key = paragraph.slice(0, 180);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(paragraph);
    }
    if (deduped.length >= 60) {
      break;
    }
  }

  return deduped;
}

function extractParagraphs(html) {
  return Array.from(html.matchAll(/<p[^>]*class="[^"]*ltx_p[^"]*"[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => match[1])
    .map((text) => text.replace(/<math[\s\S]*?<\/math>/gi, ' [MATH] '))
    .map((text) => text.replace(/<[^>]+>/g, ' '))
    .map((text) => normalizeWhitespace(decodeEntities(text)))
    .filter(Boolean);
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

function selectRelevantExcerpt(paragraphs, confusion) {
  if (!Array.isArray(paragraphs) || !paragraphs.length) {
    return '';
  }

  const keywords = extractKeywords(confusion);
  if (!keywords.length) {
    return paragraphs.join('\n\n').slice(0, MAX_EXTRACT_CHARS);
  }

  const scored = paragraphs
    .map((paragraph, index) => ({
      index,
      paragraph,
      score: scoreParagraph(paragraph, keywords),
    }))
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
