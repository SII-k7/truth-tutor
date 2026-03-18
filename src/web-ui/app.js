// Import PDF.js components
import { PDFRenderer } from './components/PDFRenderer.js';
import { AnnotationLayer } from './components/AnnotationLayer.js';
import { CoordinateMapper } from './utils/coordinateMapper.js';

// Import Week 3 Navigation & UX components
import { Sidebar } from './components/Sidebar.js';
import { ProgressTracker } from './components/ProgressTracker.js';
import { SectionNavigator } from './components/SectionNavigator.js';
import { AnnotationFilter } from './components/AnnotationFilter.js';
import { OnboardingTour } from './components/OnboardingTour.js';
import { KeyboardShortcuts } from './components/KeyboardShortcuts.js';

// Import Vibero-style components
import { ViberoAnnotationLayer } from './components/AnnotationLayer.vibero.js';
import { ViberoSectionNavigator } from './components/SectionNavigator.vibero.js';

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
  pdfRenderer: null,
  annotationLayer: null,
  coordinateMapper: null,
  currentPdfUrl: null,
  // Week 3 components
  sidebar: null,
  progressTracker: null,
  sectionNavigator: null,
  annotationFilter: null,
  onboardingTour: null,
  keyboardShortcuts: null,
  // Vibero components
  viberoAnnotationLayer: null,
  viberoSectionNavigator: null,
  viberoMode: false, // Toggle between normal and Vibero immersive mode
};

const elements = Object.fromEntries(fields.map((id) => [id, document.getElementById(id)]));
const chatThread = document.getElementById('chat-thread');
const emptyThread = document.getElementById('empty-thread');
const statusText = document.getElementById('status-text');
const runButton = document.getElementById('run-diagnosis');
const pdfContainer = document.getElementById('pdf-container');
const pdfEmpty = document.getElementById('pdf-empty');
const pdfControls = document.getElementById('pdf-controls');
const paperCaption = document.getElementById('paper-caption');
const paperSearch = document.getElementById('paper-search');
const paperResults = document.getElementById('paper-results');
const mascot = document.getElementById('ai-mascot');
const mascotThinking = document.getElementById('mascot-thinking');
const darkModeToggle = document.getElementById('dark-mode-toggle');


// Paper search functionality removed - using runPaperSearch instead (see bindEvents function)

init().catch(showError);
bindEvents();

async function init() {
  const info = await fetchJson('/api/info');
  document.querySelectorAll('[data-target]').forEach(bindSegmentedGroup);
  statusText.textContent = `${info.api.model || 'model'} · ready`;
  seedConversation();
  
  // Initialize PDF.js components
  initPDFComponents();
  
  // Initialize Week 3 Navigation & UX components
  initNavigationComponents();
  
  updateViewerFromComposer();
  
  // Load learning profile and drills on startup
  loadProfile();
  loadDrills();
  
  // Initialize dark mode
  initDarkMode();
  
  // Initialize Vibero mode
  initViberoMode();
  
  // Initialize WebSocket connection
  connectWebSocket();
  
  // Bind analyze button
  const analyzeBtn = document.getElementById('analyze-paper-btn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzePaper);
  }
  
  // Bind tour button
  const tourBtn = document.getElementById('tour-button');
  if (tourBtn) {
    tourBtn.addEventListener('click', () => {
      if (state.onboardingTour) {
        state.onboardingTour.start();
      }
    });
  }
}

