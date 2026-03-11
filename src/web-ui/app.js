const fields = [
  'mode',
  'strictness',
  'topic',
  'paperTitle',
  'paperId',
  'paperUrl',
  'paperDomain',
  'paperStage',
  'confusionLocation',
  'mainBlocker',
  'studyLevel',
  'weeklyHours',
  'goals',
  'confusion',
  'currentUnderstanding',
  'extraContext',
  'userQuestion',
  'aiAnswer',
  'userReaction',
];

const state = {
  messages: [],
  isBusy: false,
  searchResults: [],
};

const elements = Object.fromEntries(fields.map((id) => [id, document.getElementById(id)]));
const chatThread = document.getElementById('chat-thread');
const emptyThread = document.getElementById('empty-thread');
const statusText = document.getElementById('status-text');
const runButton = document.getElementById('run-diagnosis');
const pdfFrame = document.getElementById('pdf-frame');
const pdfEmpty = document.getElementById('pdf-empty');
const paperCaption = document.getElementById('paper-caption');
const paperSearch = document.getElementById('paper-search');
const paperResults = document.getElementById('paper-results');
const mascot = document.getElementById('ai-mascot');
const mascotThinking = document.getElementById('mascot-thinking');

init().catch(showError);
bindEvents();

async function init() {
  const info = await fetchJson('/api/info');
  document.querySelectorAll('[data-target]').forEach(bindSegmentedGroup);
  statusText.textContent = `${info.api.model || 'model'} · ready`;
  seedConversation();
  updateViewerFromComposer();
}

function bindEvents() {
  elements.confusion.addEventListener('input', updateViewerFromComposer);
  elements.confusion.addEventListener('keydown', handleComposerKeydown);
  elements.mode.addEventListener('change', handleModeChange);
  runButton.addEventListener('click', runDiagnosis);
  paperSearch.addEventListener('keydown', handleSearchKeydown);
  paperSearch.addEventListener('input', () => {
    if (!paperSearch.value.trim()) {
      hideSearchResults();
    }
  });
  document.addEventListener('click', (event) => {
    if (!paperResults.contains(event.target) && event.target !== paperSearch) {
      hideSearchResults();
    }
  });

  bindMascotInteractions();
}

function bindMascotInteractions() {
  if (!mascot) return;

  document.addEventListener('mousemove', (event) => {
    const rect = mascot.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;

    const max = 2.2;
    const nx = Math.max(-max, Math.min(max, dx / 120));
    const ny = Math.max(-max, Math.min(max, dy / 120));

    mascot.querySelectorAll('.mascot-eye').forEach((eye) => {
      eye.style.transform = `translate(${nx}px, ${ny}px)`;
    });
  });

  mascot.addEventListener('click', () => {
    // subtle premium feedback: tiny pulse + spark
    mascot.classList.add('clicked');
    setTimeout(() => mascot.classList.remove('clicked'), 300);
    spawnMascotSpark();
  });
}

function spawnMascotSpark() {
  const spark = document.createElement('div');
  spark.className = 'mascot-spark';
  spark.style.left = `${Math.random() * 36 + 6}px`;
  spark.style.top = `${Math.random() * 36 + 6}px`;
  mascot.appendChild(spark);
  setTimeout(() => spark.remove(), 520);
}

function bindSegmentedGroup(group) {
  const target = group.dataset.target;
  const hiddenSelect = document.getElementById(target);

  group.querySelectorAll('.seg-btn').forEach((button) => {
    button.addEventListener('click', () => {
      group.querySelectorAll('.seg-btn').forEach((node) => node.classList.remove('active'));
      button.classList.add('active');
      hiddenSelect.value = button.dataset.value;
      hiddenSelect.dispatchEvent(new Event('change'));
    });
  });
}

function handleModeChange() {
  seedConversation();
}

function handleComposerKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    runDiagnosis();
  }
}

