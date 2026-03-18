/**
 * Figure Viewer Component
 * Enhanced figure viewing with zoom and analysis
 */

export class FigureViewer {
  constructor(container, paperId) {
    this.container = container;
    this.paperId = paperId;
    this.figures = [];
    this.currentIndex = 0;
    this.zoomLevel = 1;
  }

  async init() {
    // Fetch figures for paper
    const response = await fetch(`/api/papers/${this.paperId}/figures`);
    const data = await response.json();
    this.figures = data.figures;
    
    this.render();
  }

  render() {
    if (this.figures.length === 0) {
      this.container.innerHTML = '<div class="no-figures">No figures found</div>';
      return;
    }

    const figure = this.figures[this.currentIndex];
    const analysis = figure.analysis ? JSON.parse(figure.analysis) : null;

    this.container.innerHTML = `
      <div class="figure-viewer">
        <div class="figure-header">
          <h3>Figure ${this.currentIndex + 1} of ${this.figures.length}</h3>
          <div class="figure-nav">
            <button class="btn-prev" ${this.currentIndex === 0 ? 'disabled' : ''}>← Previous</button>
            <button class="btn-next" ${this.currentIndex === this.figures.length - 1 ? 'disabled' : ''}>Next →</button>
          </div>
        </div>
        
        <div class="figure-content">
          <div class="figure-image-container">
            <img 
              src="/api/figures/${figure.id}/image" 
              alt="Figure ${this.currentIndex + 1}"
              style="transform: scale(${this.zoomLevel})"
            >
            <div class="zoom-controls">
              <button class="btn-zoom-in">+</button>
              <button class="btn-zoom-reset">Reset</button>
              <button class="btn-zoom-out">-</button>
            </div>
          </div>
          
          ${analysis ? `
            <div class="figure-analysis">
              <h4>Analysis</h4>
              <div class="analysis-type">
                <strong>Type:</strong> ${analysis.type || 'Unknown'}
              </div>
              ${analysis.caption ? `
                <div class="analysis-caption">
                  <strong>Caption:</strong> ${analysis.caption}
                </div>
              ` : ''}
              ${analysis.insights ? `
                <div class="analysis-insights">
                  <strong>Insights:</strong> ${analysis.insights}
                </div>
              ` : ''}
              ${analysis.elements && analysis.elements.length > 0 ? `
                <div class="analysis-elements">
                  <strong>Elements:</strong>
                  <ul>
                    ${analysis.elements.map(el => `<li>${el}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <div class="figure-metadata">
          <span>Page ${figure.page}</span>
          <span>${figure.width}×${figure.height}px</span>
        </div>
      </div>
    `;

    // Add event listeners
    this.container.querySelector('.btn-prev')?.addEventListener('click', () => {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.zoomLevel = 1;
        this.render();
      }
    });

    this.container.querySelector('.btn-next')?.addEventListener('click', () => {
      if (this.currentIndex < this.figures.length - 1) {
        this.currentIndex++;
        this.zoomLevel = 1;
        this.render();
      }
    });

    this.container.querySelector('.btn-zoom-in')?.addEventListener('click', () => {
      this.zoomLevel = Math.min(3, this.zoomLevel + 0.25);
      this.render();
    });

    this.container.querySelector('.btn-zoom-out')?.addEventListener('click', () => {
      this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.25);
      this.render();
    });

    this.container.querySelector('.btn-zoom-reset')?.addEventListener('click', () => {
      this.zoomLevel = 1;
      this.render();
    });
  }
}