function initPDFComponents() {
  // Initialize PDFRenderer
  state.pdfRenderer = new PDFRenderer(pdfContainer);
  
  // Initialize AnnotationLayer (normal mode)
  state.annotationLayer = new AnnotationLayer(pdfContainer);
  
  // Initialize ViberoAnnotationLayer (Vibero mode)
  state.viberoAnnotationLayer = new ViberoAnnotationLayer(pdfContainer, {
    enableTranslation: true,
    enableAIExplanation: true,
    locale: 'zh-CN'
  });
  
  // Initialize CoordinateMapper
  state.coordinateMapper = new CoordinateMapper();
  
  // Listen to PDF events
  state.pdfRenderer.on('documentLoaded', (data) => {
    console.log('PDF loaded:', data);
    pdfControls.style.display = 'flex';
    updatePageInfo();
    
    // Load test annotations
    loadTestAnnotations();
    
    // Initialize progress tracker for this document
    if (state.progressTracker && elements.paperId.value) {
      state.progressTracker.initialize(elements.paperId.value, data.numPages);
    }
    
    // Load document outline (mock data for now)
    loadDocumentOutline(data.numPages);
  });
  
  state.pdfRenderer.on('pageChange', (data) => {
    console.log('Page changed:', data);
    updatePageInfo();
    
    // Update coordinate mapper
    state.coordinateMapper.updateViewport(
      data.viewport,
      state.pdfRenderer.canvas
    );
    
    // Update annotation layer dimensions
    state.annotationLayer.updateDimensions(
      data.viewport.width,
      data.viewport.height
    );
    
    // Re-render annotations for current page
    renderAnnotationsForPage(data.pageNum);
    
    // Update progress tracker
    if (state.progressTracker) {
      state.progressTracker.updateProgress(data.pageNum);
    }
    
    // Update sidebar progress indicator
    if (state.sidebar) {
      state.sidebar.updateProgress({ page: data.pageNum });
    }
  });
  
  // Bind PDF control buttons
  document.getElementById('prev-page').addEventListener('click', () => {
    state.pdfRenderer.prevPage();
  });
  
  document.getElementById('next-page').addEventListener('click', () => {
    state.pdfRenderer.nextPage();
  });
  
  document.getElementById('zoom-in').addEventListener('click', () => {
    const newZoom = state.pdfRenderer.zoom + 0.25;
    state.pdfRenderer.setZoom(newZoom);
    updateZoomLevel();
  });
  
  document.getElementById('zoom-out').addEventListener('click', () => {
    const newZoom = state.pdfRenderer.zoom - 0.25;
    state.pdfRenderer.setZoom(newZoom);
    updateZoomLevel();
  });
  
  // Bind new PDF controls
  const fitWidthBtn = document.getElementById('fit-width');
  const fitPageBtn = document.getElementById('fit-page');
  const rotateLeftBtn = document.getElementById('rotate-left');
  
  if (fitWidthBtn) {
    fitWidthBtn.addEventListener('click', () => {
      state.pdfRenderer.setZoom(1.0);
      updateZoomLevel();
    });
  }
  
  if (fitPageBtn) {
    fitPageBtn.addEventListener('click', () => {
      state.pdfRenderer.setZoom(0.8);
      updateZoomLevel();
    });
  }
  
  if (rotateLeftBtn) {
    rotateLeftBtn.addEventListener('click', () => {
      // Rotation functionality would be implemented in PDFRenderer
      console.log('Rotate left clicked');
    });
  }
}

