/**
 * Concept Graph Component
 * Visualize concept relationships using D3.js or similar
 */

export class ConceptGraph {
  constructor(container, paperId) {
    this.container = container;
    this.paperId = paperId;
    this.concepts = [];
    this.relationships = [];
  }

  async init() {
    // Fetch concepts for paper
    const response = await fetch(`/api/papers/${this.paperId}/concepts`);
    const data = await response.json();
    this.concepts = data.concepts;
    
    // Fetch relationships for each concept
    for (const concept of this.concepts) {
      const relResponse = await fetch(`/api/concepts/${concept.id}/related`);
      const relData = await relResponse.json();
      this.relationships.push(...relData.related);
    }
    
    this.render();
  }

  render() {
    // Simple text-based visualization (in production, use D3.js or vis.js)
    const conceptMap = new Map(this.concepts.map(c => [c.id, c]));
    
    this.container.innerHTML = `
      <div class="concept-graph">
        <h3>Concept Graph</h3>
        <div class="graph-container">
          <div class="concepts-list">
            ${this.concepts.map(concept => `
              <div class="concept-node" data-concept-id="${concept.id}">
                <div class="concept-name">${concept.name}</div>
                <div class="concept-type">${concept.type || 'concept'}</div>
                ${this.getRelationships(concept.id).length > 0 ? `
                  <div class="concept-relationships">
                    ${this.getRelationships(concept.id).map(rel => `
                      <div class="relationship">
                        <span class="rel-type">${rel.type}</span>
                        <span class="rel-target">${conceptMap.get(rel.toConceptId)?.name || rel.toConceptId}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="graph-legend">
          <div class="legend-item">
            <span class="legend-color" style="background: #4CAF50"></span>
            <span>Prerequisite</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #2196F3"></span>
            <span>Related To</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #FF9800"></span>
            <span>Part Of</span>
          </div>
        </div>
      </div>
    `;
  }

  getRelationships(conceptId) {
    return this.relationships.filter(rel => rel.fromConceptId === conceptId);
  }
}
