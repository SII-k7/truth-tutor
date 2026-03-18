// AnnotationFilter.js - Filter and manage annotations display
export class AnnotationFilter {
  constructor(container) {
    this.container = container;
    this.filters = {
      translation: true,
      explanation: true,
      concept: true,
      all: true
    };
    this.searchQuery = '';
    this.annotations = [];
    this.listeners = {};
    
    this._initFilter();
  }

  _initFilter() {
    this.container.innerHTML = `
      <div class="annotation-filter">
        <div class="filter-header">
          <h4 class="filter-title">Annotations</h4>
          <button class="filter-toggle-all" aria-label="Toggle all annotations (Ctrl+H)" title="Toggle all (Ctrl+H)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 8a1 1 0 011-1h10a1 1 0 110 2H3a1 1 0 01-1-1z"/>
            </svg>
          </button>
        </div>
        
        <div class="filter-search">
          <input type="text" 
                 class="filter-search-input" 
                 placeholder="Search annotations..." 
                 aria-label="Search annotations"/>
          <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
          </svg>
        </div>
        
        <div class="filter-types">
          <label class="filter-checkbox">
            <input type="checkbox" checked data-type="translation"/>
            <span class="filter-label">
              <span class="filter-icon">🌐</span>
              Translation
            </span>
            <span class="filter-count">0</span>
          </label>
          
          <label class="filter-checkbox">
            <input type="checkbox" checked data-type="explanation"/>
            <span class="filter-label">
              <span class="filter-icon">💡</span>
              Explanation
            </span>
            <span class="filter-count">0</span>
          </label>
          
          <label class="filter-checkbox">
            <input type="checkbox" checked data-type="concept"/>
            <span class="filter-label">
              <span class="filter-icon">🎯</span>
              Concept
            </span>
            <span class="filter-count">0</span>
          </label>
        </div>
        
        <div class="annotation-density">
          <div class="density-label">Annotation Density</div>
          <div class="density-heatmap" role="img" aria-label="Annotation density heatmap">
            <div class="heatmap-bars"></div>
          </div>
        </div>
        
        <div class="annotation-list">
          <div class="annotation-list-empty">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="24" cy="24" r="20"/>
              <path d="M24 16v12M24 32v.01"/>
            </svg>
            <p>No annotations yet</p>
            <small>Annotations will appear here as you read</small>
          </div>
        </div>
      </div>
    `;

    // Setup event listeners
    const toggleAll = this.container.querySelector('.filter-toggle-all');
    const searchInput = this.container.querySelector('.filter-search-input');
    const checkboxes = this.container.querySelectorAll('.filter-checkbox input');
    
    toggleAll.addEventListener('click', () => this.toggleAll());
    searchInput.addEventListener('input', (e) => this.search(e.target.value));
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const type = e.target.dataset.type;
        this.filters[type] = e.target.checked;
        this._emit('filterChange', this.filters);
        this._updateAnnotationList();
      });
    });
  }

  setAnnotations(annotations) {
    this.annotations = annotations;
    this._updateCounts();
    this._updateHeatmap();
    this._updateAnnotationList();
  }

  _updateCounts() {
    const counts = {
      translation: 0,
      explanation: 0,
      concept: 0
    };
    
    this.annotations.forEach(ann => {
      if (counts.hasOwnProperty(ann.type)) {
        counts[ann.type]++;
      }
    });
    
    Object.keys(counts).forEach(type => {
      const countEl = this.container.querySelector(
        `.filter-checkbox input[data-type="${type}"] ~ .filter-label ~ .filter-count`
      );
      if (countEl) {
        countEl.textContent = counts[type];
      }
    });
  }

  _updateHeatmap() {
    const heatmapBars = this.container.querySelector('.heatmap-bars');
    
    if (this.annotations.length === 0) {
      heatmapBars.innerHTML = '<div class="heatmap-empty">No data</div>';
      return;
    }
    
    // Group annotations by page
    const pageMap = new Map();
    this.annotations.forEach(ann => {
      const page = ann.page || 1;
      pageMap.set(page, (pageMap.get(page) || 0) + 1);
    });
    
    const maxCount = Math.max(...pageMap.values());
    const totalPages = Math.max(...pageMap.keys());
    
    // Create bars (max 50 bars for readability)
    const barCount = Math.min(totalPages, 50);
    const pagesPerBar = Math.ceil(totalPages / barCount);
    
    const bars = [];
    for (let i = 0; i < barCount; i++) {
      const startPage = i * pagesPerBar + 1;
      const endPage = Math.min((i + 1) * pagesPerBar, totalPages);
      
      let count = 0;
      for (let p = startPage; p <= endPage; p++) {
        count += pageMap.get(p) || 0;
      }
      
      const intensity = maxCount > 0 ? count / maxCount : 0;
      bars.push(`
        <div class="heatmap-bar" 
             style="height: ${intensity * 100}%"
             data-pages="${startPage}-${endPage}"
             data-count="${count}"
             title="Pages ${startPage}-${endPage}: ${count} annotations"></div>
      `);
    }
    
    heatmapBars.innerHTML = bars.join('');
  }

  _updateAnnotationList() {
    const listContainer = this.container.querySelector('.annotation-list');
    const emptyState = this.container.querySelector('.annotation-list-empty');
    
    // Filter annotations
    const filtered = this.annotations.filter(ann => {
      // Type filter
      if (!this.filters[ann.type]) return false;
      
      // Search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const text = (ann.text || '').toLowerCase();
        const content = (ann.content || '').toLowerCase();
        return text.includes(query) || content.includes(query);
      }
      
      return true;
    });
    
    if (filtered.length === 0) {
      emptyState.style.display = 'flex';
      listContainer.querySelectorAll('.annotation-item').forEach(el => el.remove());
      return;
    }
    
    emptyState.style.display = 'none';
    
    // Remove old items
    listContainer.querySelectorAll('.annotation-item').forEach(el => el.remove());
    
    // Add filtered items
    filtered.forEach(ann => {
      const item = document.createElement('div');
      item.className = 'annotation-item';
      item.dataset.annotationId = ann.id;
      item.innerHTML = `
        <div class="annotation-item-header">
          <span class="annotation-type-icon">${this._getTypeIcon(ann.type)}</span>
          <span class="annotation-type">${ann.type}</span>
          <span class="annotation-page">p.${ann.page}</span>
        </div>
        <div class="annotation-text">${this._escapeHtml(ann.text || '')}</div>
        ${ann.content ? `<div class="annotation-content">${this._escapeHtml(ann.content)}</div>` : ''}
      `;
      
      item.addEventListener('click', () => {
        this._emit('annotationClick', ann);
      });
      
      listContainer.appendChild(item);
    });
  }

  _getTypeIcon(type) {
    const icons = {
      translation: '🌐',
      explanation: '💡',
      concept: '🎯'
    };
    return icons[type] || '📝';
  }

  toggleAll() {
    this.filters.all = !this.filters.all;
    
    // Update all checkboxes
    const checkboxes = this.container.querySelectorAll('.filter-checkbox input');
    checkboxes.forEach(checkbox => {
      checkbox.checked = this.filters.all;
      const type = checkbox.dataset.type;
      this.filters[type] = this.filters.all;
    });
    
    // Update icon
    const toggleBtn = this.container.querySelector('.filter-toggle-all');
    const svg = toggleBtn.querySelector('svg path');
    
    if (this.filters.all) {
      svg.setAttribute('d', 'M2 8a1 1 0 011-1h10a1 1 0 110 2H3a1 1 0 01-1-1z');
      toggleBtn.setAttribute('title', 'Hide all');
    } else {
      svg.setAttribute('d', 'M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z');
      toggleBtn.setAttribute('title', 'Show all');
    }
    
    this._emit('filterChange', this.filters);
    this._updateAnnotationList();
  }

  search(query) {
    this.searchQuery = query;
    this._updateAnnotationList();
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Event system
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}