function initNavigationComponents() {
  // Initialize Sidebar
  const sidebarContainer = document.getElementById('sidebar');
  if (sidebarContainer) {
    state.sidebar = new Sidebar(sidebarContainer);
    
    // Listen to sidebar events
    state.sidebar.on('sectionClick', (data) => {
      if (state.pdfRenderer && data.pageNum) {
        state.pdfRenderer.goToPage(data.pageNum);
      }
    });
    
    state.sidebar.on('collapseToggle', (data) => {
      console.log('Sidebar collapsed:', data.collapsed);
    });
  }
  
  // Initialize Progress Tracker
  state.progressTracker = new ProgressTracker();
  const progressContainer = document.getElementById('progress-tracker-container');
  if (progressContainer) {
    const progressBar = state.progressTracker.createProgressBar();
    progressContainer.appendChild(progressBar);
    
    // Listen to progress events
    state.progressTracker.on('progressUpdate', (progress) => {
      console.log('Progress updated:', progress);
    });
  }
  
  // Initialize Section Navigator
  const navigatorContainer = document.getElementById('section-navigator');
  if (navigatorContainer) {
    state.sectionNavigator = new SectionNavigator(navigatorContainer);
    
    // Listen to navigation events
    state.sectionNavigator.on('sectionNavigate', (data) => {
      if (state.pdfRenderer && data.page) {
        state.pdfRenderer.goToPage(data.page);
      }
    });
  }
  
  // Initialize Vibero Section Navigator (hidden by default)
  state.viberoSectionNavigator = new ViberoSectionNavigator(document.body, {
    position: 'both',
    showMiniMap: true,
    autoHighlight: true,
    smoothScroll: true
  });
  
  // Listen to Vibero navigation events
  state.viberoSectionNavigator.on('sectionNavigate', (data) => {
    if (state.pdfRenderer && data.page) {
      state.pdfRenderer.goToPage(data.page);
    }
  });
  
  // Hide Vibero navigator initially
  if (state.viberoSectionNavigator.leftPanel) {
    state.viberoSectionNavigator.leftPanel.style.display = 'none';
  }
  if (state.viberoSectionNavigator.rightPanel) {
    state.viberoSectionNavigator.rightPanel.style.display = 'none';
  }
  if (state.viberoSectionNavigator.floatingControls) {
    state.viberoSectionNavigator.floatingControls.style.display = 'none';
  }
  
  // Initialize Annotation Filter
  const filterContainer = document.getElementById('annotation-filter-container');
  if (filterContainer) {
    state.annotationFilter = new AnnotationFilter(filterContainer);
    
    // Listen to filter events
    state.annotationFilter.on('filterChange', (filters) => {
      console.log('Filters changed:', filters);
      // Re-render annotations with filters
      if (state.annotationLayer) {
        applyAnnotationFilters(filters);
      }
    });
    
    state.annotationFilter.on('annotationClick', (annotation) => {
      console.log('Annotation clicked:', annotation);
      if (state.pdfRenderer && annotation.page) {
        state.pdfRenderer.goToPage(annotation.page);
      }
    });
  }
  
  // Initialize Onboarding Tour
  state.onboardingTour = new OnboardingTour();
  
  // Initialize Keyboard Shortcuts
  state.keyboardShortcuts = new KeyboardShortcuts();
  
  // Bind keyboard shortcut events
  state.keyboardShortcuts.on('toggleSidebar', () => {
    if (state.sidebar) {
      state.sidebar.toggleCollapse();
    }
  });
  
  state.keyboardShortcuts.on('nextSection', () => {
    if (state.sectionNavigator) {
      state.sectionNavigator.navigateNext();
    }
  });
  
  state.keyboardShortcuts.on('previousSection', () => {
    if (state.sectionNavigator) {
      state.sectionNavigator.navigatePrevious();
    }
  });
  
  state.keyboardShortcuts.on('searchDocument', () => {
    // Focus on search input or open search modal
    console.log('Search document');
  });
  
  state.keyboardShortcuts.on('toggleAnnotations', () => {
    if (state.annotationFilter) {
      state.annotationFilter.toggleAll();
    }
  });
  
  state.keyboardShortcuts.on('showHelp', () => {
    if (state.keyboardShortcuts) {
      state.keyboardShortcuts.showHelp();
    }
  });
  
  state.keyboardShortcuts.on('toggleDarkMode', () => {
    toggleDarkMode();
  });
  
  state.keyboardShortcuts.on('previousPage', () => {
    if (state.pdfRenderer) {
      state.pdfRenderer.prevPage();
    }
  });
  
  state.keyboardShortcuts.on('nextPage', () => {
    if (state.pdfRenderer) {
      state.pdfRenderer.nextPage();
    }
  });
  
  state.keyboardShortcuts.on('firstPage', () => {
    if (state.pdfRenderer) {
      state.pdfRenderer.goToPage(1);
    }
  });
  
  state.keyboardShortcuts.on('lastPage', () => {
    if (state.pdfRenderer && state.pdfRenderer.pdfDoc) {
      state.pdfRenderer.goToPage(state.pdfRenderer.pdfDoc.numPages);
    }
  });
  
  state.keyboardShortcuts.on('zoomIn', () => {
    if (state.pdfRenderer) {
      const newZoom = state.pdfRenderer.zoom + 0.25;
      state.pdfRenderer.setZoom(newZoom);
      updateZoomLevel();
    }
  });
  
  state.keyboardShortcuts.on('zoomOut', () => {
    if (state.pdfRenderer) {
      const newZoom = state.pdfRenderer.zoom - 0.25;
      state.pdfRenderer.setZoom(newZoom);
      updateZoomLevel();
    }
  });
  
  state.keyboardShortcuts.on('resetZoom', () => {
    if (state.pdfRenderer) {
      state.pdfRenderer.setZoom(1.0);
      updateZoomLevel();
    }
  });
  
  state.keyboardShortcuts.on('closeModal', () => {
    // Close any open modals
    const modals = document.querySelectorAll('.keyboard-shortcuts-modal, .onboarding-overlay');
    modals.forEach(modal => modal.remove());
  });
}

