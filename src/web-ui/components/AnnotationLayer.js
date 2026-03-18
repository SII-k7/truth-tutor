// AnnotationLayer.js - SVG overlay for PDF annotations with hover/click interactions

export class AnnotationLayer {
  constructor(container) {
    this.container = container;
    this.svg = null;
    this.annotations = new Map(); // id -> annotation data
    this.tooltip = null;
    this.popup = null;
    
    this._initSVG();
    this._initTooltip();
    this._initPopup();
  }

  _initSVG() {
    // Create SVG overlay
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.id = 'annotation-layer';
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.pointerEvents = 'none';
    this.svg.style.zIndex = '10';
    this.container.appendChild(this.svg);
  }

  _initTooltip() {
    // Create tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'annotation-tooltip';
    this.tooltip.style.display = 'none';
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.background = 'rgba(0, 0, 0, 0.85)';
    this.tooltip.style.color = 'white';
    this.tooltip.style.padding = '6px 10px';
    this.tooltip.style.borderRadius = '4px';
    this.tooltip.style.fontSize = '12px';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.zIndex = '100';
    this.tooltip.style.maxWidth = '200px';
    document.body.appendChild(this.tooltip);
  }

  _initPopup() {
    // Create popup element for detailed view
    this.popup = document.createElement('div');
    this.popup.className = 'annotation-popup';
    this.popup.style.display = 'none';
    this.popup.style.position = 'fixed';
    this.popup.style.background = 'white';
    this.popup.style.border = '1px solid #ddd';
    this.popup.style.borderRadius = '8px';
    this.popup.style.padding = '16px';
    this.popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    this.popup.style.zIndex = '1000';
    this.popup.style.maxWidth = '400px';
    this.popup.style.maxHeight = '80vh';
    this.popup.style.overflow = 'auto';
    document.body.appendChild(this.popup);
    
    // Close popup on click outside
    document.addEventListener('click', (e) => {
      if (!this.popup.contains(e.target) && !e.target.closest('.annotation-marker')) {
        this.hidePopup();
      }
    });
  }

  // Update SVG dimensions to match canvas
  updateDimensions(width, height) {
    this.svg.setAttribute('width', width);
    this.svg.setAttribute('height', height);
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  // Add annotation to the layer
  addAnnotation(annotation) {
    const { id, x, y, type, content, page } = annotation;
    
    // Store annotation data
    this.annotations.set(id, annotation);
    
    // Create marker group
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-annotation-id', id);
    group.setAttribute('class', 'annotation-marker');
    group.style.cursor = 'pointer';
    group.style.pointerEvents = 'all';
    
    // Create marker circle based on type
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', '8');
    
    // Color based on annotation type
    const colors = {
      translation: '#3b82f6',
      explanation: '#10b981',
      concept: '#f59e0b',
      default: '#6366f1'
    };
    circle.setAttribute('fill', colors[type] || colors.default);
    circle.setAttribute('opacity', '0.8');
    
    // Add pulse animation
    const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pulseCircle.setAttribute('cx', x);
    pulseCircle.setAttribute('cy', y);
    pulseCircle.setAttribute('r', '8');
    pulseCircle.setAttribute('fill', 'none');
    pulseCircle.setAttribute('stroke', colors[type] || colors.default);
    pulseCircle.setAttribute('stroke-width', '2');
    pulseCircle.setAttribute('opacity', '0');
    
    // Simple CSS animation via class
    pulseCircle.classList.add('annotation-pulse');
    
    group.appendChild(pulseCircle);
    group.appendChild(circle);
    
    // Hover events
    group.addEventListener('mouseenter', (e) => this._showTooltip(id, e));
    group.addEventListener('mouseleave', () => this._hideTooltip());
    group.addEventListener('click', (e) => this._showPopup(id, e));
    
    this.svg.appendChild(group);
  }

  // Remove annotation
  removeAnnotation(id) {
    const marker = this.svg.querySelector(`[data-annotation-id="${id}"]`);
    if (marker) {
      marker.remove();
    }
    this.annotations.delete(id);
  }

  // Highlight specific annotation
  highlightAnnotation(id) {
    const marker = this.svg.querySelector(`[data-annotation-id="${id}"]`);
    if (marker) {
      const circle = marker.querySelector('circle');
      circle.setAttribute('r', '12');
      circle.setAttribute('opacity', '1');
      setTimeout(() => {
        circle.setAttribute('r', '8');
        circle.setAttribute('opacity', '0.8');
      }, 500);
    }
  }

  // Show tooltip on hover
  _showTooltip(id, event) {
    const annotation = this.annotations.get(id);
    if (!annotation) return;
    
    const preview = annotation.content.substring(0, 80) + (annotation.content.length > 80 ? '...' : '');
    this.tooltip.textContent = preview;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${event.clientX + 10}px`;
    this.tooltip.style.top = `${event.clientY + 10}px`;
  }

  _hideTooltip() {
    this.tooltip.style.display = 'none';
  }

  // Show popup on click
  _showPopup(id, event) {
    event.stopPropagation();
    const annotation = this.annotations.get(id);
    if (!annotation) return;
    
    // Build popup content
    const typeLabels = {
      translation: '🌐 Translation',
      explanation: '💡 Explanation',
      concept: '🎯 Concept'
    };
    
    this.popup.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong style="color: #666; font-size: 11px; text-transform: uppercase;">
          ${typeLabels[annotation.type] || '📌 Annotation'}
        </strong>
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #333;">
        ${this._escapeHtml(annotation.content)}
      </div>
      ${annotation.reference ? `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          📖 ${this._escapeHtml(annotation.reference)}
        </div>
      ` : ''}
      <button onclick="this.closest('.annotation-popup').style.display='none'" 
              style="margin-top: 12px; padding: 6px 12px; background: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
        Close
      </button>
    `;
    
    this.popup.style.display = 'block';
    this.popup.style.left = `${event.clientX + 10}px`;
    this.popup.style.top = `${event.clientY + 10}px`;
  }

  hidePopup() {
    this.popup.style.display = 'none';
  }

  // Clear all annotations
  clear() {
    this.svg.innerHTML = '';
    this.annotations.clear();
  }

  // Helper to escape HTML
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Cleanup
  destroy() {
    if (this.svg) this.svg.remove();
    if (this.tooltip) this.tooltip.remove();
    if (this.popup) this.popup.remove();
  }
}
