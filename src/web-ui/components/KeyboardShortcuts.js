// KeyboardShortcuts.js - Global keyboard shortcuts handler
export class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this._boundHandler = this._handleKeydown.bind(this);
    
    this._initDefaultShortcuts();
    this._attachListener();
  }

  _initDefaultShortcuts() {
    // Navigation shortcuts
    this.register('ctrl+b', 'Toggle sidebar', () => {
      this._emit('toggleSidebar');
    });
    
    this.register('ctrl+n', 'Next section', () => {
      this._emit('nextSection');
    });
    
    this.register('ctrl+p', 'Previous section', () => {
      this._emit('previousSection');
    });
    
    this.register('ctrl+f', 'Search in document', () => {
      this._emit('searchDocument');
    });
    
    this.register('ctrl+h', 'Toggle annotations', () => {
      this._emit('toggleAnnotations');
    });
    
    this.register('ctrl+/', 'Show shortcuts help', () => {
      this._emit('showHelp');
    });
    
    this.register('ctrl+d', 'Toggle dark mode', () => {
      this._emit('toggleDarkMode');
    });
    
    // PDF viewer shortcuts
    this.register('pageup', 'Previous page', () => {
      this._emit('previousPage');
    });
    
    this.register('pagedown', 'Next page', () => {
      this._emit('nextPage');
    });
    
    this.register('home', 'First page', () => {
      this._emit('firstPage');
    });
    
    this.register('end', 'Last page', () => {
      this._emit('lastPage');
    });
    
    this.register('ctrl+=', 'Zoom in', () => {
      this._emit('zoomIn');
    });
    
    this.register('ctrl+-', 'Zoom out', () => {
      this._emit('zoomOut');
    });
    
    this.register('ctrl+0', 'Reset zoom', () => {
      this._emit('resetZoom');
    });
    
    // Escape to close modals
    this.register('escape', 'Close modal', () => {
      this._emit('closeModal');
    });
  }

  register(key, description, handler) {
    const normalizedKey = this._normalizeKey(key);
    this.shortcuts.set(normalizedKey, { description, handler });
  }

  unregister(key) {
    const normalizedKey = this._normalizeKey(key);
    this.shortcuts.delete(normalizedKey);
  }

  _normalizeKey(key) {
    return key.toLowerCase()
      .replace(/\s+/g, '')
      .replace('command', 'ctrl')
      .replace('cmd', 'ctrl');
  }

  _attachListener() {
    document.addEventListener('keydown', this._boundHandler);
  }

  _handleKeydown(e) {
    if (!this.enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    const target = e.target;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable) {
      // Allow Escape and Ctrl+shortcuts even in inputs
      if (e.key !== 'Escape' && !e.ctrlKey && !e.metaKey) {
        return;
      }
    }
    
    const key = this._getKeyString(e);
    const shortcut = this.shortcuts.get(key);
    
    if (shortcut) {
      e.preventDefault();
      shortcut.handler(e);
    }
  }

  _getKeyString(e) {
    const parts = [];
    
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey && e.key.length > 1) parts.push('shift'); // Only for special keys
    
    const key = e.key.toLowerCase();
    parts.push(key);
    
    return parts.join('+');
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  destroy() {
    document.removeEventListener('keydown', this._boundHandler);
    this.shortcuts.clear();
  }

  // Get all shortcuts for help display
  getShortcuts() {
    const shortcuts = [];
    this.shortcuts.forEach((value, key) => {
      shortcuts.push({
        key: this._formatKeyForDisplay(key),
        description: value.description
      });
    });
    return shortcuts;
  }

  _formatKeyForDisplay(key) {
    return key
      .split('+')
      .map(part => {
        if (part === 'ctrl') return 'Ctrl';
        if (part === 'alt') return 'Alt';
        if (part === 'shift') return 'Shift';
        if (part === 'escape') return 'Esc';
        if (part === 'pageup') return 'Page Up';
        if (part === 'pagedown') return 'Page Down';
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' + ');
  }

  // Event system
  on(event, callback) {
    if (!this._listeners) this._listeners = {};
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  _emit(event, data) {
    if (this._listeners && this._listeners[event]) {
      this._listeners[event].forEach(cb => cb(data));
    }
  }

  // Show help modal
  showHelp() {
    const modal = this._createHelpModal();
    document.body.appendChild(modal);
    
    // Close on click outside or Escape
    const closeModal = () => {
      modal.remove();
    };
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    modal.querySelector('.shortcuts-close').addEventListener('click', closeModal);
  }

  _createHelpModal() {
    const modal = document.createElement('div');
    modal.className = 'keyboard-shortcuts-modal';
    
    const shortcuts = this.getShortcuts();
    const groups = this._groupShortcuts(shortcuts);
    
    modal.innerHTML = `
      <div class="shortcuts-content">
        <div class="shortcuts-header">
          <h3>Keyboard Shortcuts</h3>
          <button class="shortcuts-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
            </svg>
          </button>
        </div>
        <div class="shortcuts-body">
          ${Object.entries(groups).map(([group, items]) => `
            <div class="shortcuts-group">
              <h4>${group}</h4>
              <ul>
                ${items.map(item => `
                  <li>
                    <kbd>${item.key}</kbd>
                    <span>${item.description}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    return modal;
  }

  _groupShortcuts(shortcuts) {
    const groups = {
      'Navigation': [],
      'PDF Viewer': [],
      'General': []
    };
    
    shortcuts.forEach(shortcut => {
      const desc = shortcut.description.toLowerCase();
      
      if (desc.includes('section') || desc.includes('sidebar')) {
        groups['Navigation'].push(shortcut);
      } else if (desc.includes('page') || desc.includes('zoom')) {
        groups['PDF Viewer'].push(shortcut);
      } else {
        groups['General'].push(shortcut);
      }
    });
    
    return groups;
  }
}