function applyAnnotationFilters(filters) {
  // Apply filters to annotation layer
  if (!state.annotations) return;
  
  const filtered = state.annotations.filter(ann => {
    return filters[ann.type] !== false;
  });
  
  // Re-render annotations
  if (state.pdfRenderer) {
    renderAnnotationsForPage(state.pdfRenderer.currentPage, filtered);
  }
}

function updatePageInfo() {
  const pageInfo = document.getElementById('page-info');
  if (state.pdfRenderer && state.pdfRenderer.pdfDoc) {
    pageInfo.textContent = `Page ${state.pdfRenderer.currentPage} / ${state.pdfRenderer.pdfDoc.numPages}`;
  }
}

function updateZoomLevel() {
  const zoomLevel = document.getElementById('zoom-level');
  if (state.pdfRenderer) {
    zoomLevel.textContent = `${Math.round(state.pdfRenderer.zoom * 100)}%`;
  }
}

// loadTestAnnotations function moved to line 710 to avoid duplicate declaration

function loadDocumentOutline(numPages) {
  // Generate mock outline based on paper structure
  // In production, this would come from PDF.js outline or backend API
  const outline = generateMockOutline(numPages);
  
  // Update sidebar with outline
  if (state.sidebar) {
    state.sidebar.renderOutline(outline);
  }
  
  // Update section navigator with sections
  if (state.sectionNavigator) {
    state.sectionNavigator.setSections(outline);
  }
  
  // Update Vibero section navigator with sections
  if (state.viberoSectionNavigator) {
    state.viberoSectionNavigator.setSections(outline);
  }
}

function generateMockOutline(numPages) {
  // Generate a realistic paper outline
  const sections = [
    {
      id: 'abstract',
      title: 'Abstract',
      page: 1,
      type: 'section',
      children: []
    },
    {
      id: 'intro',
      title: '1. Introduction',
      page: 1,
      type: 'section',
      children: [
        { id: 'intro-1', title: '1.1 Background', page: 2, type: 'subsection' },
        { id: 'intro-2', title: '1.2 Motivation', page: 2, type: 'subsection' }
      ]
    },
    {
      id: 'related',
      title: '2. Related Work',
      page: 3,
      type: 'section',
      children: []
    },
    {
      id: 'method',
      title: '3. Methodology',
      page: Math.ceil(numPages * 0.3),
      type: 'section',
      children: [
        { id: 'method-1', title: '3.1 Architecture', page: Math.ceil(numPages * 0.35), type: 'subsection' },
        { id: 'method-2', title: '3.2 Training', page: Math.ceil(numPages * 0.4), type: 'subsection' }
      ]
    },
    {
      id: 'experiments',
      title: '4. Experiments',
      page: Math.ceil(numPages * 0.5),
      type: 'section',
      children: [
        { id: 'exp-1', title: '4.1 Setup', page: Math.ceil(numPages * 0.55), type: 'subsection' },
        { id: 'exp-2', title: '4.2 Results', page: Math.ceil(numPages * 0.6), type: 'subsection' }
      ]
    },
    {
      id: 'discussion',
      title: '5. Discussion',
      page: Math.ceil(numPages * 0.75),
      type: 'section',
      children: []
    },
    {
      id: 'conclusion',
      title: '6. Conclusion',
      page: Math.ceil(numPages * 0.85),
      type: 'section',
      children: []
    },
    {
      id: 'references',
      title: 'References',
      page: Math.ceil(numPages * 0.9),
      type: 'section',
      children: []
    }
  ];
  
  return sections;
}

