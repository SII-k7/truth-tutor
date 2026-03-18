// PDFRenderer.js - PDF.js-based PDF viewer with zoom and navigation
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

// Configure PDF.js worker - use CDN for simplicity (version 5.5.207)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.5.207/pdf.worker.min.mjs';

export class PDFRenderer {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.pdfDoc = null;
    this.currentPage = 1;
    this.zoom = 1.0;
    this.pageRendering = false;
    this.pageNumPending = null;
    this.listeners = {};
    
    this._initCanvas();
  }

  _initCanvas() {
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'pdf-canvas';
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
  }

  // Load PDF document from URL
  async loadDocument(url) {
    try {
      const loadingTask = pdfjsLib.getDocument(url);
      this.pdfDoc = await loadingTask.promise;
      this.currentPage = 1;
      
      this._emit('documentLoaded', {
        numPages: this.pdfDoc.numPages,
        url: url
      });
      
      await this.renderPage(this.currentPage);
      return this.pdfDoc;
    } catch (error) {
      console.error('Error loading PDF:', error);
      throw error;
    }
  }

  // Render specific page
  async renderPage(num) {
    if (this.pageRendering) {
      this.pageNumPending = num;
      return;
    }
    
    this.pageRendering = true;
    
    try {
      const page = await this.pdfDoc.getPage(num);
      
      // Calculate viewport with zoom
      const viewport = page.getViewport({ scale: this.zoom });
      
      // Set canvas dimensions
      this.canvas.height = viewport.height;
      this.canvas.width = viewport.width;
      
      // Render PDF page into canvas context
      const renderContext = {
        canvasContext: this.ctx,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      this.currentPage = num;
      this.pageRendering = false;
      
      // Emit page change event
      this._emit('pageChange', {
        pageNum: num,
        totalPages: this.pdfDoc.numPages,
        viewport: viewport
      });
      
      // If there's a pending page, render it
      if (this.pageNumPending !== null) {
        const pending = this.pageNumPending;
        this.pageNumPending = null;
        await this.renderPage(pending);
      }
    } catch (error) {
      console.error('Error rendering page:', error);
      this.pageRendering = false;
      throw error;
    }
  }

  // Navigate to specific page
  async gotoPage(num) {
    if (!this.pdfDoc) return;
    
    const pageNum = Math.max(1, Math.min(num, this.pdfDoc.numPages));
    await this.renderPage(pageNum);
  }

  // Set zoom level and re-render
  async setZoom(level) {
    if (!this.pdfDoc) return;
    
    this.zoom = Math.max(0.5, Math.min(3.0, level)); // Clamp between 0.5x and 3x
    await this.renderPage(this.currentPage);
  }

  // Get current viewport for coordinate mapping
  getCurrentViewport() {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
      zoom: this.zoom,
      page: this.currentPage
    };
  }

  // Event emitter
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Navigation helpers
  nextPage() {
    if (this.currentPage < this.pdfDoc.numPages) {
      this.gotoPage(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.gotoPage(this.currentPage - 1);
    }
  }

  // Cleanup
  destroy() {
    if (this.canvas) {
      this.canvas.remove();
    }
    this.pdfDoc = null;
    this.listeners = {};
  }
}