async function handleSearchKeydown(event) {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  await runPaperSearch();
}

async function runPaperSearch() {
  const query = paperSearch.value.trim();
  if (!query) return;

  statusText.textContent = 'searching arXiv…';

  try {
    const { items } = await fetchJson(`/api/arxiv-search?q=${encodeURIComponent(query)}`);
    state.searchResults = items || [];
    renderSearchResults();
    statusText.textContent = items?.length ? `${items.length} result(s)` : 'no results';

    if (items?.length === 1) {
      loadPaper(items[0]);
      hideSearchResults();
    }
  } catch (error) {
    showError(error);
  }
}

function renderSearchResults() {
  if (!state.searchResults.length) {
    hideSearchResults();
    return;
  }

  paperResults.innerHTML = state.searchResults
    .map(
      (item, index) => `
        <button class="paper-result-item" data-index="${index}" type="button">
          <span class="paper-result-title">${escapeHtml(item.title || item.paperId || 'Untitled')}</span>
          <span class="paper-result-meta">${escapeHtml(item.paperId || '')}${item.published ? ` · ${escapeHtml(item.published.slice(0, 4))}` : ''}</span>
        </button>
      `,
    )
    .join('');

  paperResults.querySelectorAll('.paper-result-item').forEach((button) => {
    button.addEventListener('click', () => {
      const item = state.searchResults[Number(button.dataset.index)];
      loadPaper(item);
      hideSearchResults();
    });
  });

  paperResults.classList.remove('hidden');
}

function hideSearchResults() {
  paperResults.innerHTML = '';
  paperResults.classList.add('hidden');
}

function loadPaper(item) {
  if (!item) return;

  elements.paperTitle.value = item.title || '';
  elements.paperId.value = item.paperId || '';
  elements.paperUrl.value = item.pdfUrl || '';
  elements.paperDomain.value = item.primaryCategory || '';
  elements.topic.value = item.title || item.paperId || fallbackTopic();
  paperSearch.value = item.title || '';

  const existing = elements.confusion.value.trim();
  if (!existing) {
    elements.confusion.value = item.paperId
      ? `${item.paperId}\n\n我现在卡住的地方是：`
      : `${item.title}\n\n我现在卡住的地方是：`;
  }

  updateViewerFromComposer();
  statusText.textContent = `loaded ${item.paperId || item.title}`;
}

function seedConversation() {
  state.messages = [];
  renderMessages();
}

function updateViewerFromComposer() {
  const text = elements.confusion.value.trim();
  const paper = extractPaperContext(text);

  elements.paperUrl.value = paper.paperUrl || elements.paperUrl.value || '';
  elements.paperId.value = paper.paperId || elements.paperId.value || '';
  elements.paperTitle.value = paper.paperTitle || elements.paperTitle.value || '';
  elements.topic.value = elements.paperTitle.value || elements.paperId.value || fallbackTopic();

  const pdfUrl = resolvePdfUrl({
    paperUrl: elements.paperUrl.value,
    paperId: elements.paperId.value,
  });

  if (pdfUrl) {
    const framedUrl = withPdfFragment(pdfUrl);
    if (pdfFrame.dataset.src !== framedUrl) {
      pdfFrame.src = framedUrl;
      pdfFrame.dataset.src = framedUrl;
    }
    paperCaption.textContent = elements.paperTitle.value || elements.paperId.value || pdfUrl;
    pdfEmpty.classList.remove('visible');
  } else {
    if (pdfFrame.dataset.src) {
      pdfFrame.src = 'about:blank';
      pdfFrame.dataset.src = '';
    }
    paperCaption.textContent = 'No paper loaded';
    pdfEmpty.classList.add('visible');
  }
}

