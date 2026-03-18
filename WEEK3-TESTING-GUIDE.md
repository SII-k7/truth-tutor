# Week 3 Quick Start Guide

## Testing the New Navigation & UX Features

### Prerequisites

```bash
cd ~/.openclaw/workspace/truth-tutor-repo
npm install
npm start
```

Open http://localhost:3474 in your browser.

## Feature Testing Guide

### 1. Onboarding Tour

**Test:** First-time user experience

1. Clear localStorage: `localStorage.clear()` in browser console
2. Refresh the page
3. Onboarding tour should start automatically
4. Navigate through all 6 steps
5. Click "Finish" or "Skip Tour"
6. Refresh page - tour should not appear again

**Reset tour:** Run in console: `localStorage.removeItem('onboarding_completed')`

### 2. Document Outline Sidebar

**Test:** Navigation via sidebar

1. Load a PDF (search arXiv or paste URL)
2. Sidebar should appear on the left with document outline
3. Click any section → PDF should jump to that page
4. Current section should be highlighted
5. Press `Ctrl+B` → Sidebar should collapse
6. Press `Ctrl+B` again → Sidebar should expand
7. Use arrow keys to navigate outline (when focused)

### 3. Progress Tracker

**Test:** Reading progress tracking

1. Load a PDF
2. Progress bar should appear above PDF viewer
3. Navigate through pages
4. Progress bar should update (% complete, pages visited)
5. Wait 30 seconds → Progress should auto-save
6. Check console for "Progress saved" message
7. Refresh page → Progress should restore
8. "Resume reading?" toast should appear if you were past page 1

### 4. Section Navigator

**Test:** Section navigation controls

1. Load a PDF
2. Section navigator should appear above PDF viewer
3. Breadcrumb trail shows current location
4. Click "Next" button → Should go to next section
5. Click "Previous" button → Should go to previous section
6. Press `Ctrl+N` → Next section
7. Press `Ctrl+P` → Previous section
8. Click mini-map icon → Mini-map should toggle
9. Click any section in mini-map → Should navigate there

### 5. Annotation Filter

**Test:** Filtering and searching annotations

1. Load a PDF with annotations (or analyze a paper)
2. Annotation filter should appear in right panel
3. Uncheck "Translation" → Translation annotations should hide
4. Check it again → They should reappear
5. Click "Toggle all" button → All annotations should hide/show
6. Type in search box → Annotations should filter by text
7. Click any annotation in list → Should jump to that page
8. Heatmap should show annotation density by page

### 6. Keyboard Shortcuts

**Test:** All keyboard shortcuts

1. Press `Ctrl+/` → Shortcuts help modal should appear
2. Press `Esc` → Modal should close
3. Test each shortcut:
   - `Ctrl+B` → Toggle sidebar
   - `Ctrl+N` → Next section
   - `Ctrl+P` → Previous section
   - `Ctrl+H` → Toggle annotations
   - `Ctrl+D` → Toggle dark mode
   - `Page Up/Down` → Navigate pages
   - `Ctrl+=` → Zoom in
   - `Ctrl+-` → Zoom out
   - `Ctrl+0` → Reset zoom

### 7. Resume Reading

**Test:** Reading state persistence

1. Load a PDF
2. Navigate to page 5 or later
3. Wait 30 seconds for auto-save
4. Refresh the page
5. "Resume reading?" toast should appear
6. Click "Resume" → Should jump to page 5
7. Or click "Start over" → Should stay on page 1

### 8. Three-Column Layout

**Test:** Responsive layout

1. Desktop view (>1400px): All three columns visible
2. Resize window to 1200px: Sidebar should hide
3. Resize to 800px: Layout should stack vertically
4. All components should remain functional at all sizes

### 9. Dark Mode

**Test:** Dark mode with all components

1. Click dark mode toggle (🌙 button)
2. All components should switch to dark theme
3. Sidebar, progress bar, filters should all be dark
4. Text should remain readable
5. Press `Ctrl+D` → Should toggle dark mode

### 10. Accessibility

**Test:** Keyboard navigation and screen readers

1. Press `Tab` → Should navigate through interactive elements
2. Focus indicators should be visible
3. Press `Enter` or `Space` on focused elements → Should activate
4. Use arrow keys in sidebar → Should navigate outline
5. All buttons should have tooltips
6. Test with screen reader (if available)

## Common Issues & Solutions

### Issue: Sidebar not showing
**Solution:** Make sure PDF is loaded. Sidebar only appears when document is loaded.

### Issue: Progress not saving
**Solution:** Check browser console for errors. Ensure API endpoint is accessible.

### Issue: Keyboard shortcuts not working
**Solution:** Make sure focus is not in an input field. Press `Esc` to clear focus.

### Issue: Onboarding tour not starting
**Solution:** Clear localStorage and refresh: `localStorage.clear()`

### Issue: Resume prompt not appearing
**Solution:** Make sure you navigated past page 1 and waited 30s for auto-save.

## Browser Console Commands

Useful commands for testing:

```javascript
// Reset onboarding tour
localStorage.removeItem('onboarding_completed');

// Clear all localStorage
localStorage.clear();

// Check saved progress
localStorage.getItem('progress_<paperId>');

// Manually trigger tour
state.onboardingTour.start();

// Show keyboard shortcuts
state.keyboardShortcuts.showHelp();

// Get current progress
state.progressTracker.getProgress();

// Toggle sidebar
state.sidebar.toggleCollapse();

// Navigate to section
state.sectionNavigator.navigateNext();
```

## Performance Testing

### Check render times:

```javascript
// Sidebar render time
console.time('sidebar');
state.sidebar.renderOutline(mockOutline);
console.timeEnd('sidebar');

// Progress update time
console.time('progress');
state.progressTracker.updateProgress(5);
console.timeEnd('progress');

// Filter update time
console.time('filter');
state.annotationFilter.setAnnotations(annotations);
console.timeEnd('filter');
```

### Check memory usage:

1. Open Chrome DevTools → Memory tab
2. Take heap snapshot
3. Use app for 5 minutes
4. Take another snapshot
5. Compare → Should not grow significantly

## API Testing

### Test progress endpoints:

```bash
# Get progress
curl http://localhost:3474/api/papers/test-paper/progress

# Save progress
curl -X PUT http://localhost:3474/api/papers/test-paper/progress \
  -H "Content-Type: application/json" \
  -d '{"currentPage": 5, "visitedPages": [1,2,3,4,5]}'

# Get outline
curl http://localhost:3474/api/papers/test-paper/outline
```

## Success Criteria

All features working if:

- ✅ Onboarding tour runs on first visit
- ✅ Sidebar shows outline and navigates
- ✅ Progress bar updates and auto-saves
- ✅ Section navigator works with keyboard
- ✅ Annotation filter filters and searches
- ✅ All keyboard shortcuts respond
- ✅ Resume reading prompt appears
- ✅ Layout responsive at all sizes
- ✅ Dark mode works everywhere
- ✅ No console errors
- ✅ Smooth animations
- ✅ Accessible with keyboard

## Next Steps

After testing Week 3 features:

1. Test integration with Week 1 (PDF rendering)
2. Test integration with Week 2 (AI annotations)
3. Test full workflow: Load → Analyze → Navigate → Annotate
4. Report any bugs or issues
5. Suggest improvements

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify all files are present
3. Clear cache and reload
4. Check API endpoints are responding
5. Review WEEK3-COMPLETE.md for details

---

**Happy Testing!** 🎉
