// OnboardingTour.js - First-time user onboarding tour
export class OnboardingTour {
  constructor() {
    this.steps = [
      {
        target: '.topbar-search',
        title: 'Search Papers',
        content: 'Search for arXiv papers by title or paste a PDF link to get started.',
        position: 'bottom'
      },
      {
        target: '.sidebar',
        title: 'Document Outline',
        content: 'Navigate through sections using the document outline. Click any section to jump to it.',
        position: 'right'
      },
      {
        target: '.viewer-panel',
        title: 'PDF Viewer',
        content: 'Read your paper here. Click on text to add annotations and ask questions.',
        position: 'left'
      },
      {
        target: '.chat-panel',
        title: 'AI Assistant',
        content: 'Ask questions about anything you don\'t understand. The AI will explain concepts in detail.',
        position: 'left'
      },
      {
        target: '.section-navigator',
        title: 'Section Navigation',
        content: 'Use Previous/Next buttons or keyboard shortcuts (Ctrl+P/N) to navigate between sections.',
        position: 'top'
      },
      {
        target: '.progress-tracker',
        title: 'Track Progress',
        content: 'Your reading progress is automatically saved. Resume where you left off anytime.',
        position: 'top'
      }
    ];
    
    this.currentStep = 0;
    this.isActive = false;
    this.overlay = null;
    this.tooltip = null;
  }

  start() {
    // Check if user has seen tour before
    if (localStorage.getItem('onboarding_completed')) {
      return;
    }
    
    this.isActive = true;
    this.currentStep = 0;
    this._createOverlay();
    this._showStep(0);
  }

  _createOverlay() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'onboarding-overlay';
    this.overlay.innerHTML = `
      <div class="onboarding-backdrop"></div>
    `;
    document.body.appendChild(this.overlay);
    
    // Create tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'onboarding-tooltip';
    this.tooltip.innerHTML = `
      <div class="tooltip-content">
        <h3 class="tooltip-title"></h3>
        <p class="tooltip-text"></p>
      </div>
      <div class="tooltip-footer">
        <button class="tooltip-skip">Skip Tour</button>
        <div class="tooltip-progress">
          <span class="progress-dots"></span>
        </div>
        <div class="tooltip-nav">
          <button class="tooltip-prev" disabled>Previous</button>
          <button class="tooltip-next">Next</button>
        </div>
      </div>
      <div class="tooltip-arrow"></div>
    `;
    document.body.appendChild(this.tooltip);
    
    // Setup event listeners
    this.tooltip.querySelector('.tooltip-skip').addEventListener('click', () => this.skip());
    this.tooltip.querySelector('.tooltip-prev').addEventListener('click', () => this.previous());
    this.tooltip.querySelector('.tooltip-next').addEventListener('click', () => this.next());
    
    // Close on Escape
    this._escapeHandler = (e) => {
      if (e.key === 'Escape') this.skip();
    };
    document.addEventListener('keydown', this._escapeHandler);
  }

  _showStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    
    const step = this.steps[index];
    const target = document.querySelector(step.target);
    
    if (!target) {
      // Target not found, skip to next
      if (index < this.steps.length - 1) {
        this._showStep(index + 1);
      } else {
        this.complete();
      }
      return;
    }
    
    // Update tooltip content
    this.tooltip.querySelector('.tooltip-title').textContent = step.title;
    this.tooltip.querySelector('.tooltip-text').textContent = step.content;
    
    // Update progress dots
    const dotsContainer = this.tooltip.querySelector('.progress-dots');
    dotsContainer.innerHTML = this.steps.map((_, i) => 
      `<span class="progress-dot ${i === index ? 'active' : ''}"></span>`
    ).join('');
    
    // Update navigation buttons
    const prevBtn = this.tooltip.querySelector('.tooltip-prev');
    const nextBtn = this.tooltip.querySelector('.tooltip-next');
    
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === this.steps.length - 1 ? 'Finish' : 'Next';
    
    // Highlight target
    this._highlightTarget(target);
    
    // Position tooltip
    this._positionTooltip(target, step.position);
    
    // Scroll target into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  _highlightTarget(target) {
    // Remove previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
    
    // Add highlight to current target
    target.classList.add('onboarding-highlight');
    
    // Create spotlight effect
    const rect = target.getBoundingClientRect();
    const backdrop = this.overlay.querySelector('.onboarding-backdrop');
    backdrop.style.clipPath = `polygon(
      0 0, 0 100%, 
      ${rect.left - 8}px 100%, 
      ${rect.left - 8}px ${rect.top - 8}px, 
      ${rect.right + 8}px ${rect.top - 8}px, 
      ${rect.right + 8}px ${rect.bottom + 8}px, 
      ${rect.left - 8}px ${rect.bottom + 8}px, 
      ${rect.left - 8}px 100%, 
      100% 100%, 100% 0
    )`;
  }

  _positionTooltip(target, position) {
    const rect = target.getBoundingClientRect();
    const tooltip = this.tooltip;
    const arrow = tooltip.querySelector('.tooltip-arrow');
    
    // Reset positioning
    tooltip.style.top = '';
    tooltip.style.left = '';
    tooltip.style.right = '';
    tooltip.style.bottom = '';
    arrow.className = 'tooltip-arrow';
    
    const offset = 16;
    
    switch(position) {
      case 'top':
        tooltip.style.bottom = `${window.innerHeight - rect.top + offset}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.transform = 'translateX(-50%)';
        arrow.classList.add('arrow-bottom');
        break;
        
      case 'bottom':
        tooltip.style.top = `${rect.bottom + offset}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.transform = 'translateX(-50%)';
        arrow.classList.add('arrow-top');
        break;
        
      case 'left':
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
        tooltip.style.right = `${window.innerWidth - rect.left + offset}px`;
        tooltip.style.transform = 'translateY(-50%)';
        arrow.classList.add('arrow-right');
        break;
        
      case 'right':
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
        tooltip.style.left = `${rect.right + offset}px`;
        tooltip.style.transform = 'translateY(-50%)';
        arrow.classList.add('arrow-left');
        break;
    }
  }

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this._showStep(this.currentStep);
    } else {
      this.complete();
    }
  }

  previous() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this._showStep(this.currentStep);
    }
  }

  skip() {
    this.complete(false);
  }

  complete(markCompleted = true) {
    this.isActive = false;
    
    // Remove overlay and tooltip
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
    
    // Remove highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
    
    // Remove event listener
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
    }
    
    // Mark as completed
    if (markCompleted) {
      localStorage.setItem('onboarding_completed', 'true');
    }
  }

  reset() {
    localStorage.removeItem('onboarding_completed');
  }

  // Static method to show tour button
  static createTourButton() {
    const button = document.createElement('button');
    button.className = 'tour-button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.93 12H7.07V7h1.86v5zm0-6H7.07V4h1.86v2z"/>
      </svg>
      <span>Take Tour</span>
    `;
    button.title = 'Take a tour of Truth Tutor';
    
    return button;
  }
}
