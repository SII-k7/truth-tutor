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
};

const elements = Object.fromEntries(fields.map((id) => [id, document.getElementById(id)]));
const chatThread = document.getElementById('chat-thread');
const emptyThread = document.getElementById('empty-thread');
const statusText = document.getElementById('status-text');
const runButton = document.getElementById('run-diagnosis');
const pdfFrame = document.getElementById('pdf-frame');
const pdfEmpty = document.getElementById('pdf-empty');
const paperCaption = document.getElementById('paper-caption');

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
  elements.mode.addEventListener('change', handleModeChange);
  runButton.addEventListener('click', runDiagnosis);
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

function seedConversation() {
  state.messages = [];
  renderMessages();
}

function updateViewerFromComposer() {
  const text = elements.confusion.value.trim();
  const paper = extractPaperContext(text);

  elements.paperUrl.value = paper.paperUrl || '';
  elements.paperId.value = paper.paperId || '';
  elements.paperTitle.value = paper.paperTitle || '';
  elements.topic.value = paper.paperTitle || paper.paperId || fallbackTopic();

  const pdfUrl = resolvePdfUrl(paper);
  if (pdfUrl) {
    const framedUrl = withPdfFragment(pdfUrl);
    if (pdfFrame.dataset.src !== framedUrl) {
      pdfFrame.src = framedUrl;
      pdfFrame.dataset.src = framedUrl;
    }
    paperCaption.textContent = paper.paperTitle || paper.paperId || pdfUrl;
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
  if (urlMatch) {
    context.paperUrl = normalizePaperUrl(urlMatch[0]);
  }

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

    const response = await postJson('/api/ask', {
      input,
      timeoutMs: 180000,
    });

    replaceMessage(loadingId, {
      role: 'assistant',
      content: response.result.content,
    });

    statusText.textContent = response.result.model;
  } catch (error) {
    pushMessage({ role: 'assistant', content: `这次没跑通：${error.message}` });
    showError(error);
  } finally {
    setBusy(false);
  }
}

function buildInputPayload(raw) {
  const paper = extractPaperContext(raw);
  const mode = elements.mode.value;
  const payload = {
    mode,
    strictness: elements.strictness.value,
    language: 'Chinese',
    confusion: raw,
    topic: paper.paperTitle || paper.paperId || fallbackTopic(),
    paperTitle: paper.paperTitle || undefined,
    paperId: paper.paperId || undefined,
    paperUrl: resolvePdfUrl(paper) || undefined,
    extraContext: buildConversationContext(),
  };

  if (mode === 'alphaxiv') {
    payload.userQuestion = raw;
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
  if (!state.messages.length) {
    emptyThread.style.display = 'flex';
    chatThread.querySelectorAll('.chat-message').forEach((node) => node.remove());
    return;
  }

  emptyThread.style.display = 'none';
  chatThread.querySelectorAll('.chat-message').forEach((node) => node.remove());

  state.messages.forEach((message) => {
    const article = document.createElement('article');
    article.className = `chat-message ${message.role}`;
    article.innerHTML = `
      <div class="message-bubble">
        <span class="message-role">${message.role === 'assistant' ? 'Truth Tutor' : 'You'}${message.loading ? '<span class="loading-dot"></span>' : ''}</span>
        <div class="message-content ${message.compact ? 'compact' : ''}"></div>
      </div>
    `;
    article.querySelector('.message-content').textContent = message.content || '';
    chatThread.appendChild(article);
  });

  chatThread.scrollTop = chatThread.scrollHeight;
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