// WebSocket connection for real-time analysis updates
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
    reconnectAttempts = 0;
    updateAnalysisStatus('Connected', 'success');
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateAnalysisStatus('Connection error', 'error');
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    ws = null;
    
    // Attempt to reconnect
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... (attempt ${reconnectAttempts})`);
        connectWebSocket();
      }, 2000 * reconnectAttempts);
    }
  };
}

function handleWebSocketMessage(message) {
  const { type } = message;
  
  switch (type) {
    case 'connected':
      console.log('WebSocket ready');
      break;
      
    case 'analysis-started':
      updateAnalysisStatus('Analysis started...', 'info');
      showAnalysisProgress(true);
      break;
      
    case 'progress':
      handleProgressUpdate(message);
      break;
      
    case 'analysis-complete':
      handleAnalysisComplete(message);
      break;
      
    case 'error':
      updateAnalysisStatus(`Error: ${message.error}`, 'error');
      showAnalysisProgress(false);
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
}

function handleProgressUpdate(message) {
  const { stage, progress, message: msg, annotation } = message;
  
  updateAnalysisStatus(`${stage}: ${msg}`, 'info');
  updateProgressBar(progress);
  
  // If an annotation was generated, add it to the display
  if (annotation) {
    addAnnotationToDisplay(annotation);
  }
}

function handleAnalysisComplete(message) {
  const { result } = message;
  updateAnalysisStatus('Analysis complete!', 'success');
  updateProgressBar(100);
  
  setTimeout(() => {
    showAnalysisProgress(false);
  }, 2000);
  
  // Load annotations from API
  if (result && result.paperId) {
    loadAnnotationsForPaper(result.paperId);
  }
}

function updateAnalysisStatus(message, type = 'info') {
  const statusEl = document.getElementById('analysis-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status-${type}`;
  }
}

function updateProgressBar(progress) {
  const progressBar = document.getElementById('analysis-progress-bar');
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}

function showAnalysisProgress(show) {
  const progressContainer = document.getElementById('analysis-progress');
  if (progressContainer) {
    progressContainer.style.display = show ? 'block' : 'none';
  }
}

function addAnnotationToDisplay(annotation) {
  if (!state.annotations) {
    state.annotations = [];
  }
  
  state.annotations.push(annotation);
  
  // If annotation is for current page, render it
  if (annotation.position && annotation.position.page === state.pdfRenderer.currentPage) {
    renderAnnotationsForPage(state.pdfRenderer.currentPage);
  }
}

async function loadAnnotationsForPaper(paperId) {
  try {
    const response = await fetch(`/api/papers/${paperId}/annotations`);
    const data = await response.json();
    
    state.annotations = data.annotations || [];
    renderAnnotationsForPage(state.pdfRenderer.currentPage);
    
    console.log(`Loaded ${state.annotations.length} annotations`);
  } catch (error) {
    console.error('Failed to load annotations:', error);
  }
}

// Analyze paper button handler
async function analyzePaper() {
  if (!state.currentPdfUrl) {
    alert('Please load a PDF first');
    return;
  }
  
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert('WebSocket not connected. Connecting...');
    connectWebSocket();
    setTimeout(analyzePaper, 2000);
    return;
  }
  
  const pdfPath = state.currentPdfUrl;
  
  // Send analyze request via WebSocket
  ws.send(JSON.stringify({
    action: 'analyze',
    payload: {
      pdfPath,
      annotationTypes: ['translation', 'explanation', 'concept'],
      language: 'Chinese',
      batchSize: 5,
      maxParagraphs: 10 // Limit for testing
    }
  }));
  
  showAnalysisProgress(true);
  updateAnalysisStatus('Starting analysis...', 'info');
}

async function loadTestAnnotations() {
  try {
    const response = await fetch('/test-annotations.json');
    const annotations = await response.json();
    
    // Store annotations in state
    state.testAnnotations = annotations;
    
    // Render annotations for current page
    renderAnnotationsForPage(state.pdfRenderer.currentPage);
  } catch (error) {
    console.log('No test annotations found or error loading:', error);
  }
}

