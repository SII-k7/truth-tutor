# Week 1 Testing Guide

## Quick Start

### 1. Start the Server
```bash
cd ~/.openclaw/workspace/truth-tutor-repo
./bin/truth-tutor.mjs web
```

Server will start at: http://127.0.0.1:50271 (or auto-assigned port)

### 2. Test Pages

#### Option A: Standalone Test Page (Recommended for initial testing)
**URL**: http://127.0.0.1:50271/test-pdfjs.html

**Steps**:
1. Open URL in browser
2. Click "Load Test PDF" button
3. Wait for PDF to load (should see "Attention Is All You Need" paper)
4. Verify 3 colored circles appear on the page:
   - Blue circle (translation) at ~20% from left, 30% from top
   - Green circle (explanation) at center
   - Orange circle (concept) at ~80% from left, 70% from top

**Test Interactions**:
- Hover over circles → tooltip should appear with preview text
- Click circles → popup should appear with full content
- Click "Previous"/"Next" → navigate pages
- Click "Zoom In"/"Zoom Out" → PDF should scale, annotations should stay aligned

#### Option B: Main Application
**URL**: http://127.0.0.1:50271/

**Steps**:
1. Open URL in browser
2. In the search box, type: "Attention Is All You Need"
3. Select the paper from results
4. Or paste directly in chat: `1706.03762`
5. PDF should load in left panel
6. Annotations should appear (using test data)

### 3. What to Look For

#### ✅ Success Indicators
- PDF renders clearly in canvas
- Page navigation works smoothly
- Zoom maintains annotation alignment
- Annotations appear as colored circles with pulse animation
- Tooltips show on hover
- Popups show on click with proper formatting
- Controls are responsive

#### ❌ Potential Issues
- PDF doesn't load → Check console for CORS errors
- Annotations don't appear → Check coordinate mapping
- Annotations misaligned → Adjust coordinate calculation
- Worker errors → Check PDF.js worker URL
- Blank canvas → Check PDF.js import path

### 4. Browser Console Checks

Open DevTools (F12) and check Console for:
- "PDF loaded successfully" message
- "Test page initialized" message (test page only)
- No red errors
- Page change events logging

### 5. Testing Checklist

- [ ] PDF loads without errors
- [ ] Canvas displays PDF content
- [ ] Annotations render as colored circles
- [ ] Pulse animation visible on annotations
- [ ] Hover shows tooltip
- [ ] Click shows popup
- [ ] Popup close button works
- [ ] Previous/Next page navigation works
- [ ] Page counter updates correctly
- [ ] Zoom in/out works
- [ ] Zoom level display updates
- [ ] Annotations stay aligned during zoom
- [ ] Dark mode toggle works (Ctrl+D)
- [ ] Responsive on different screen sizes

### 6. Common Fixes

#### Annotations Don't Appear
```javascript
// Check in browser console:
console.log(state.testAnnotations); // Should show array of 5 annotations
console.log(state.pdfRenderer.currentPage); // Should be 1
console.log(state.coordinateMapper.pdfViewport); // Should have width/height
```

#### Annotations Misaligned
- Adjust coordinates in `test-annotations.json`
- Check `coordinateMapper.pdfToCanvas()` logic
- Verify SVG dimensions match canvas dimensions

#### PDF Doesn't Load
- Check network tab for 404 errors
- Verify `/test-paper.pdf` is accessible
- Try different PDF URL (e.g., direct arXiv link)

### 7. Next Steps After Testing

1. **If everything works**: 
   - Mark Week 1 as 100% complete
   - Begin Week 2 planning
   - Start AI annotation generation

2. **If issues found**:
   - Document issues in project file
   - Fix critical bugs
   - Re-test
   - Update implementation docs

### 8. Performance Notes

- First PDF load may be slow (downloading + parsing)
- Subsequent page changes should be fast
- Large PDFs (>100 pages) may need optimization
- Zoom operations should be smooth

### 9. Browser Compatibility

Tested/Expected to work on:
- Chrome/Edge (Chromium) ✅
- Firefox ✅
- Safari ✅ (may need worker URL adjustment)

### 10. Debugging Tips

**Enable verbose logging**:
```javascript
// Add to app.js init():
console.log('PDF.js version:', pdfjsLib.version);
state.pdfRenderer.on('pageChange', (data) => {
  console.log('Page changed:', data);
});
```

**Check annotation rendering**:
```javascript
// In browser console:
document.querySelectorAll('.annotation-marker').length // Should be 3 on page 1
```

**Verify coordinate mapping**:
```javascript
// In browser console:
state.coordinateMapper.pdfToCanvas(0.5, 0.5) // Should return center of canvas
```

---

## Quick Test Command

```bash
# Start server and open test page
cd ~/.openclaw/workspace/truth-tutor-repo
./bin/truth-tutor.mjs web
# Then open: http://127.0.0.1:50271/test-pdfjs.html
```

## Report Issues

If you find issues, update:
- `~/.openclaw/workspace/truth-tutor-vibero-project.md` (阻塞问题 section)
- Create detailed bug report with:
  - Browser version
  - Console errors
  - Expected vs actual behavior
  - Screenshots if possible
