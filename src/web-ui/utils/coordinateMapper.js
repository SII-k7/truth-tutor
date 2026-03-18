// coordinateMapper.js - Convert PDF coordinates to screen coordinates

export class CoordinateMapper {
  constructor() {
    this.pdfViewport = null;
    this.canvasRect = null;
    this.scrollOffset = { x: 0, y: 0 };
  }

  // Update viewport information from PDFRenderer
  updateViewport(viewport, canvasElement) {
    this.pdfViewport = viewport;
    this.canvasRect = canvasElement.getBoundingClientRect();
  }

  // Update scroll offset
  updateScroll(scrollX, scrollY) {
    this.scrollOffset = { x: scrollX, y: scrollY };
  }

  // Convert PDF coordinates (0-1 normalized) to screen coordinates
  pdfToScreen(pdfX, pdfY) {
    if (!this.pdfViewport || !this.canvasRect) {
      console.warn('Viewport not initialized');
      return { x: 0, y: 0 };
    }

    // PDF coordinates are typically normalized (0-1) or in PDF units
    // Convert to canvas pixel coordinates
    const canvasX = pdfX * this.pdfViewport.width;
    const canvasY = pdfY * this.pdfViewport.height;

    // Account for canvas position and scroll
    const screenX = canvasX + this.canvasRect.left - this.scrollOffset.x;
    const screenY = canvasY + this.canvasRect.top - this.scrollOffset.y;

    return { x: screenX, y: screenY };
  }

  // Convert screen coordinates to PDF coordinates (normalized 0-1)
  screenToPdf(screenX, screenY) {
    if (!this.pdfViewport || !this.canvasRect) {
      console.warn('Viewport not initialized');
      return { x: 0, y: 0 };
    }

    // Convert screen to canvas coordinates
    const canvasX = screenX - this.canvasRect.left + this.scrollOffset.x;
    const canvasY = screenY - this.canvasRect.top + this.scrollOffset.y;

    // Normalize to 0-1 range
    const pdfX = canvasX / this.pdfViewport.width;
    const pdfY = canvasY / this.pdfViewport.height;

    return { x: pdfX, y: pdfY };
  }

  // Convert PDF coordinates to canvas-relative coordinates (for SVG overlay)
  pdfToCanvas(pdfX, pdfY) {
    if (!this.pdfViewport) {
      console.warn('Viewport not initialized');
      return { x: 0, y: 0 };
    }

    // Convert normalized PDF coords to canvas pixel coords
    const canvasX = pdfX * this.pdfViewport.width;
    const canvasY = pdfY * this.pdfViewport.height;

    return { x: canvasX, y: canvasY };
  }

  // Check if coordinates are within visible canvas area
  isVisible(canvasX, canvasY) {
    if (!this.canvasRect) return false;

    return (
      canvasX >= 0 &&
      canvasX <= this.pdfViewport.width &&
      canvasY >= 0 &&
      canvasY <= this.pdfViewport.height
    );
  }

  // Get current zoom level
  getZoom() {
    return this.pdfViewport?.zoom || 1.0;
  }

  // Get canvas dimensions
  getCanvasDimensions() {
    return {
      width: this.pdfViewport?.width || 0,
      height: this.pdfViewport?.height || 0
    };
  }
}