function renderAnnotationsForPage(pageNum) {
  if (!state.testAnnotations) return;
  
  // Clear existing annotations from both layers
  state.annotationLayer.clear();
  if (state.viberoAnnotationLayer) {
    state.viberoAnnotationLayer.clear();
  }
  
  // Filter annotations for current page
  const pageAnnotations = state.testAnnotations.filter(anno => anno.page === pageNum);
  
  // Choose which layer to use based on current mode
  const activeLayer = state.viberoMode ? state.viberoAnnotationLayer : state.annotationLayer;
  
  // Convert PDF coordinates to canvas coordinates and add to layer
  pageAnnotations.forEach(anno => {
    const canvasCoords = state.coordinateMapper.pdfToCanvas(anno.x, anno.y);
    
    if (state.viberoMode) {
      // Use Vibero annotation layer with enhanced data
      activeLayer.addAnnotation({
        id: anno.id || `anno-${Date.now()}-${Math.random()}`,
        x: canvasCoords.x,
        y: canvasCoords.y,
        type: anno.type || 'explanation',
        content: anno.content || anno.text || '',
        translation: anno.translation || null,
        aiExplanation: anno.aiExplanation || null,
        page: pageNum,
        reference: anno.reference || null
      });
    } else {
      // Use normal annotation layer
      activeLayer.addAnnotation({
        ...anno,
        x: canvasCoords.x,
        y: canvasCoords.y
      });
    }
  });
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

  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', toggleDarkMode);
  }
  document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + D toggles dark mode
    if ((event.ctrlKey || event.metaKey) && (event.key === 'd' || event.key === 'D')) {
      event.preventDefault();
      toggleDarkMode();
    }
    // Ctrl/Cmd + V toggles Vibero mode
    if ((event.ctrlKey || event.metaKey) && (event.key === 'v' || event.key === 'V')) {
      event.preventDefault();
      toggleViberoMode();
    }
  });

  bindMascotInteractions();
  
  // Ensure segmented groups are bound (may already be bound in init)
  document.querySelectorAll('[data-target]').forEach(bindSegmentedGroup);
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
    button.addEventListener('click', (e) => {
      console.log('🔘 Button clicked:', button.dataset.value, 'target:', target);
      
      // Visual feedback
      button.style.transform = 'scale(0.95)';
      setTimeout(() => { button.style.transform = 'scale(1)'; }, 100);
      
      // Update active state
      group.querySelectorAll('.seg-btn').forEach((node) => node.classList.remove('active'));
      button.classList.add('active');
      
      // Update hidden select
      if (hiddenSelect) {
        hiddenSelect.value = button.dataset.value;
        hiddenSelect.dispatchEvent(new Event('change'));
      }
      
      // Show feedback in status
      if (typeof statusText !== 'undefined' && statusText) {
        const oldText = statusText.textContent;
        statusText.textContent = '✓ 已切换: ' + button.textContent;
        statusText.style.color = '#10b981';
        setTimeout(() => {
          statusText.textContent = oldText;
          statusText.style.color = '';
        }, 1500);
      }
    });
  });
}

function handleModeChange() {
  seedConversation();
}

function handleComposerKeydown(event) {
  // Ctrl+Enter or Cmd+Enter to send (cross-platform)
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    runDiagnosis();
    return;
  }
  // Shift+Enter for new line (default behavior)
  if (event.key === 'Enter' && event.shiftKey) {
    return; // Allow default behavior (new line)
  }
  // Plain Enter to send
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    runDiagnosis();
  }
  // Escape to clear input
  if (event.key === 'Escape') {
    elements.confusion.value = '';
    updateViewerFromComposer();
    elements.confusion.blur();
  }
  // Keyboard shortcuts help
  if (event.key === '?' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    showKeyboardShortcuts();
  }
}

async function handleSearchKeydown(event) {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  await runPaperSearch({ auto: false });
}

