// SectionNavigator.js - Section navigation with breadcrumbs and mini-map
export class SectionNavigator {
  constructor(container) {
    this.container = container;
    this.sections = [];
    this.currentSectionIndex = -1;
    this.listeners = {};
    
    this._initNavigator();
  }

  _initNavigator() {
    this.container.innerHTML = `
      <div class="section-navigator">
        <div class="breadcrumb-trail" role="navigation" aria-label="Section breadcrumb">
          <span class="breadcrumb-item">Document</span>
        </div>
        
        <div class="section-controls">
          <button class="nav-btn prev-section" aria-label="Previous section (Ctrl+P)" title="Previous section (Ctrl+P)" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 12l-4-4 4-4"/>
            </svg>
            <span>Previous</span>
          </button>
          
          <div class="section-indicator">
            <span class="current-section-title">No section</span>
            <span class="section-counter">— / —</span>
          </div>
          
          <button class="nav-btn next-section" aria-label="Next section (Ctrl+N)" title="Next section (Ctrl+N)" disabled>
            <span>Next</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 4l4 4-4 4"/>
            </svg>
          </button>
        </div>
        
        <div class="mini-map">
          <button class="mini-map-toggle" aria-label="Toggle mini-map" title="Toggle document mini-map">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" stroke-width="1.5"/>
              <line x1="5" y1="8" x2="9" y2="8" stroke="currentColor" stroke-width="1.5"/>
              <line x1="5" y1="11" x2="10" y2="11" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
          <div class="mini-map-panel hidden">
            <div class="mini-map-content"></div>
          </div>
        </div>
      </div>
    `;

    // Setup event listeners
    const prevBtn = this.container.querySelector('.prev-section');
    const nextBtn = this.container.querySelector('.next-section');
    const miniMapToggle = this.container.querySelector('.mini-map-toggle');
    
    prevBtn.addEventListener('click', () => this.navigatePrevious());
    nextBtn.addEventListener('click', () => this.navigateNext());
    miniMapToggle.addEventListener('click', () => this.toggleMiniMap());
  }

  setSections(sections) {
    this.sections = this._flattenSections(sections);
    this._updateMiniMap();
  }

  _flattenSections(sections, result = []) {
    sections.forEach(section => {
      result.push(section);
      if (section.children && section.children.length > 0) {
        this._flattenSections(section.children, result);
      }
    });
    return result;
  }

  updateCurrentSection(sectionId) {
    const index = this.sections.findIndex(s => s.id === sectionId);
    
    if (index !== -1) {
      this.currentSectionIndex = index;
      this._updateUI();
    }
  }

  _updateUI() {
    const prevBtn = this.container.querySelector('.prev-section');
    const nextBtn = this.container.querySelector('.next-section');
    const titleEl = this.container.querySelector('.current-section-title');
    const counterEl = this.container.querySelector('.section-counter');
    
    if (this.currentSectionIndex >= 0 && this.currentSectionIndex < this.sections.length) {
      const current = this.sections[this.currentSectionIndex];
      titleEl.textContent = current.title;
      counterEl.textContent = `${this.currentSectionIndex + 1} / ${this.sections.length}`;
      
      // Update breadcrumb
      this._updateBreadcrumb(current);
      
      // Update mini-map
      this._updateMiniMapHighlight();
    } else {
      titleEl.textContent = 'No section';
      counterEl.textContent = '— / —';
    }
    
    // Enable/disable navigation buttons
    prevBtn.disabled = this.currentSectionIndex <= 0;
    nextBtn.disabled = this.currentSectionIndex >= this.sections.length - 1;
  }

  _updateBreadcrumb(section) {
    const breadcrumb = this.container.querySelector('.breadcrumb-trail');
    const path = this._getSectionPath(section);
    
    breadcrumb.innerHTML = path.map((item, index) => {
      const isLast = index === path.length - 1;
      return `
        <span class="breadcrumb-item ${isLast ? 'active' : ''}" 
              data-section-id="${item.id}"
              ${!isLast ? 'role="button" tabindex="0"' : ''}>
          ${this._escapeHtml(item.title)}
        </span>
        ${!isLast ? '<span class="breadcrumb-separator">›</span>' : ''}
      `;
    }).join('');
    
    // Add click handlers for non-active items
    breadcrumb.querySelectorAll('.breadcrumb-item:not(.active)').forEach(item => {
      item.addEventListener('click', () => {
        const sectionId = item.dataset.sectionId;
        this._emit('sectionNavigate', { sectionId });
      });
    });
  }

  _getSectionPath(section) {
    // Build path from root to current section
    const path = [{ id: 'root', title: 'Document' }];
    
    // Find parent chain (simplified - assumes section has parent info)
    if (section.parent) {
      path.push(...this._getParentChain(section.parent));
    }
    
    path.push(section);
    return path;
  }

  _getParentChain(parentId) {
    // Simplified - in real implementation, would traverse section tree
    return [];
  }

  _updateMiniMap() {
    const miniMapContent = this.container.querySelector('.mini-map-content');
    
    if (this.sections.length === 0) {
      miniMapContent.innerHTML = '<p class="mini-map-empty">No sections</p>';
      return;
    }
    
    miniMapContent.innerHTML = this.sections.map((section, index) => {
      const level = section.level || 0;
      return `
        <div class="mini-map-item" 
             data-index="${index}"
             data-section-id="${section.id}"
             style="padding-left: ${level * 8}px"
             title="${this._escapeHtml(section.title)}">
          <span class="mini-map-dot"></span>
          <span class="mini-map-label">${this._escapeHtml(section.title)}</span>
        </div>
      `;
    }).join('');
    
    // Add click handlers
    miniMapContent.querySelectorAll('.mini-map-item').forEach(item => {
      item.addEventListener('click', () => {
        const sectionId = item.dataset.sectionId;
        this._emit('sectionNavigate', { sectionId });
      });
    });
  }

  _updateMiniMapHighlight() {
    const items = this.container.querySelectorAll('.mini-map-item');
    items.forEach((item, index) => {
      item.classList.toggle('active', index === this.currentSectionIndex);
    });
  }

  toggleMiniMap() {
    const panel = this.container.querySelector('.mini-map-panel');
    const toggle = this.container.querySelector('.mini-map-toggle');
    
    panel.classList.toggle('hidden');
    toggle.classList.toggle('active');
    toggle.setAttribute('aria-expanded', !panel.classList.contains('hidden'));
  }

  navigatePrevious() {
    if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      const section = this.sections[this.currentSectionIndex];
      this._emit('sectionNavigate', { sectionId: section.id, page: section.page });
      this._updateUI();
    }
  }

  navigateNext() {
    if (this.currentSectionIndex < this.sections.length - 1) {
      this.currentSectionIndex++;
      const section = this.sections[this.currentSectionIndex];
      this._emit('sectionNavigate', { sectionId: section.id, page: section.page });
      this._updateUI();
    }
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
