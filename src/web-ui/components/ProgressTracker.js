// ProgressTracker.js - Reading progress tracking and persistence
export class ProgressTracker {
  constructor() {
    this.paperId = null;
    this.totalPages = 0;
    this.currentPage = 1;
    this.visitedSections = new Set();
    this.visitedPages = new Set();
    this.startTime = Date.now();
    this.readingTime = 0;
    this.autoSaveInterval = null;
    this.listeners = {};
  }

  initialize(paperId, totalPages) {
    this.paperId = paperId;
    this.totalPages = totalPages;
    this.currentPage = 1;
    this.visitedSections.clear();
    this.visitedPages.clear();
    this.startTime = Date.now();
    
    // Start auto-save
    this.startAutoSave();
    
    // Try to restore previous state
    this.restoreState();
  }

  updateProgress(page, section = null) {
    this.currentPage = page;
    this.visitedPages.add(page);
    
    if (section) {
      this.visitedSections.add(section);
    }
    
    this._emit('progressUpdate', this.getProgress());
  }

  getProgress() {
    const percentComplete = this.totalPages > 0 
      ? Math.round((this.visitedPages.size / this.totalPages) * 100)
      : 0;
    
    const pagesRemaining = this.totalPages - this.visitedPages.size;
    const avgTimePerPage = this.visitedPages.size > 0 
      ? (Date.now() - this.startTime) / this.visitedPages.size
      : 60000; // Default 1 min per page
    
    const estimatedTimeRemaining = Math.round((pagesRemaining * avgTimePerPage) / 60000); // minutes
    
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      visitedPages: this.visitedPages.size,
      percentComplete,
      pagesRemaining,
      estimatedTimeRemaining,
      visitedSections: Array.from(this.visitedSections),
      readingTime: Math.round((Date.now() - this.startTime) / 60000) // minutes
    };
  }

  async saveState() {
    if (!this.paperId) return;
    
    const state = {
      paperId: this.paperId,
      currentPage: this.currentPage,
      visitedPages: Array.from(this.visitedPages),
      visitedSections: Array.from(this.visitedSections),
      readingTime: Date.now() - this.startTime,
      lastUpdated: Date.now()
    };
    
    try {
      // Save to backend API
      const response = await fetch(`/api/papers/${this.paperId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save progress');
      }
      
      // Also save to localStorage as backup
      localStorage.setItem(`progress_${this.paperId}`, JSON.stringify(state));
      
      this._emit('stateSaved', state);
    } catch (error) {
      console.error('Error saving progress:', error);
      // Fallback to localStorage only
      localStorage.setItem(`progress_${this.paperId}`, JSON.stringify(state));
    }
  }

  async restoreState() {
    if (!this.paperId) return null;
    
    try {
      // Try to restore from backend first
      const response = await fetch(`/api/papers/${this.paperId}/progress`);
      
      if (response.ok) {
        const state = await response.json();
        this._applyState(state);
        return state;
      }
    } catch (error) {
      console.error('Error restoring from backend:', error);
    }
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(`progress_${this.paperId}`);
      if (stored) {
        const state = JSON.parse(stored);
        this._applyState(state);
        return state;
      }
    } catch (error) {
      console.error('Error restoring from localStorage:', error);
    }
    
    return null;
  }

  _applyState(state) {
    if (!state) return;
    
    this.currentPage = state.currentPage || 1;
    this.visitedPages = new Set(state.visitedPages || []);
    this.visitedSections = new Set(state.visitedSections || []);
    
    if (state.readingTime) {
      this.startTime = Date.now() - state.readingTime;
    }
    
    this._emit('stateRestored', state);
  }

  startAutoSave() {
    // Clear existing interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveState();
    }, 30000);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  reset() {
    this.stopAutoSave();
    this.visitedSections.clear();
    this.visitedPages.clear();
    this.currentPage = 1;
    this.startTime = Date.now();
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

  // Create visual progress bar element
  createProgressBar() {
    const container = document.createElement('div');
    container.className = 'progress-tracker';
    container.innerHTML = `
      <div class="progress-bar-container">
        <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill"></div>
        </div>
        <div class="progress-stats">
          <span class="progress-percent">0%</span>
          <span class="progress-pages">0 / 0 pages</span>
          <span class="progress-time" title="Estimated time remaining"></span>
        </div>
      </div>
    `;
    
    // Update on progress changes
    this.on('progressUpdate', (progress) => {
      this.updateProgressBar(container, progress);
    });
    
    return container;
  }

  updateProgressBar(container, progress) {
    const fill = container.querySelector('.progress-fill');
    const percent = container.querySelector('.progress-percent');
    const pages = container.querySelector('.progress-pages');
    const time = container.querySelector('.progress-time');
    const bar = container.querySelector('.progress-bar');
    
    fill.style.width = `${progress.percentComplete}%`;
    bar.setAttribute('aria-valuenow', progress.percentComplete);
    percent.textContent = `${progress.percentComplete}%`;
    pages.textContent = `${progress.visitedPages} / ${progress.totalPages} pages`;
    
    if (progress.estimatedTimeRemaining > 0) {
      const hours = Math.floor(progress.estimatedTimeRemaining / 60);
      const mins = progress.estimatedTimeRemaining % 60;
      const timeStr = hours > 0 
        ? `~${hours}h ${mins}m remaining`
        : `~${mins}m remaining`;
      time.textContent = timeStr;
      time.style.display = 'inline';
    } else {
      time.style.display = 'none';
    }
  }
}