async function runPaperSearch({ auto = false } = {}) {
  const query = paperSearch.value.trim();
  console.log('🔍 Search called:', query, 'auto:', auto);
  if (!query) {
    console.log('❌ Empty query, aborting');
    return;
  }

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
  console.log('📋 Rendering search results:', state.searchResults.length);
  if (!state.searchResults.length) {
    console.log('❌ No results to show');
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
  console.log('✅ Search results displayed, element:', paperResults, 'visible:', paperResults.style.display);
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

  if (pdfUrl && pdfUrl !== state.currentPdfUrl) {
    // Load PDF using PDFRenderer
    state.currentPdfUrl = pdfUrl;
    paperCaption.textContent = elements.paperTitle.value || elements.paperId.value || pdfUrl;
    pdfEmpty.classList.remove('visible');
    
    // Load the PDF document
    state.pdfRenderer.loadDocument(pdfUrl)
      .then(async () => {
        console.log('PDF loaded successfully');
        statusText.textContent = 'PDF loaded';
        
        // Try to restore reading state
        if (state.progressTracker && elements.paperId.value) {
          const savedState = await state.progressTracker.restoreState();
          if (savedState && savedState.currentPage > 1) {
            // Show resume reading prompt
            showResumeReadingPrompt(savedState.currentPage);
          }
        }
      })
      .catch(error => {
        console.error('Error loading PDF:', error);
        statusText.textContent = 'Error loading PDF';
        pdfEmpty.classList.add('visible');
        pdfControls.style.display = 'none';
      });
  } else if (!pdfUrl) {
    // No PDF to load
    state.currentPdfUrl = null;
    paperCaption.textContent = 'No paper loaded';
    pdfEmpty.classList.add('visible');
    pdfControls.style.display = 'none';
    state.annotationLayer.clear();
  }
}

function showResumeReadingPrompt(page) {
  // Create a toast notification to resume reading
  const toast = document.createElement('div');
  toast.className = 'resume-reading-toast';
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">📖</span>
      <div class="toast-text">
        <strong>Resume reading?</strong>
        <small>You were on page ${page}</small>
      </div>
      <div class="toast-actions">
        <button class="toast-btn toast-btn-primary" id="resume-yes">Resume</button>
        <button class="toast-btn toast-btn-secondary" id="resume-no">Start over</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('visible'), 10);
  
  // Bind actions
  document.getElementById('resume-yes').addEventListener('click', () => {
    if (state.pdfRenderer) {
      state.pdfRenderer.goToPage(page);
    }
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  });
  
  document.getElementById('resume-no').addEventListener('click', () => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  });
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }
  }, 10000);
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

