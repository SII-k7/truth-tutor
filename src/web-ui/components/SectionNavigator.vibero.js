// SectionNavigator.vibero.js - Vibero-style side-by-side article outline navigation

export class ViberoSectionNavigator {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      position: 'both', // 'left' | 'right' | 'both'
      showMiniMap: true,
      autoHighlight: true,
      smoothScroll: true,
      ...options
    };
    
    this.sections = [];
    this.currentSectionId = null;
    this.listeners = {};
    
    this._initNavigator();
    this._initScrollListener();
  }

  _initNavigator() {
    // Create left outline panel
    if (this.options.position === 'left' || this.options.position === 'both') {
      this.leftPanel = this._createOutlinePanel('left');
      document.body.appendChild(this.leftPanel);
    }
    
    // Create right outline panel
    if (this.options.position === 'right' || this.options.position === 'both') {
      this.rightPanel = this._createOutlinePanel('right');
      document.body.appendChild(this.rightPanel);
    }
    
    // Create floating navigation controls
    this._createFloatingControls();
  }

  _createOutlinePanel(position) {
    const panel = document.createElement('div');
    panel.className = `vibero-outline-panel vibero-outline-${position}`;
    panel.style.position = 'fixed';
    panel.style[position] = '0';
    panel.style.top = '0';
    panel.style.width = '280px';
    panel.style.height = '100vh';
    panel.style.background = 'rgba(255, 255, 255, 0.95)';
    panel.style.backdropFilter = 'blur(10px)';
    panel.style.borderRight = position === 'left' ? '1px solid #e5e7eb' : 'none';
    panel.style.borderLeft = position === 'right' ? '1px solid #e5e7eb' : 'none';
    panel.style.zIndex = '100';
    panel.style.overflowY = 'auto';
    panel.style.overflowX = 'hidden';
    panel.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    panel.style.boxShadow = position === 'left' 
      ? '4px 0 12px rgba(0, 0, 0, 0.05)' 
      : '-4px 0 12px rgba(0, 0, 0, 0.05)';
    
    panel.innerHTML = `
      <div class="outline-header" style="
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
        position: sticky;
        top: 0;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        z-index: 10;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">
            📚 文章脉络
          </h3>
          <button class="toggle-outline-btn" style="
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            color: #6b7280;
            font-size: 20px;
            line-height: 1;
            border-radius: 4px;
            transition: background 0.2s;
          " title="收起导航">
            ${position === 'left' ? '◀' : '▶'}
          </button>
        </div>
        <div style="font-size: 12px; color: #6b7280;">
          <span class="section-count">0 个章节</span>
        </div>
      </div>
      
      <div class="outline-content" style="padding: 12px 0;">
        <div class="outline-empty" style="
          padding: 40px 20px;
          text-align: center;
          color: #9ca3af;
          font-size: 14px;
        ">
          <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.5;">📄</div>
          <p>暂无章节</p>
        </div>
      </div>
      
      <div class="outline-footer" style="
        padding: 16px 20px;
        border-top: 1px solid #e5e7eb;
        position: sticky;
        bottom: 0;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
      ">
        <div class="reading-progress" style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; margin-bottom: 4px;">
            <span>阅读进度</span>
            <span class="progress-percentage">0%</span>
          </div>
          <div style="
            width: 100%;
            height: 4px;
            background: #e5e7eb;
            border-radius: 2px;
            overflow: hidden;
          ">
            <div class="progress-bar" style="
              width: 0%;
              height: 100%;
              background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
              transition: width 0.3s ease;
            "></div>
          </div>
        </div>
      </div>
    `;
    
    // Toggle button handler
    const toggleBtn = panel.querySelector('.toggle-outline-btn');
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = panel.style.transform !== '';
      if (isCollapsed) {
        panel.style.transform = '';
        toggleBtn.textContent = position === 'left' ? '◀' : '▶';
        toggleBtn.title = '收起导航';
      } else {
        panel.style.transform = position === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
        toggleBtn.textContent = position === 'left' ? '▶' : '◀';
        toggleBtn.title = '展开导航';
      }
    });
    
    return panel;
  }

  _createFloatingControls() {
    // Create floating prev/next buttons
    this.floatingControls = document.createElement('div');
    this.floatingControls.className = 'vibero-floating-controls';
    this.floatingControls.style.position = 'fixed';
    this.floatingControls.style.bottom = '40px';
    this.floatingControls.style.right = '40px';
    this.floatingControls.style.display = 'flex';
    this.floatingControls.style.gap = '12px';
    this.floatingControls.style.zIndex = '200';
    
    this.floatingControls.innerHTML = `
      <button class="floating-prev-btn" style="
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: white;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        transition: all 0.2s;
      " title="上一章节 (Ctrl+P)" disabled>
        ↑
      </button>
      
      <button class="floating-next-btn" style="
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: white;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        transition: all 0.2s;
      " title="下一章节 (Ctrl+N)" disabled>
        ↓
      </button>
    `;
    
    document.body.appendChild(this.floatingControls);
    
    // Button handlers
    const prevBtn = this.floatingControls.querySelector('.floating-prev-btn');
    const nextBtn = this.floatingControls.querySelector('.floating-next-btn');
    
    prevBtn.addEventListener('click', () => this.navigatePrevious());
    nextBtn.addEventListener('click', () => this.navigateNext());
    
    // Hover effects
    [prevBtn, nextBtn].forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) {
          btn.style.transform = 'scale(1.1)';
          btn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          this.navigatePrevious();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          this.navigateNext();
        }
      }
    });
  }

  _initScrollListener() {
    // Auto-highlight current section based on scroll position
    if (this.options.autoHighlight) {
      let ticking = false;
      
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            this._updateCurrentSection();
            this._updateReadingProgress();
            ticking = false;
          });
          ticking = true;
        }
      });
    }
  }

  setSections(sections) {
    this.sections = this._flattenSections(sections);
    this._renderOutline();
    this._updateNavigationButtons();
  }

  _flattenSections(sections, level = 0, result = []) {
    sections.forEach(section => {
      result.push({ ...section, level });
      if (section.children && section.children.length > 0) {
        this._flattenSections(section.children, level + 1, result);
      }
    });
    return result;
  }

  _renderOutline() {
    const panels = [this.leftPanel, this.rightPanel].filter(Boolean);
    
    panels.forEach(panel => {
      const content = panel.querySelector('.outline-content');
      const empty = panel.querySelector('.outline-empty');
      const countEl = panel.querySelector('.section-count');
      
      if (this.sections.length === 0) {
        empty.style.display = 'block';
        countEl.textContent = '0 个章节';
        return;
      }
      
      empty.style.display = 'none';
      countEl.textContent = `${this.sections.length} 个章节`;
      
      content.innerHTML = this.sections.map((section, index) => {
        const indent = section.level * 16;
        const isActive = section.id === this.currentSectionId;
        
        return `
          <div class="outline-item ${isActive ? 'active' : ''}" 
               data-section-id="${section.id}"
               data-index="${index}"
               style="
                 padding: 10px 20px 10px ${20 + indent}px;
                 cursor: pointer;
                 transition: all 0.2s;
                 border-left: 3px solid ${isActive ? '#667eea' : 'transparent'};
                 background: ${isActive ? 'rgba(102, 126, 234, 0.08)' : 'transparent'};
                 position: relative;
               ">
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              ${section.level === 0 ? `
                <span style="
                  font-size: 16px;
                  line-height: 1;
                ">${this._getSectionIcon(section.type)}</span>
              ` : ''}
              <span style="
                font-size: ${section.level === 0 ? '14px' : '13px'};
                font-weight: ${section.level === 0 ? '600' : '400'};
                color: ${isActive ? '#667eea' : section.level === 0 ? '#111827' : '#6b7280'};
                line-height: 1.4;
              ">${this._escapeHtml(section.title)}</span>
            </div>
            ${section.page ? `
              <div style="
                font-size: 11px;
                color: #9ca3af;
                margin-top: 4px;
              ">第 ${section.page} 页</div>
            ` : ''}
          </div>
        `;
      }).join('');
      
      // Add click handlers
      content.querySelectorAll('.outline-item').forEach(item => {
        item.addEventListener('click', () => {
          const sectionId = item.dataset.sectionId;
          const index = parseInt(item.dataset.index);
          this.navigateToSection(sectionId, index);
        });
        
        // Hover effect
        item.addEventListener('mouseenter', () => {
          if (!item.classList.contains('active')) {
            item.style.background = 'rgba(102, 126, 234, 0.04)';
          }
        });
        item.addEventListener('mouseleave', () => {
          if (!item.classList.contains('active')) {
            item.style.background = 'transparent';
          }
        });
      });
    });
  }

  _getSectionIcon(type) {
    const icons = {
      chapter: '📖',
      section: '📝',
      subsection: '📄',
      introduction: '🎯',
      conclusion: '✅',
      reference: '📚',
      appendix: '📎',
      default: '•'
    };
    return icons[type] || icons.default;
  }

  _updateCurrentSection() {
    // Find current section based on scroll position
    // This is a simplified version - in production, you'd check actual element positions
    const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    const sectionIndex = Math.floor((scrollPercentage / 100) * this.sections.length);
    
    if (sectionIndex >= 0 && sectionIndex < this.sections.length) {
      const section = this.sections[sectionIndex];
      if (section.id !== this.currentSectionId) {
        this.updateCurrentSection(section.id, sectionIndex);
      }
    }
  }

  updateCurrentSection(sectionId, index = null) {
    this.currentSectionId = sectionId;
    
    if (index === null) {
      index = this.sections.findIndex(s => s.id === sectionId);
    }
    
    // Update outline highlighting
    const panels = [this.leftPanel, this.rightPanel].filter(Boolean);
    panels.forEach(panel => {
      panel.querySelectorAll('.outline-item').forEach(item => {
        const isActive = item.dataset.sectionId === sectionId;
        item.classList.toggle('active', isActive);
        item.style.borderLeft = `3px solid ${isActive ? '#667eea' : 'transparent'}`;
        item.style.background = isActive ? 'rgba(102, 126, 234, 0.08)' : 'transparent';
        
        // Update text color
        const titleEl = item.querySelector('span:last-child');
        if (titleEl) {
          const section = this.sections[parseInt(item.dataset.index)];
          titleEl.style.color = isActive ? '#667eea' : section.level === 0 ? '#111827' : '#6b7280';
        }
      });
      
      // Scroll active item into view
      const activeItem = panel.querySelector('.outline-item.active');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    
    this._updateNavigationButtons();
    this._emit('sectionChange', { sectionId, index });
  }

  _updateNavigationButtons() {
    const currentIndex = this.sections.findIndex(s => s.id === this.currentSectionId);
    
    const prevBtn = this.floatingControls?.querySelector('.floating-prev-btn');
    const nextBtn = this.floatingControls?.querySelector('.floating-next-btn');
    
    if (prevBtn) {
      prevBtn.disabled = currentIndex <= 0;
      prevBtn.style.opacity = prevBtn.disabled ? '0.4' : '1';
      prevBtn.style.cursor = prevBtn.disabled ? 'not-allowed' : 'pointer';
    }
    
    if (nextBtn) {
      nextBtn.disabled = currentIndex >= this.sections.length - 1 || currentIndex === -1;
      nextBtn.style.opacity = nextBtn.disabled ? '0.4' : '1';
      nextBtn.style.cursor = nextBtn.disabled ? 'not-allowed' : 'pointer';
    }
  }

  _updateReadingProgress() {
    const scrollPercentage = Math.min(100, Math.max(0, 
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    ));
    
    const panels = [this.leftPanel, this.rightPanel].filter(Boolean);
    panels.forEach(panel => {
      const progressBar = panel.querySelector('.progress-bar');
      const progressText = panel.querySelector('.progress-percentage');
      
      if (progressBar) {
        progressBar.style.width = `${scrollPercentage}%`;
      }
      if (progressText) {
        progressText.textContent = `${Math.round(scrollPercentage)}%`;
      }
    });
  }

  navigateToSection(sectionId, index = null) {
    if (index === null) {
      index = this.sections.findIndex(s => s.id === sectionId);
    }
    
    if (index === -1) return;
    
    const section = this.sections[index];
    this.updateCurrentSection(sectionId, index);
    this._emit('sectionNavigate', { sectionId, page: section.page, section });
  }

  navigatePrevious() {
    const currentIndex = this.sections.findIndex(s => s.id === this.currentSectionId);
    if (currentIndex > 0) {
      const prevSection = this.sections[currentIndex - 1];
      this.navigateToSection(prevSection.id, currentIndex - 1);
    }
  }

  navigateNext() {
    const currentIndex = this.sections.findIndex(s => s.id === this.currentSectionId);
    if (currentIndex < this.sections.length - 1) {
      const nextSection = this.sections[currentIndex + 1];
      this.navigateToSection(nextSection.id, currentIndex + 1);
    }
  }

  togglePanel(position) {
    const panel = position === 'left' ? this.leftPanel : this.rightPanel;
    if (!panel) return;
    
    const isCollapsed = panel.style.transform !== '';
    const toggleBtn = panel.querySelector('.toggle-outline-btn');
    
    if (isCollapsed) {
      panel.style.transform = '';
      toggleBtn.textContent = position === 'left' ? '◀' : '▶';
    } else {
      panel.style.transform = position === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
      toggleBtn.textContent = position === 'left' ? '▶' : '◀';
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

  // Cleanup
  destroy() {
    if (this.leftPanel) this.leftPanel.remove();
    if (this.rightPanel) this.rightPanel.remove();
    if (this.floatingControls) this.floatingControls.remove();
  }
}