function extractPaperContext(text) {
  const context = {
    paperUrl: '',
    paperId: '',
    paperTitle: '',
  };

  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) context.paperUrl = normalizePaperUrl(urlMatch[0]);

  const idMatch = text.match(/(?:arxiv:)?(\d{4}\.\d{4,5}(?:v\d+)?)/i);
  if (idMatch) {
    context.paperId = idMatch[1];
  } else if (context.paperUrl) {
    const fromUrl = context.paperUrl.match(/(\d{4}\.\d{4,5}(?:v\d+)?)/i);
    if (fromUrl) context.paperId = fromUrl[1];
  }

  const titleLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^title\s*:/i.test(line));

  if (titleLine) {
    context.paperTitle = titleLine.replace(/^title\s*:/i, '').trim();
  }

  return context;
}

function normalizePaperUrl(url) {
  if (/arxiv\.org\/abs\//i.test(url)) {
    return url.replace(/\/abs\//i, '/pdf/').replace(/(\?.*)?$/, '.pdf');
  }
  return url;
}

function resolvePdfUrl(paper) {
  if (paper.paperUrl && (/\.pdf($|#|\?)/i.test(paper.paperUrl) || /arxiv\.org\/pdf\//i.test(paper.paperUrl))) {
    return paper.paperUrl;
  }
  if (paper.paperId) {
    return `https://arxiv.org/pdf/${paper.paperId}.pdf`;
  }
  return '';
}

function withPdfFragment(url) {
  return url.includes('#') ? url : `${url}#view=FitH`;
}

async function runDiagnosis() {
  try {
    const raw = elements.confusion.value.trim();
    if (!raw) {
      statusText.textContent = '先写点东西。';
      return;
    }

    const input = buildInputPayload(raw);
    const preview = raw.length > 220 ? `${raw.slice(0, 220)}…` : raw;

    pushMessage({ role: 'user', content: preview, compact: true });
    const loadingId = pushMessage({ role: 'assistant', content: '我在看。', loading: true });
    setBusy(true, 'thinking…');
    if (mascotThinking) mascotThinking.classList.add('active');

    const response = await postJson('/api/ask', {
      input,
      timeoutMs: 180000,
    });

    const options = parseInteractiveOptions(response.result.content);
    replaceMessage(loadingId, {
      role: 'assistant',
      content: response.result.content,
      options,
    });

    statusText.textContent = response.result.model;
  } catch (error) {
    pushMessage({ role: 'assistant', content: `这次没跑通：${error.message}` });
    showError(error);
  } finally {
    setBusy(false);
    if (mascotThinking) mascotThinking.classList.remove('active');
  }
}

function parseInteractiveOptions(content) {
  // Look for patterns like:
  // - "你可以先攻克:" followed by numbered items
  // - "建议先读:" followed by items
  // - "## 薄弱点" or "## 优先" sections
  const lines = content.split('\n');
  const options = [];
  let inOptionSection = false;

  const startMarkers = [
    '薄弱点', '先攻克', '建议先', '优先', '可以先', 
    'missing foundations', 'prerequisite', 'foundations'
  ];

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();

    if (!inOptionSection) {
      if (startMarkers.some(m => trimmed.includes(m.toLowerCase()))) {
        inOptionSection = true;
      }
      continue;
    }

    // Stop at next section heading
    if (/^#{1,3}\s/.test(line) && !startMarkers.some(m => line.toLowerCase().includes(m.toLowerCase()))) {
      break;
    }

    // Capture list items
    const itemMatch = line.match(/^[-*•]\s*(.+)$/);
    const numMatch = line.match(/^\d+[.)]\s*(.+)$/);
    if (itemMatch || numMatch) {
      const text = (itemMatch?.[1] || numMatch?.[1] || '').trim();
      if (text.length > 4 && text.length < 120) {
        options.push(text);
      }
    }
  }

  return options.slice(0, 4);
}

function buildInputPayload(raw) {
  const mode = elements.mode.value;
  const payload = {
    mode,
    strictness: elements.strictness.value,
    language: 'Chinese',
    confusion: raw,
    topic: elements.paperTitle.value || elements.paperId.value || fallbackTopic(),
    paperTitle: elements.paperTitle.value || undefined,
    paperId: elements.paperId.value || undefined,
    paperUrl: resolvePdfUrl({ paperUrl: elements.paperUrl.value, paperId: elements.paperId.value }) || undefined,
    paperDomain: elements.paperDomain.value || undefined,
    extraContext: buildConversationContext(),
  };

  if (mode === 'alphaxiv') {
    payload.userQuestion = raw;
    payload.userReaction = raw;
  }

  return compact(payload);
}

function fallbackTopic() {
  const mode = elements.mode.value;
  if (mode === 'alphaxiv') return 'alphaXiv recovery';
  if (mode === 'general') return 'learning diagnosis';
  return 'paper reading';
}

function buildConversationContext() {
  const recent = state.messages
    .filter((message) => !message.loading)
    .slice(-4)
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}:\n${message.content}`)
    .join('\n\n');

  return recent || undefined;
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== ''));
}

function pushMessage(message) {
  const id = crypto.randomUUID();
  state.messages.push({ id, ...message });
  renderMessages();
  return id;
}

function replaceMessage(id, nextMessage) {
  const index = state.messages.findIndex((message) => message.id === id);
  if (index >= 0) state.messages[index] = { id, ...nextMessage };
  renderMessages();
}

function renderMessages() {
  chatThread.querySelectorAll('.chat-message').forEach((node) => node.remove());

  if (!state.messages.length) {
    emptyThread.style.display = 'flex';
    return;
  }

  emptyThread.style.display = 'none';

  state.messages.forEach((message) => {
    const article = document.createElement('article');
    article.className = `chat-message ${message.role}`;

    let optionsHtml = '';
    if (message.options?.length && !message.loading) {
      optionsHtml = `
        <div class="interactive-options">
          <span class="interactive-label">你可以先攻克：</span>
          ${message.options.map((opt, i) => `
            <button class="option-btn" data-option="${i}">${escapeHtml(opt)}</button>
          `).join('')}
        </div>
      `;
    }

    article.innerHTML = `
      <div class="message-bubble">
        <span class="message-role">${message.role === 'assistant' ? 'Truth Tutor' : 'You'}${message.loading ? '<span class="loading-dot"></span>' : ''}</span>
        <div class="message-content ${message.compact ? 'compact' : ''}">${renderMarkdownLite(message.content || '', message.compact)}</div>
        ${optionsHtml}
      </div>
    `;

    article.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const optIdx = Number(btn.dataset.option);
        const selected = message.options[optIdx];
        if (selected) {
          elements.confusion.value = `继续深入：${selected}\n\n我的问题是：`;
          elements.confusion.focus();
        }
      });
    });

    chatThread.appendChild(article);
  });

  chatThread.scrollTop = chatThread.scrollHeight;
}

function renderMarkdownLite(text, compact = false) {
  if (compact) {
    return escapeHtml(text).replace(/\n/g, '<br />');
  }

  const lines = String(text || '').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${inlineFormat(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list?.items?.length) return;
    const tag = list.type === 'ol' ? 'ol' : 'ul';
    blocks.push(`<${tag}>${list.items.map((item) => `<li>${inlineFormat(item)}</li>`).join('')}</${tag}>`);
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length + 1, 4);
      blocks.push(`<h${level}>${inlineFormat(heading[2])}</h${level}>`);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.*)$/);
    if (unordered) {
      flushParagraph();
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(unordered[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks.join('');
}

function inlineFormat(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function setBusy(isBusy, label) {
  state.isBusy = isBusy;
  runButton.disabled = isBusy;
  if (label) statusText.textContent = label;
}

async function fetchJson(url) {
  const response = await fetch(url);
  return parseResponse(response);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showError(error) {
  statusText.textContent = error.message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
