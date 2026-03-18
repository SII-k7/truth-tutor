# Critical Bugfix Report: Paper Search and Mode/Strictness Controls

## Issues Reported
1. Paper search functionality not working
2. Mode (功能) and strictness (风格) controls not responding to clicks

## Root Causes Identified

### Issue 1: Duplicate Function Declaration
**File:** `src/web-ui/app.js`
**Problem:** The function `loadTestAnnotations` was declared twice (lines 416 and 710), causing a JavaScript syntax error that prevented the entire module from loading.

**Fix:** Removed the first declaration (line 416) and kept the second one (line 710) which had better error handling.

### Issue 2: Missing Import Map for ES Modules
**File:** `src/web-ui/index.html`
**Problem:** The browser couldn't resolve bare module specifiers like `pdfjs-dist/build/pdf.mjs`. Browsers require relative paths (starting with `/`, `./`, or `../`) or an import map to resolve node_modules dependencies.

**Fix:** Added an import map to the HTML head section:
```html
<script type="importmap">
{
  "imports": {
    "pdfjs-dist/build/pdf.mjs": "/pdfjs-dist/build/pdf.mjs"
  }
}
</script>
```

### Issue 3: Missing Database Exports
**File:** `src/database/db.mjs`
**Problem:** Several service files were trying to import functions that weren't exported:
- `getDb()` - needed by user-service.mjs
- `allAsync()`, `getAsync()`, `runAsync()` - needed by search-service.mjs

**Fix:** Added export keywords to these helper functions.

### Issue 4: CommonJS Module Import
**File:** `src/services/pdf-parser.mjs`
**Problem:** Trying to import `pdf-parse` (a CommonJS module) using ESM default import syntax, which doesn't work in Node.js ESM.

**Fix:** Changed the import to use `createRequire`:
```javascript
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
```

## Verification

Both issues are now fixed and verified:

✅ **Paper Search:** Typing in the search box triggers the arXiv API, and results are displayed in a dropdown.

✅ **Mode/Strictness Controls:** Clicking on mode buttons (Paper/alphaXiv/General) and strictness buttons (soft/direct/strict/brutal) now correctly updates the active state and changes the hidden select values.

## Files Modified

1. `src/web-ui/app.js` - Removed duplicate function declaration
2. `src/web-ui/index.html` - Added import map for pdfjs-dist
3. `src/database/db.mjs` - Exported missing helper functions
4. `src/services/pdf-parser.mjs` - Fixed CommonJS import
5. `src/web-server.mjs` - Added database initialization and commented out incomplete features

## Testing Notes

The fixes were tested using a minimal test server and the agent-browser tool to verify:
- JavaScript module loads without errors
- Event handlers are properly bound
- API endpoints respond correctly
- UI interactions work as expected
