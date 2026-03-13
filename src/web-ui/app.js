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
  lastSearchToken: 0,
  drills: [],
  profile: null,
  paperEvidenceIndex: {},
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
  
  // Load learning profile and drills on startup
  loadProfile();
  loadDrills();
}

async function loadProfile() {
  try {
    const data = await fetchJson('/api/profile');
    state.profile = data;
    if (data.recurringGaps?.length) {
      console.log('Learning profile loaded:', data.recurringGaps);
    }
  } catch (e) {
    console.log('Profile not available');
  }
}

async function loadDrills() {
  try {
    const data = await fetchJson('/api/drills');
    state.drills = data.items || [];
  } catch (e) {
    state.drills = [];
  }
}

function bindEvents() {
  elements.confusion.addEventListener('input', updateViewerFromComposer);
  elements.confusion.addEventListener('keydown', handleComposerKeydown);
  elements.mode.addEventListener('change', handleModeChange);
  runButton.addEventListener('click', runDiagnosis);
  paperSearch.addEventListener('keydown', handleSearchKeydown);
  paperSearch.addEventListener('focus', () => {
    if (state.searchResults.length) {
      paperResults.style.display = 'block';
    }
  });
  paperSearch.addEventListener('input', () => {
    const query = paperSearch.value.trim();
    if (!query) {
      hideSearchResults();
      state.searchResults = [];
      return;
    }

    // Immediate search with minimal debounce (80ms for responsive feel)
    clearTimeout(paperSearch._debounce);
    paperSearch._debounce = setTimeout(() => {
      runPaperSearch({ auto: true });
    }, 80);
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

    // Rotate entire 3D head based on mouse position
    const maxRot = 20;
    const rx = Math.max(-maxRot, Math.min(maxRot, dy / 24));
    const ry = Math.max(-maxRot, Math.min(maxRot, dx / 24));

    const head = mascot.querySelector('.mascot-head-3d');
    if (head) {
      head.style.transform = `translateZ(8px) rotateX(${-rx}deg) rotateY(${ry}deg)`;
    }

    mascot.querySelectorAll('.pupil').forEach((pupil) => {
      const px = Math.max(-1.5, Math.min(1.5, dx / 180));
      const py = Math.max(-1.5, Math.min(1.5, dy / 180));
      pupil.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
    });
  });

  mascot.addEventListener('click', () => {
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
  await runPaperSearch({ auto: false });
}

async function runPaperSearch({ auto = false } = {}) {
  const query = paperSearch.value.trim();
  if (!query) return;

  const searchToken = ++state.lastSearchToken;
  statusText.textContent = 'searching arXiv…';

  try {
    const { items } = await fetchJson(`/api/arxiv-search?q=${encodeURIComponent(query)}`);
    if (searchToken !== state.lastSearchToken) return;

    state.searchResults = items || [];
    renderSearchResults();
    statusText.textContent = items?.length ? `${items.length} result(s)` : 'no results';

    if (!auto && items?.length === 1) {
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

  paperResults.style.display = 'block';
}

function hideSearchResults() {
  paperResults.innerHTML = '';
  paperResults.style.display = 'none';
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

function parseDrills(content) {
  const drills = [];
  const lines = content.split('\n');
  let inDrillSection = false;
  let currentDrill = null;
  
  const sectionMarkers = [
    'verification drills', 'practice drills', 'drills', 
    '验证', '练习', 'drill'
  ];
  
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    
    // Detect drill section start
    if (!inDrillSection && sectionMarkers.some(m => trimmed.includes(m))) {
      inDrillSection = true;
      continue;
    }
    
    // Stop at next major section
    if (inDrillSection && /^#{1,2}\s+[^d]/.test(line) && !sectionMarkers.some(m => line.toLowerCase().includes(m))) {
      break;
    }
    
    if (!inDrillSection) continue;
    
    // Parse drill items - look for bullet points or numbered items
    const bulletMatch = line.match(/^[-*•]\s*(.+)$/);
    const numMatch = line.match(/^\d+[.)]\s*(.+)$/);
    
    if (bulletMatch || numMatch) {
      const text = (bulletMatch?.[1] || numMatch?.[1] || '').trim();
      if (text.length > 5 && text.length < 200) {
        // Extract task (everything before Pass/Fail keywords)
        const taskMatch = text.match(/^(.+?)(?:\s+(pass|fail|通过|完成)|$)/i);
        const task = taskMatch ? taskMatch[1].trim() : text;
        
        drills.push({
          id: crypto.randomUUID(),
          task: task,
          completed: false,
          evidence: extractEvidenceFromText(text),
        });
      }
    }
  }
  
  return drills.slice(0, 5); // Max 5 drills
}

function extractEvidenceFromText(text) {
  // Look for paragraph references like [P12], P5, etc.
  const paraMatch = text.match(/\[?P(\d+)\]?/i) || text.match(/paragraph\s*(\d+)/i);
  if (paraMatch) {
    return { paragraph: `P${paraMatch[1]}` };
  }
  return null;
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

    // Clear input IMMEDIATELY after capturing the value - before any async operations
    elements.confusion.value = '';

    pushMessage({ role: 'user', content: preview, compact: true });
    const loadingId = pushMessage({ role: 'assistant', content: '我在看。', loading: true });
    setBusy(true, 'thinking…');
    if (mascotThinking) mascotThinking.classList.add('active');

    const response = await postJson('/api/ask', {
      input,
      timeoutMs: 180000,
    });

    const options = parseInteractiveOptions(response.result.content);
    const drills = parseDrills(response.result.content);
    
    // Save drills to state and backend
    if (drills.length) {
      state.drills = [...state.drills, ...drills.map(d => ({ ...d, completed: false }))];
      await postJson('/api/drills', { items: state.drills });
    }
    
    // Update profile from response
    if (response.profile) {
      state.profile = response.profile;
    }

    // Store paper evidence index for auto-quote in evidence cards
    if (response.paperEvidenceIndex) {
      state.paperEvidenceIndex = response.paperEvidenceIndex;
    }

    replaceMessage(loadingId, {
      role: 'assistant',
      content: response.result.content,
      options,
      drills,
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


function parseEvidence(text) {
  const evidenceSection = text.match(/##\s*Evidence([\s\S]*?)(?:\n##\s|$)/i)?.[1] || '';
  const items = [];
  const lines = evidenceSection.split('\n');
  let current = null;
  
  for (const line of lines) {
    if (line.match(/^\s*-\s*Claim:/i)) {
      if (current) items.push(current);
      current = { claim: line.replace(/^\s*-\s*Claim:\s*/i, '').trim() };
    } else if (current && line.match(/^\s*-\s*Section:/i)) {
      current.section = line.replace(/^\s*-\s*Section:\s*/i, '').trim();
    } else if (current && line.match(/^\s*-\s*Paragraph:/i)) {
      current.paragraph = line.replace(/^\s*-\s*Paragraph:\s*/i, '').trim();
    } else if (current && line.match(/^\s*-\s*Quote:/i)) {
      current.quote = line.replace(/^\s*-\s*Quote:\s*/i, '').trim().replace(/^["']|["']$/g, '');
    }
  }
  if (current) items.push(current);
  return items;
}

function renderEvidence(items) {
  if (!items?.length) return '';
  
  return `
    <div class="evidence-cards">
      <h4>📚 Evidence</h4>
      ${items.map(item => {
        // Try to auto-fill from paperEvidenceIndex if paragraph tag exists
        let section = item.section;
        let paragraph = item.paragraph;
        let quote = item.quote;
        
        // Look for tags like [S3.2-P12] or [P12]
        const tagMatch = (item.paragraph || '').match(/\[(S?\d+[-P]?\d*)\]/i) || (item.claim || '').match(/\[(S?\d+[-P]?\d*)\]/i);
        if (tagMatch && state.paperEvidenceIndex) {
          const tag = tagMatch[1].toUpperCase().replace('P', '-P');
          const found = state.paperEvidenceIndex[tag] || state.paperEvidenceIndex['S' + tag] || Object.values(state.paperEvidenceIndex).find(v => v.sectionId === tag);
          if (found) {
            section = section || found.sectionTitle;
            paragraph = paragraph || tag;
            quote = quote || (found.text ? found.text.slice(0, 200) + (found.text.length > 200 ? '...' : '') : null);
          }
        }
        
        return `
        <div class="evidence-card">
          <div class="evidence-claim">${escapeHtml(item.claim || 'N/A')}</div>
          ${section ? `<div class="evidence-meta">📖 Section: ${escapeHtml(section)}</div>` : ''}
          ${paragraph && paragraph !== 'N/A' ? `<div class="evidence-meta">🔖 ${escapeHtml(paragraph)}</div>` : ''}
          ${quote && quote !== 'N/A' ? `<div class="evidence-quote">"${escapeHtml(quote)}"</div>` : '<div class="evidence-quote evidence-quote-missing">⚠️ Auto-quote unavailable (paper not loaded or evidence not found)</div>'}
        </div>
      `;
      }).join('')}
    </div>
  `;
}

function renderProfileSummary(profile) {
  if (!profile?.recurringGaps?.length) return '';
  
  // Sort gaps by frequency
  const sortedGaps = profile.recurringGaps
    .map(gap => ({ 
      gap, 
      count: profile.gapFrequency?.[gap] || 1 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  
  return `
    <div class="profile-summary">
      <div class="profile-summary-label">🧠 你的学习画像</div>
      <div class="profile-summary-gaps">
        ${sortedGaps.map(g => {
          const label = g.count > 1 ? `${escapeHtml(g.gap)} (×${g.count})` : escapeHtml(g.gap);
          return `<span>${label}</span>`;
        }).join('')}
      </div>
      ${profile.sessions ? `<div style="font-size:10px;color:#999;margin-top:4px;">已积累 ${profile.sessions} 次诊断</div>` : ''}
    </div>
  `;
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

    // Render drills as interactive checkboxes
    let drillsHtml = '';
    if (message.drills?.length && !message.loading) {
      drillsHtml = `
        <div class="drill-checklist">
          <span class="drill-label">🎯 Verification Drills:</span>
          ${message.drills.map((drill, i) => `
            <label class="drill-item">
              <input type="checkbox" data-drill-id="${drill.id}" />
              <span class="drill-task">${escapeHtml(drill.task)}</span>
              ${drill.evidence?.paragraph ? `<span class="drill-evidence">[${drill.evidence.paragraph}]</span>` : ''}
            </label>
          `).join('')}
        </div>
      `;
    }

    // Parse and render evidence cards from assistant messages
    let evidenceHtml = '';
    if (message.role === 'assistant' && !message.loading && !message.compact) {
      const evidenceItems = parseEvidence(message.content || '');
      evidenceHtml = renderEvidence(evidenceItems);
    }

    // Render profile summary after first assistant response
    let profileHtml = '';
    if (message.role === 'assistant' && !message.loading && state.profile?.recurringGaps?.length) {
      profileHtml = renderProfileSummary(state.profile);
    }

    article.innerHTML = `
      <div class="message-bubble">
        <span class="message-role">${message.role === 'assistant' ? 'Truth Tutor' : 'You'}${message.loading ? '<span class="loading-dot"></span>' : ''}</span>
        <div class="message-content ${message.compact ? 'compact' : ''}">${renderMarkdownLite(message.content || '', message.compact)}</div>
        ${evidenceHtml}
        ${optionsHtml}
        ${drillsHtml}
        ${profileHtml}
      </div>
    `;
    
    // Bind drill checkbox events
    if (message.drills?.length) {
      article.querySelectorAll('.drill-item input').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
          const drillId = e.target.dataset.drillId;
          const completed = e.target.checked;
          
          // Update local state
          const drill = state.drills.find(d => d.id === drillId);
          if (drill) {
            drill.completed = completed;
            // Save to backend
            await postJson('/api/drills', { items: state.drills });
            
            // Visual feedback
            e.target.closest('.drill-item').classList.toggle('completed', completed);
          }
        });
      });
    }

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
