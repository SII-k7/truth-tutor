// AnnotationLayer.vibero.js - Vibero-style sticky note annotations with AI interactions

export class ViberoAnnotationLayer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      enableTranslation: true,
      enableAIExplanation: true,
      stickyNoteStyle: 'vibero', // 'vibero' | 'minimal'
      locale: 'zh-CN',
      ...options
    };
    
    this.annotations = new Map(); // id -> annotation data
    this.stickyNotes = new Map(); // id -> DOM element
    this.tooltip = null;
    this.aiSidebar = null;
    this.currentAnnotation = null;
    
    this._initOverlay();
    this._initTooltip();
    this._initAISidebar();
    this._initStyles();
  }

  _initOverlay() {
    // Create annotation overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'vibero-annotation-overlay';
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.zIndex = '10';
    this.container.appendChild(this.overlay);
  }

  _initTooltip() {
    // Create translation tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'vibero-translation-tooltip';
    this.tooltip.style.display = 'none';
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    this.tooltip.style.color = 'white';
    this.tooltip.style.padding = '8px 12px';
    this.tooltip.style.borderRadius = '8px';
    this.tooltip.style.fontSize = '13px';
    this.tooltip.style.fontWeight = '500';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.zIndex = '1000';
    this.tooltip.style.maxWidth = '280px';
    this.tooltip.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
    this.tooltip.style.transition = 'opacity 0.2s ease';
    this.tooltip.style.lineHeight = '1.5';
    document.body.appendChild(this.tooltip);
  }

  _initAISidebar() {
    // Create AI explanation sidebar
    this.aiSidebar = document.createElement('div');
    this.aiSidebar.className = 'vibero-ai-sidebar';
    this.aiSidebar.style.display = 'none';
    this.aiSidebar.style.position = 'fixed';
    this.aiSidebar.style.right = '0';
    this.aiSidebar.style.top = '0';
    this.aiSidebar.style.width = '400px';
    this.aiSidebar.style.height = '100vh';
    this.aiSidebar.style.background = 'white';
    this.aiSidebar.style.boxShadow = '-4px 0 24px rgba(0, 0, 0, 0.1)';
    this.aiSidebar.style.zIndex = '2000';
    this.aiSidebar.style.overflowY = 'auto';
    this.aiSidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    this.aiSidebar.style.transform = 'translateX(100%)';
    
    this.aiSidebar.innerHTML = `
      <div class="ai-sidebar-header" style="padding: 20px; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; background: white; z-index: 10;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
            🤖 AI 解答
          </h3>
          <button class="close-sidebar-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: background 0.2s;">
            ×
          </button>
        </div>
      </div>
      <div class="ai-sidebar-content" style="padding: 20px;">
        <div class="ai-loading" style="display: none; text-align: center; padding: 40px 0;">
          <div class="spinner" style="border: 3px solid #f3f4f6; border-top: 3px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
          <p style="margin-top: 16px; color: #6b7280;">AI 正在思考...</p>
        </div>
        <div class="ai-response"></div>
      </div>
    `;
    
    document.body.appendChild(this.aiSidebar);
    
    // Close button handler
    this.aiSidebar.querySelector('.close-sidebar-btn').addEventListener('click', () => {
      this.hideAISidebar();
    });
    
    // Close on overlay click
    const overlay = document.createElement('div');
    overlay.className = 'ai-sidebar-overlay';
    overlay.style.display = 'none';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0, 0, 0, 0.3)';
    overlay.style.zIndex = '1999';
    overlay.style.transition = 'opacity 0.3s ease';
    overlay.addEventListener('click', () => this.hideAISidebar());
    document.body.appendChild(overlay);
    this.sidebarOverlay = overlay;
  }

  _initStyles() {
    // Inject CSS for animations and hover effects
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes stickyNotePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      @keyframes stickyNoteAppear {
        0% { opacity: 0; transform: translateY(-10px) rotate(-5deg); }
        100% { opacity: 1; transform: translateY(0) rotate(0deg); }
      }
      
      .vibero-sticky-note {
        animation: stickyNoteAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        transition: all 0.2s ease;
      }
      
      .vibero-sticky-note:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        z-index: 100 !important;
      }
      
      .vibero-sticky-note:active {
        transform: translateY(0) scale(0.98);
      }
      
      .close-sidebar-btn:hover {
        background: #f3f4f6 !important;
      }
      
      .ai-sidebar-content h4 {
        margin: 0 0 12px 0;
        font-size: 15px;
        font-weight: 600;
        color: #374151;
      }
      
      .ai-sidebar-content p {
        margin: 0 0 12px 0;
        line-height: 1.7;
        color: #4b5563;
        font-size: 14px;
      }
      
      .ai-sidebar-content ul, .ai-sidebar-content ol {
        margin: 0 0 12px 0;
        padding-left: 20px;
        color: #4b5563;
        font-size: 14px;
      }
      
      .ai-sidebar-content li {
        margin-bottom: 8px;
        line-height: 1.6;
      }
      
      .ai-sidebar-content code {
        background: #f3f4f6;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 13px;
        font-family: 'Monaco', 'Menlo', monospace;
      }
      
      .ai-sidebar-content pre {
        background: #1f2937;
        color: #f9fafb;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        font-size: 13px;
        margin: 0 0 12px 0;
      }
    `;
    document.head.appendChild(style);
  }

  // Add annotation with sticky note style
  addAnnotation(annotation) {
    const { id, x, y, type, content, translation, aiExplanation, page, reference } = annotation;
    
    // Store annotation data
    this.annotations.set(id, annotation);
    
    // Create sticky note element
    const stickyNote = document.createElement('div');
    stickyNote.className = 'vibero-sticky-note';
    stickyNote.dataset.annotationId = id;
    stickyNote.style.position = 'absolute';
    stickyNote.style.left = `${x}px`;
    stickyNote.style.top = `${y}px`;
    stickyNote.style.width = '32px';
    stickyNote.style.height = '32px';
    stickyNote.style.cursor = 'pointer';
    stickyNote.style.pointerEvents = 'all';
    stickyNote.style.zIndex = '50';
    
    // Sticky note colors based on type
    const stickyColors = {
      translation: { bg: '#fef3c7', border: '#fbbf24', icon: '🌐' },
      explanation: { bg: '#d1fae5', border: '#10b981', icon: '💡' },
      concept: { bg: '#dbeafe', border: '#3b82f6', icon: '🎯' },
      question: { bg: '#fce7f3', border: '#ec4899', icon: '❓' },
      default: { bg: '#e0e7ff', border: '#6366f1', icon: '📌' }
    };
    
    const color = stickyColors[type] || stickyColors.default;
    
    stickyNote.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        background: ${color.bg};
        border: 2px solid ${color.border};
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        position: relative;
      ">
        ${color.icon}
        <div style="
          position: absolute;
          top: -4px;
          right: -4px;
          width: 10px;
          height: 10px;
          background: ${color.border};
          border-radius: 50%;
          animation: stickyNotePulse 2s ease-in-out infinite;
        "></div>
      </div>
    `;
    
    // Event handlers
    stickyNote.addEventListener('mouseenter', (e) => this._showTranslationTooltip(id, e));
    stickyNote.addEventListener('mouseleave', () => this._hideTranslationTooltip());
    stickyNote.addEventListener('click', (e) => this._showAIExplanation(id, e));
    
    this.overlay.appendChild(stickyNote);
    this.stickyNotes.set(id, stickyNote);
  }

  // Show translation tooltip on hover
  _showTranslationTooltip(id, event) {
    if (!this.options.enableTranslation) return;
    
    const annotation = this.annotations.get(id);
    if (!annotation || !annotation.translation) return;
    
    this.tooltip.innerHTML = `
      <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;">翻译</div>
      <div>${this._escapeHtml(annotation.translation)}</div>
    `;
    
    this.tooltip.style.display = 'block';
    this.tooltip.style.opacity = '1';
    
    // Position tooltip near cursor
    const rect = event.target.getBoundingClientRect();
    this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
    this.tooltip.style.top = `${rect.top - 10}px`;
    this.tooltip.style.transform = 'translate(-50%, -100%)';
  }

  _hideTranslationTooltip() {
    this.tooltip.style.opacity = '0';
    setTimeout(() => {
      if (this.tooltip.style.opacity === '0') {
        this.tooltip.style.display = 'none';
      }
    }, 200);
  }

  // Show AI explanation sidebar
  async _showAIExplanation(id, event) {
    if (!this.options.enableAIExplanation) return;
    
    event.stopPropagation();
    const annotation = this.annotations.get(id);
    if (!annotation) return;
    
    this.currentAnnotation = annotation;
    
    // Show sidebar with loading state
    this.sidebarOverlay.style.display = 'block';
    this.aiSidebar.style.display = 'block';
    setTimeout(() => {
      this.aiSidebar.style.transform = 'translateX(0)';
    }, 10);
    
    const loadingEl = this.aiSidebar.querySelector('.ai-loading');
    const responseEl = this.aiSidebar.querySelector('.ai-response');
    
    loadingEl.style.display = 'block';
    responseEl.innerHTML = '';
    
    // Simulate AI response (in real implementation, call API)
    try {
      const explanation = annotation.aiExplanation || await this._fetchAIExplanation(annotation);
      
      loadingEl.style.display = 'none';
      responseEl.innerHTML = `
        <div style="background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 16px; border-left: 3px solid #667eea;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">原文</div>
          <div style="font-size: 14px; color: #111827; line-height: 1.6;">${this._escapeHtml(annotation.content)}</div>
        </div>
        
        ${annotation.translation ? `
          <div style="margin-bottom: 20px;">
            <h4>🌐 翻译</h4>
            <p>${this._escapeHtml(annotation.translation)}</p>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 20px;">
          <h4>💡 AI 解答</h4>
          <div>${this._formatAIResponse(explanation)}</div>
        </div>
        
        ${annotation.reference ? `
          <div style="background: #fffbeb; padding: 12px; border-radius: 8px; border-left: 3px solid #f59e0b;">
            <div style="font-size: 12px; color: #92400e; margin-bottom: 6px;">📖 参考</div>
            <div style="font-size: 13px; color: #78350f;">${this._escapeHtml(annotation.reference)}</div>
          </div>
        ` : ''}
      `;
    } catch (error) {
      loadingEl.style.display = 'none';
      responseEl.innerHTML = `
        <div style="text-align: center; padding: 40px 0; color: #ef4444;">
          <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
          <p>加载 AI 解答失败</p>
          <p style="font-size: 13px; color: #6b7280;">${error.message}</p>
        </div>
      `;
    }
  }

  async _fetchAIExplanation(annotation) {
    // In real implementation, call your AI API
    // For now, return mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`
          <p>这段内容讨论了 <strong>${annotation.type}</strong> 的核心概念。</p>
          <p>关键要点：</p>
          <ul>
            <li>理解上下文和背景知识</li>
            <li>掌握核心术语和定义</li>
            <li>联系实际应用场景</li>
          </ul>
          <p>建议进一步阅读相关章节以加深理解。</p>
        `);
      }, 1000);
    });
  }

  _formatAIResponse(html) {
    // Basic HTML formatting (in production, use a proper markdown/HTML sanitizer)
    return html;
  }

  hideAISidebar() {
    this.aiSidebar.style.transform = 'translateX(100%)';
    setTimeout(() => {
      this.aiSidebar.style.display = 'none';
      this.sidebarOverlay.style.display = 'none';
    }, 300);
  }

  // Remove annotation
  removeAnnotation(id) {
    const stickyNote = this.stickyNotes.get(id);
    if (stickyNote) {
      stickyNote.remove();
      this.stickyNotes.delete(id);
    }
    this.annotations.delete(id);
  }

  // Highlight annotation
  highlightAnnotation(id) {
    const stickyNote = this.stickyNotes.get(id);
    if (stickyNote) {
      stickyNote.style.animation = 'stickyNotePulse 0.5s ease-in-out 3';
    }
  }

  // Clear all annotations
  clear() {
    this.overlay.innerHTML = '';
    this.stickyNotes.clear();
    this.annotations.clear();
  }

  // Update dimensions
  updateDimensions(width, height) {
    this.overlay.style.width = `${width}px`;
    this.overlay.style.height = `${height}px`;
  }

  // Helper to escape HTML
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Cleanup
  destroy() {
    if (this.overlay) this.overlay.remove();
    if (this.tooltip) this.tooltip.remove();
    if (this.aiSidebar) this.aiSidebar.remove();
    if (this.sidebarOverlay) this.sidebarOverlay.remove();
  }
}
