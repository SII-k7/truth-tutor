/**
 * Search Panel Component
 * Advanced search interface
 */

export class SearchPanel {
  constructor(container) {
    this.container = container;
    this.searchHistory = [];
    this.savedSearches = [];
  }

  async init() {
    await this.loadSearchHistory();
    await this.loadSavedSearches();
    this.render();
  }

  async loadSearchHistory() {
    try {
      const response = await fetch('/api/search/history?limit=10');
      const data = await response.json();
      this.searchHistory = data.history || [];
    } catch (err) {
      console.error('Failed to load search history:', err);
    }
  }

  async loadSavedSearches() {
    try {
      const response = await fetch('/api/search/saved');
      const data = await response.json();
      this.savedSearches = data.searches || [];
    } catch (err) {
      console.error('Failed to load saved searches:', err);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="search-panel">
        <div class="search-header">
          <h3>Search</h3>
        </div>
        
        <div class="search-form">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Search papers, annotations, concepts..."
          >
          
          <div class="search-filters">
            <select class="search-type">
              <option value="papers">Papers</option>
              <option value="annotations">Annotations</option>
              <option value="concepts">Concepts</option>
              <option value="semantic">Semantic Search</option>
              <option value="advanced">Advanced</option>
            </select>
            
            <button class="btn-search">Search</button>
          </div>
        </div>
        
        <div class="search-results" style="display: none;">
          <div class="results-header">
            <h4>Results</h4>
            <button class="btn-save-search">Save Search</button>
          </div>
          <div class="results-list"></div>
        </div>
        
        ${this.savedSearches.length > 0 ? `
          <div class="saved-searches">
            <h4>Saved Searches</h4>
            <div class="saved-list">
              ${this.savedSearches.map(search => `
                <div class="saved-search-item" data-search-id="${search.id}">
                  <span class="search-name">${search.name}</span>
                  <button class="btn-run-search" data-query="${search.query}" data-filters='${search.filters || '{}'}'>Run</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${this.searchHistory.length > 0 ? `
          <div class="search-history">
            <h4>Recent Searches</h4>
            <div class="history-list">
              ${this.searchHistory.map(item => `
                <div class="history-item">
                  <span class="history-query">${item.query}</span>
                  <span class="history-count">${item.result_count} results</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Add event listeners
    const searchInput = this.container.querySelector('.search-input');
    const searchBtn = this.container.querySelector('.btn-search');
    const searchType = this.container.querySelector('.search-type');

    const performSearch = async () => {
      const query = searchInput.value.trim();
      if (!query) return;

      const type = searchType.value;
      await this.search(query, type);
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // Saved search buttons
    this.container.querySelectorAll('.btn-run-search').forEach(btn => {
      btn.addEventListener('click', async () => {
        const query = btn.dataset.query;
        const filters = JSON.parse(btn.dataset.filters);
        searchInput.value = query;
        await this.search(query, 'papers', filters);
      });
    });

    // Save search button
    this.container.querySelector('.btn-save-search')?.addEventListener('click', async () => {
      const query = searchInput.value.trim();
      if (!query) return;

      const name = prompt('Enter a name for this search:');
      if (!name) return;

      await this.saveSearch(name, query);
    });
  }

  async search(query, type = 'papers', filters = {}) {
    const resultsDiv = this.container.querySelector('.search-results');
    const resultsList = this.container.querySelector('.results-list');

    resultsDiv.style.display = 'block';
    resultsList.innerHTML = '<div class="loading">Searching...</div>';

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type, filters })
      });

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        resultsList.innerHTML = data.results.map(result => `
          <div class="result-item">
            <h5>${result.title || result.content?.substring(0, 100)}</h5>
            ${result.abstract ? `<p>${result.abstract.substring(0, 200)}...</p>` : ''}
            ${result.paperId ? `<a href="/paper/${result.paperId}">View Paper</a>` : ''}
          </div>
        `).join('');
      } else {
        resultsList.innerHTML = '<div class="no-results">No results found</div>';
      }

      // Reload history
      await this.loadSearchHistory();
    } catch (err) {
      resultsList.innerHTML = `<div class="error">Search failed: ${err.message}</div>`;
    }
  }

  async saveSearch(name, query, filters = {}) {
    try {
      const response = await fetch('/api/search/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, query, filters })
      });

      if (response.ok) {
        await this.loadSavedSearches();
        this.render();
      }
    } catch (err) {
      console.error('Failed to save search:', err);
    }
  }
}
