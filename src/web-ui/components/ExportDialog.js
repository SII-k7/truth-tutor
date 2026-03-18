/**
 * Export Dialog Component
 * Export paper in various formats
 */

export class ExportDialog {
  constructor(container, paperId) {
    this.container = container;
    this.paperId = paperId;
  }

  show() {
    this.render();
  }

  hide() {
    this.container.innerHTML = '';
  }

  render() {
    this.container.innerHTML = `
      <div class="export-dialog-overlay">
        <div class="export-dialog">
          <div class="dialog-header">
            <h3>Export Paper</h3>
            <button class="btn-close">×</button>
          </div>
          
          <div class="dialog-body">
            <div class="export-formats">
              <button class="export-btn" data-format="json">
                <span class="format-icon">📄</span>
                <span class="format-name">JSON</span>
                <span class="format-desc">Structured data format</span>
              </button>
              
              <button class="export-btn" data-format="markdown">
                <span class="format-icon">📝</span>
                <span class="format-name">Markdown</span>
                <span class="format-desc">Plain text with formatting</span>
              </button>
              
              <button class="export-btn" data-format="notion">
                <span class="format-icon">📋</span>
                <span class="format-name">Notion</span>
                <span class="format-desc">Import into Notion</span>
              </button>
              
              <button class="export-btn" data-format="obsidian">
                <span class="format-icon">🗂️</span>
                <span class="format-name">Obsidian</span>
                <span class="format-desc">Import into Obsidian</span>
              </button>
              
              <button class="export-btn" data-format="html">
                <span class="format-icon">🖨️</span>
                <span class="format-name">HTML</span>
                <span class="format-desc">Print-friendly format</span>
              </button>
            </div>
            
            <div class="export-status" style="display: none;">
              <div class="status-message"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    this.container.querySelector('.btn-close').addEventListener('click', () => {
      this.hide();
    });

    this.container.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const format = btn.dataset.format;
        await this.exportPaper(format);
      });
    });

    // Close on overlay click
    this.container.querySelector('.export-dialog-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('export-dialog-overlay')) {
        this.hide();
      }
    });
  }

  async exportPaper(format) {
    const statusDiv = this.container.querySelector('.export-status');
    const statusMsg = this.container.querySelector('.status-message');
    
    statusDiv.style.display = 'block';
    statusMsg.textContent = `Exporting as ${format.toUpperCase()}...`;

    try {
      const response = await fetch(`/api/papers/${this.paperId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.json();
      
      // Download the exported content
      const blob = new Blob([data.content], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paper-${this.paperId}.${format === 'html' ? 'html' : format === 'json' ? 'json' : 'md'}`;
      a.click();
      URL.revokeObjectURL(url);

      statusMsg.textContent = `✓ Exported successfully!`;
      setTimeout(() => {
        this.hide();
      }, 1500);
    } catch (err) {
      statusMsg.textContent = `✗ Export failed: ${err.message}`;
    }
  }
}
