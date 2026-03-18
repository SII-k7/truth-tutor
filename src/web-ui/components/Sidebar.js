// Sidebar.js - Document outline navigation sidebar
export class Sidebar {
  constructor(container) {
    this.container = container;
    this.outline = null;
    this.currentSection = null;
    this.isCollapsed = false;
    this.listeners = {};
    
    this._initSidebar();
  }

  _initSidebar() {
    this.container.innerHTML = `
      <div class="sidebar-header">
        <h3 class="sidebar-title">Document Outline</h3>
        <button class="sidebar-collapse-btn" aria-label="Collapse sidebar" title="Collapse sidebar (Ctrl+B)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 12l-4-4 4-4"/>
          </svg>
        </button>
      </div>
      <div class="sidebar-content">
        <div class="outline-tree" role="tree" aria-label="Document outline"></div>
        <div class="outline-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="8" y="8" width="32" height="32" rx="2"/>
            <line x1="14" y1="16" x2="34" y2="16"/>
            <line x1="14" y1="24" x2="28" y2="24"/>
            <line x1="14" y1="32" x2="30" y2="32"/>
          </svg>
          <p>No outline available</p>
          <small>Load a document to see its structure</small>
        </div>
      </div>
    `;

    // Setup event listeners
    const collapseBtn = this.container.querySelector('.sidebar-collapse-btn');
    collapseBtn.addEventListener('click', () => this.toggleCollapse());
  }

  renderOutline(structure) {
    this.outline = structure;
    const treeContainer = this.container.querySelector('.outline-tree');
    const emptyState = this.container.querySelector('.outline-empty');
    
    if (!structure || structure.length === 0) {
      treeContainer.innerHTML = '';
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    treeContainer.innerHTML = this._buildOutlineHTML(structure);
    
    // Add click handlers
    treeContainer.querySelectorAll('.outline-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const sectionId = item.dataset.sectionId;
        const pageNum = parseInt(item.dataset.page);
        this.jumpToSection(sectionId, pageNum);
      });
    });

    // Add collapse/expand handlers
    treeContainer.querySelectorAll('.outline-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = toggle.closest('.outline-item');
        item.classList.toggle('collapsed');
      });
    });
  }

  _buildOutlineHTML(items, level = 0) {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const indent = level * 16;
      
      return `
        <div class="outline-item" 
             data-section-id="${item.id || ''}" 
             data-page="${item.page || 1}"
             data-level="${level}"
             style="padding-left: ${indent}px"
             role="treeitem"
             aria-expanded="${hasChildren ? 'true' : undefined}"
             tabindex="0">
          ${hasChildren ? `
            <button class="outline-toggle" aria-label="Toggle section">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M4 3l4 3-4 3z"/>
              </svg>
            </button>
          ` : '<span class="outline-spacer"></span>'}
          <span class="outline-icon">${this._getIcon(item.type, level)}</span>
          <span class="outline-title">${this._escapeHtml(item.title)}</span>
          ${item.page ? `<span class="outline-page">${item.page}</span>` : ''}
        </div>
        ${hasChildren ? `
          <div class="outline-children">
            ${this._buildOutlineHTML(item.children, level + 1)}
          </div>
        ` : ''}
      `;
    }).join('');
  }

  _getIcon(type, level) {
    if (type === 'section' || level === 0) return '📄';
    if (type === 'subsection' || level === 1) return '📑';
    if (type === 'figure') return '📊';
    if (type === 'table') return '📋';
    if (type === 'equation') return '🔢';
    return '•';
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateProgress(position) {
    // Remove previous active states
    this.container.querySelectorAll('.outline-item.active').forEach(item => {
      item.classList.remove('active');
    });

    // Find and highlight current section
    const currentItem = this.container.querySelector(
      `.outline-item[data-section-id="${position.sectionId}"]`
    ) || this.container.querySelector(
      `.outline-item[data-page="${position.page}"]`
    );

    if (currentItem) {
      currentItem.classList.add('active');
      this.currentSection = position.sectionId;
      
      // Scroll into view if needed
      currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Expand parent sections
      let parent = currentItem.parentElement;
      while (parent && parent.classList.contains('outline-children')) {
        const parentItem = parent.previousElementSibling;
        if (parentItem && parentItem.classList.contains('outline-item')) {
          parentItem.classList.remove('collapsed');
        }
        parent = parentItem?.parentElement;
      }
    }
  }

  jumpToSection(sectionId, pageNum) {
    this._emit('sectionClick', { sectionId, pageNum });
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.container.classList.toggle('collapsed', this.isCollapsed);
    
    const btn = this.container.querySelector('.sidebar-collapse-btn');
    const svg = btn.querySelector('svg path');
    svg.setAttribute('d', this.isCollapsed ? 'M6 4l4 4-4 4' : 'M10 12l-4-4 4-4');
    btn.setAttribute('aria-label', this.isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    
    this._emit('collapseToggle', { collapsed: this.isCollapsed });
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

  // Keyboard navigation
  handleKeyboard(e) {
    const items = Array.from(this.container.querySelectorAll('.outline-item'));
    const activeItem = this.container.querySelector('.outline-item:focus') || 
                       this.container.querySelector('.outline-item.active');
    
    if (!activeItem) return;
    
    const currentIndex = items.indexOf(activeItem);
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          items[currentIndex + 1].focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          items[currentIndex - 1].focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        activeItem.click();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (activeItem.classList.contains('collapsed')) {
          activeItem.classList.remove('collapsed');
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (!activeItem.classList.contains('collapsed')) {
          activeItem.classList.add('collapsed');
        }
        break;
    }
  }
}
