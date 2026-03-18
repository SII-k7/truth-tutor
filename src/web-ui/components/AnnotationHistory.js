/**
 * Annotation History Component
 * View annotation edit history
 */

export class AnnotationHistory {
  constructor(container, annotationId) {
    this.container = container;
    this.annotationId = annotationId;
    this.history = [];
  }

  async init() {
    await this.loadHistory();
    this.render();
  }

  async loadHistory() {
    try {
      const response = await fetch(`/api/annotations/${this.annotationId}/history`);
      const data = await response.json();
      this.history = data.history || [];
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }

  render() {
    if (this.history.length === 0) {
      this.container.innerHTML = '<div class="no-history">No edit history available</div>';
      return;
    }

    this.container.innerHTML = `
      <div class="annotation-history">
        <h4>Edit History</h4>
        <div class="history-timeline">
          ${this.history.map((entry, index) => `
            <div class="history-entry">
              <div class="entry-header">
                <span class="entry-action ${entry.action}">${this.getActionLabel(entry.action)}</span>
                <span class="entry-date">${this.formatDate(entry.edited_at)}</span>
                <span class="entry-user">${entry.edited_by || 'Unknown'}</span>
              </div>
              <div class="entry-content">
                ${entry.content ? `
                  <div class="content-preview">
                    ${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}
                  </div>
                ` : ''}
              </div>
              ${index < this.history.length - 1 ? '<div class="entry-connector"></div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getActionLabel(action) {
    const labels = {
      create: 'Created',
      edit: 'Edited',
      delete: 'Deleted'
    };
    return labels[action] || action;
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Less than 1 week
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    // Format as date
    return date.toLocaleDateString();
  }
}
