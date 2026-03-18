/**
 * Annotation Type Selector Component
 * Select which annotation types to display
 */

export class AnnotationTypeSelector {
  constructor(container, onSelectionChange) {
    this.container = container;
    this.onSelectionChange = onSelectionChange;
    this.selectedTypes = new Set();
    this.types = [];
  }

  async init() {
    // Fetch annotation types from API
    const response = await fetch('/api/annotation-types');
    const data = await response.json();
    this.types = data.types;
    
    // Select all by default
    this.types.forEach(type => this.selectedTypes.add(type.id));
    
    this.render();
  }

  render() {
    const typeIcons = {
      translation: '🌐',
      explanation: '💡',
      concept: '🏷️',
      math: '∑',
      experiment: '🔬',
      prerequisite: '📚',
      citation: '📄',
      definition: '📖',
      figure: '🖼️',
      summary: '📝'
    };

    this.container.innerHTML = `
      <div class="annotation-type-selector">
        <h3>Annotation Types</h3>
        <div class="type-filters">
          ${this.types.map(type => `
            <label class="type-filter" style="border-left: 3px solid ${type.color}">
              <input 
                type="checkbox" 
                value="${type.id}" 
                ${this.selectedTypes.has(type.id) ? 'checked' : ''}
              >
              <span class="type-icon">${typeIcons[type.id] || '📌'}</span>
              <span class="type-name">${type.name}</span>
            </label>
          `).join('')}
        </div>
        <div class="type-actions">
          <button class="btn-select-all">Select All</button>
          <button class="btn-select-none">Select None</button>
        </div>
      </div>
    `;

    // Add event listeners
    this.container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedTypes.add(e.target.value);
        } else {
          this.selectedTypes.delete(e.target.value);
        }
        this.onSelectionChange(Array.from(this.selectedTypes));
      });
    });

    this.container.querySelector('.btn-select-all').addEventListener('click', () => {
      this.types.forEach(type => this.selectedTypes.add(type.id));
      this.render();
      this.onSelectionChange(Array.from(this.selectedTypes));
    });

    this.container.querySelector('.btn-select-none').addEventListener('click', () => {
      this.selectedTypes.clear();
      this.render();
      this.onSelectionChange(Array.from(this.selectedTypes));
    });
  }

  getSelectedTypes() {
    return Array.from(this.selectedTypes);
  }
}