function showKeyboardShortcuts() {
  const shortcuts = `
    <div class="keyboard-shortcuts-overlay" onclick="this.remove()">
      <div class="keyboard-shortcuts-modal" onclick="event.stopPropagation()">
        <h3>⌨️ 键盘快捷键</h3>
        <ul>
          <li><kbd>Ctrl</kbd>+<kbd>Enter</kbd> 发送诊断</li>
          <li><kbd>Shift</kbd>+<kbd>Enter</kbd> 换行</li>
          <li><kbd>Esc</kbd> 清空输入</li>
          <li><kbd>Ctrl</kbd>+<kbd>D</kbd> 切换深色模式</li>
          <li><kbd>Ctrl</kbd>+<kbd>?</kbd> 显示此帮助</li>
        </ul>
        <button onclick="this.closest('.keyboard-shortcuts-overlay').remove()">关闭</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', shortcuts);
}

function initDarkMode() {
  // Check localStorage for dark mode preference
  const isDarkMode = localStorage.getItem('truth-tutor-dark-mode') === 'true';
  if (isDarkMode) {
    document.documentElement.classList.add('dark-mode');
    if (darkModeToggle) darkModeToggle.textContent = '☀️';
  } else {
    document.documentElement.classList.remove('dark-mode');
    if (darkModeToggle) darkModeToggle.textContent = '🌙';
  }
}

function initViberoMode() {
  // Create Vibero mode toggle button
  const viberoToggle = document.createElement('button');
  viberoToggle.id = 'vibero-mode-toggle';
  viberoToggle.className = 'vibero-mode-toggle';
  viberoToggle.textContent = '✨ Vibero 沉浸模式';
  viberoToggle.title = '切换到 Vibero 沉浸模式';
  viberoToggle.style.cssText = `
    position: fixed;
    top: 20px;
    right: 80px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    transition: all 0.2s ease;
  `;
  
  // Hover effect
  viberoToggle.addEventListener('mouseenter', () => {
    viberoToggle.style.transform = 'translateY(-2px)';
    viberoToggle.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
  });
  viberoToggle.addEventListener('mouseleave', () => {
    viberoToggle.style.transform = 'translateY(0)';
    viberoToggle.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
  });
  
  // Click handler
  viberoToggle.addEventListener('click', toggleViberoMode);
  
  // Add to page
  document.body.appendChild(viberoToggle);
  
  // Check localStorage for Vibero mode preference
  const isViberoMode = localStorage.getItem('truth-tutor-vibero-mode') === 'true';
  if (isViberoMode) {
    state.viberoMode = false; // Set to false first so toggle will switch to true
    toggleViberoMode();
  }
}

function toggleDarkMode() {
  const isDarkMode = document.documentElement.classList.toggle('dark-mode');
  localStorage.setItem('truth-tutor-dark-mode', isDarkMode);
  if (darkModeToggle) {
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
  }
}

function toggleViberoMode() {
  state.viberoMode = !state.viberoMode;
  
  // Update toggle button text
  const viberoToggle = document.getElementById('vibero-mode-toggle');
  if (viberoToggle) {
    viberoToggle.textContent = state.viberoMode ? '📖 普通模式' : '✨ Vibero 沉浸模式';
    viberoToggle.title = state.viberoMode ? '切换到普通模式' : '切换到 Vibero 沉浸模式';
  }
  
  if (state.viberoMode) {
    // Switch to Vibero mode
    console.log('Switching to Vibero immersive mode');
    
    // Hide normal components
    if (state.sidebar?.container) {
      state.sidebar.container.style.display = 'none';
    }
    const navigatorContainer = document.getElementById('section-navigator');
    if (navigatorContainer) {
      navigatorContainer.style.display = 'none';
    }
    
    // Show Vibero components
    if (state.viberoSectionNavigator.leftPanel) {
      state.viberoSectionNavigator.leftPanel.style.display = 'block';
    }
    if (state.viberoSectionNavigator.rightPanel) {
      state.viberoSectionNavigator.rightPanel.style.display = 'block';
    }
    if (state.viberoSectionNavigator.floatingControls) {
      state.viberoSectionNavigator.floatingControls.style.display = 'flex';
    }
    
    // Re-render annotations with Vibero style
    if (state.pdfRenderer) {
      renderAnnotationsForPage(state.pdfRenderer.currentPage);
    }
    
  } else {
    // Switch to normal mode
    console.log('Switching to normal mode');
    
    // Show normal components
    if (state.sidebar?.container) {
      state.sidebar.container.style.display = 'block';
    }
    const navigatorContainer = document.getElementById('section-navigator');
    if (navigatorContainer) {
      navigatorContainer.style.display = 'block';
    }
    
    // Hide Vibero components
    if (state.viberoSectionNavigator.leftPanel) {
      state.viberoSectionNavigator.leftPanel.style.display = 'none';
    }
    if (state.viberoSectionNavigator.rightPanel) {
      state.viberoSectionNavigator.rightPanel.style.display = 'none';
    }
    if (state.viberoSectionNavigator.floatingControls) {
      state.viberoSectionNavigator.floatingControls.style.display = 'none';
    }
    
    // Hide Vibero AI sidebar if open
    if (state.viberoAnnotationLayer) {
      state.viberoAnnotationLayer.hideAISidebar();
    }
    
    // Re-render annotations with normal style
    if (state.pdfRenderer) {
      renderAnnotationsForPage(state.pdfRenderer.currentPage);
    }
  }
  
  // Save preference
  localStorage.setItem('truth-tutor-vibero-mode', state.viberoMode);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
