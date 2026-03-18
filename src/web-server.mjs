import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { buildPrompt } from './build-prompt.mjs';
import { validateInput } from './input.mjs';
import { askModel } from './model-client.mjs';
import { normalizeMode } from './modes.mjs';
import { searchArxiv, enrichInputWithPaperContext } from './paper-context.mjs';
import { resolveApiConfig } from './provider-config.mjs';
import { loadLearningProfile, saveLearningProfile, summarizeLearningProfile, getDashboardData } from './learning-profile.mjs';
import { loadDrillState, saveDrillState } from './drill-tracker.mjs';
import { generateLearningPath, calculatePathProgress } from './learning-path-recommender.mjs';
import { loadAdaptiveDrillState, analyzeDrillEffectiveness } from './adaptive-drills.mjs';
import { initWebSocketServer } from './services/websocket-handler.mjs';
import { analyzePaper, getAnalysisResults } from './services/analysis-pipeline.mjs';
import { 
  listPapers, 
  getPaper, 
  deletePaper,
  getPaperStructure,
  getAnnotations,
  createAnnotation,
  deleteAnnotation,
  updateAnnotation
} from './database/db.mjs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Phase 2+ imports: Authentication, Security, and Advanced Features
import { generateToken, verifyToken, extractToken, isValidEmail, isValidPassword } from './services/auth-service.mjs';
import { rateLimitMiddleware } from './services/rate-limiter.mjs';
import { 
  applyCorsHeaders, 
  applySecurityHeaders, 
  sanitizeRequestBody, 
  validateParams,
  validatePagination,
  authError,
  notFoundError,
  validationError,
  serverError
} from './services/security-middleware.mjs';
import { 
  registerUser, 
  loginUser, 
  getUserById, 
  updateUserProfile,
  changePassword,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  verifyApiKeyAndGetUser,
  getUserStats
} from './services/user-service.mjs';
import { detectRelevantTypes } from './services/annotation-types.mjs';
import { getRelatedConcepts } from './services/ontology-annotator.mjs';
// Note: extractConcepts and linkConcepts are not exported from ontology-annotator.mjs
// import { analyzeFigures, getFigureById, getFiguresByPaper } from './services/figure-analyzer.mjs';
import { 
  editAnnotation, 
  removeAnnotation, 
  rateAnnotation, 
  reportAnnotation,
  getAnnotationHistory,
  bulkDeleteAnnotations,
  bulkHideAnnotations
} from './services/annotation-manager.mjs';
import { 
  exportAsJSON, 
  exportAsMarkdown, 
  exportForNotion, 
  exportForObsidian, 
  exportAsPrintHTML,
  generateShareableLink
} from './services/export-service.mjs';
import { 
  searchPapers, 
  searchAnnotations, 
  searchByConcept, 
  semanticSearch,
  advancedSearch,
  getSearchHistory,
  saveSearch,
  getSavedSearches,
  clearSearchHistory
} from './services/search-service.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PUBLIC_DIR = new URL('./web-ui/', import.meta.url);
const EXAMPLES_DIR = new URL('../examples/', import.meta.url);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export async function startWebServer({ host = '127.0.0.1', port = 3474, openBrowser = true } = {}) {
  // Initialize database before starting server
  const { initDatabase } = await import('./database/db.mjs');
  await initDatabase();
  
  const server = createServer(async (req, res) => {
    try {
      // Apply CORS headers
      if (applyCorsHeaders(req, res)) {
        return; // Preflight request handled
      }
      
      // Apply security headers
      applySecurityHeaders(res);
      
      const url = new URL(req.url || '/', `http://${host}:${resolvedPort}`);
      
      // Authentication helper
      const authenticate = () => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return null;
        }
        
        const token = extractToken(authHeader);
        if (!token) {
          return null;
        }
        
        // Try JWT token first
        const payload = verifyToken(token);
        if (payload) {
          return { userId: payload.userId, email: payload.email };
        }
        
        // Try API key
        const user = verifyApiKeyAndGetUser(token);
        return user;
      };
      
      // Rate limiting helper
      const checkRateLimit = (limitType = 'api') => {
        const user = authenticate();
        const identifier = user ? user.userId : req.socket.remoteAddress;
        const middleware = rateLimitMiddleware(limitType);
        const result = middleware(req, identifier);
        
        if (!result.allowed) {
          // Set rate limit headers
          for (const [key, value] of Object.entries(result.headers)) {
            res.setHeader(key, value);
          }
          sendJson(res, result.status, result.body);
          return false;
        }
        
        // Set rate limit headers
        for (const [key, value] of Object.entries(result.headers)) {
          res.setHeader(key, value);
        }
        
        return true;
      };

      // ============================================================
      // PUBLIC ENDPOINTS (no authentication required)
      // ============================================================

      if (req.method === 'GET' && url.pathname === '/api/info') {
        return sendJson(res, 200, await getInfo());
      }

      if (req.method === 'GET' && url.pathname === '/api/examples') {
        return sendJson(res, 200, { items: await listExamples() });
      }

      if (req.method === 'GET' && url.pathname === '/api/arxiv-search') {
        const query = url.searchParams.get('q') || '';
        return sendJson(res, 200, { items: await searchArxiv(query, 6) });
      }
      
      // ============================================================
      // AUTHENTICATION ENDPOINTS
      // ============================================================
      
      if (req.method === 'POST' && url.pathname === '/api/auth/register') {
        if (!checkRateLimit('auth')) return;
        
        const body = await readJsonBody(req);
        const validation = validateParams(body, {
          email: { required: true, type: 'string', validator: (v) => !isValidEmail(v) ? 'Invalid email format' : null },
          password: { required: true, type: 'string', validator: (v) => !isValidPassword(v) ? 'Password must be at least 8 characters with uppercase, lowercase, and number' : null },
          name: { required: false, type: 'string', maxLength: 100 }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        try {
          const user = await registerUser(body.email, body.password, body.name);
          const token = generateToken(user.id, user.email);
          
          return sendJson(res, 201, {
            user: { id: user.id, email: user.email, name: user.name },
            token
          });
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
      }
      
      if (req.method === 'POST' && url.pathname === '/api/auth/login') {
        if (!checkRateLimit('auth')) return;
        
        const body = await readJsonBody(req);
        const validation = validateParams(body, {
          email: { required: true, type: 'string' },
          password: { required: true, type: 'string' }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        try {
          const user = await loginUser(body.email, body.password);
          const token = generateToken(user.id, user.email);
          
          return sendJson(res, 200, {
            user: { id: user.id, email: user.email, name: user.name },
            token
          });
        } catch (err) {
          return sendJson(res, 401, authError('Invalid credentials'));
        }
      }
      
      if (req.method === 'GET' && url.pathname === '/api/auth/me') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const profile = getUserById(user.userId);
        if (!profile) {
          return sendJson(res, 404, notFoundError('User'));
        }
        
        return sendJson(res, 200, { user: profile });
      }
      
      // ============================================================
      // USER MANAGEMENT ENDPOINTS (authenticated)
      // ============================================================
      
      if (req.method === 'PUT' && url.pathname === '/api/user/profile') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const body = await readJsonBody(req);
        const updated = updateUserProfile(user.userId, body);
        
        return sendJson(res, 200, { user: updated });
      }
      
      if (req.method === 'POST' && url.pathname === '/api/user/change-password') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const body = await readJsonBody(req);
        const validation = validateParams(body, {
          oldPassword: { required: true, type: 'string' },
          newPassword: { required: true, type: 'string', validator: (v) => !isValidPassword(v) ? 'Password must be at least 8 characters with uppercase, lowercase, and number' : null }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        try {
          await changePassword(user.userId, body.oldPassword, body.newPassword);
          return sendJson(res, 200, { message: 'Password changed successfully' });
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
      }
      
      if (req.method === 'POST' && url.pathname === '/api/user/api-keys') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const body = await readJsonBody(req);
        const apiKey = createApiKey(user.userId, body.name || 'API Key');
        
        return sendJson(res, 201, { 
          apiKey,
          message: 'Save this API key securely. It will not be shown again.'
        });
      }
      
      if (req.method === 'GET' && url.pathname === '/api/user/api-keys') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const keys = listApiKeys(user.userId);
        return sendJson(res, 200, { apiKeys: keys });
      }
      
      if (req.method === 'DELETE' && url.pathname.match(/^\/api\/user\/api-keys\/([^/]+)$/)) {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const keyId = url.pathname.match(/^\/api\/user\/api-keys\/([^/]+)$/)[1];
        revokeApiKey(user.userId, keyId);
        
        return sendJson(res, 200, { message: 'API key revoked' });
      }
      
      if (req.method === 'GET' && url.pathname === '/api/user/stats') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const stats = getUserStats(user.userId);
        return sendJson(res, 200, stats);
      }

      // ============================================================
      // PAPER MANAGEMENT ENDPOINTS
      // ============================================================

      if (req.method === 'POST' && url.pathname === '/api/papers/upload') {
        const body = await readJsonBody(req);
        const { pdfPath, title } = body;
        
        if (!pdfPath) {
          return sendJson(res, 400, { error: 'pdfPath is required' });
        }
        
        // For now, just return success - actual upload handling would go here
        return sendJson(res, 200, { 
          success: true, 
          message: 'PDF uploaded',
          pdfPath 
        });
      }

      if (req.method === 'POST' && url.pathname.match(/^\/api\/papers\/([^/]+)\/analyze$/)) {
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/analyze$/)[1];
        const body = await readJsonBody(req);
        
        // Start analysis in background (client should use WebSocket for progress)
        analyzePaper(body.pdfPath, {
          paperId,
          ...body
        }).catch(err => console.error('Analysis error:', err));
        
        return sendJson(res, 202, { 
          message: 'Analysis started',
          paperId,
          note: 'Connect to WebSocket at /ws for progress updates'
        });
      }

      if (req.method === 'GET' && url.pathname.match(/^\/api\/papers\/([^/]+)\/structure$/)) {
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/structure$/)[1];
        const structure = await getPaperStructure(paperId);
        
        if (!structure) {
          return sendJson(res, 404, { error: 'Structure not found' });
        }
        
        return sendJson(res, 200, structure);
      }

      if (req.method === 'GET' && url.pathname.match(/^\/api\/papers\/([^/]+)\/annotations$/)) {
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/annotations$/)[1];
        const type = url.searchParams.get('type');
        
        const filters = {};
        if (type) filters.annotation_type = type;
        
        const annotations = await getAnnotations(paperId, filters);
        return sendJson(res, 200, { annotations });
      }

      if (req.method === 'GET' && url.pathname.match(/^\/api\/papers\/([^/]+)$/)) {
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)$/)[1];
        const results = await getAnalysisResults(paperId);
        return sendJson(res, 200, results);
      }

      if (req.method === 'GET' && url.pathname === '/api/papers') {
        const papers = await listPapers();
        return sendJson(res, 200, { papers });
      }

      if (req.method === 'DELETE' && url.pathname.match(/^\/api\/papers\/([^/]+)$/)) {
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)$/)[1];
        await deletePaper(paperId);
        return sendJson(res, 200, { message: 'Paper deleted' });
      }

      // Annotation management endpoints
      if (req.method === 'POST' && url.pathname === '/api/annotations') {
        const body = await readJsonBody(req);
        const annotation = await createAnnotation(body);
        return sendJson(res, 201, annotation);
      }

      if (req.method === 'PUT' && url.pathname.match(/^\/api\/annotations\/([^/]+)$/)) {
        const annotationId = url.pathname.match(/^\/api\/annotations\/([^/]+)$/)[1];
        const body = await readJsonBody(req);
        await updateAnnotation(annotationId, body);
        return sendJson(res, 200, { message: 'Annotation updated' });
      }

      if (req.method === 'DELETE' && url.pathname.match(/^\/api\/annotations\/([^/]+)$/)) {
        const annotationId = url.pathname.match(/^\/api\/annotations\/([^/]+)$/)[1];
        await deleteAnnotation(annotationId);
        return sendJson(res, 200, { message: 'Annotation deleted' });
      }
      
      // ============================================================
      // PHASE 2: ANNOTATION TYPES ENDPOINTS
      // ============================================================
      
      if (req.method === 'GET' && url.pathname === '/api/annotation-types') {
        const { ANNOTATION_TYPES } = await import('./services/annotation-types.mjs');
        return sendJson(res, 200, { types: Object.values(ANNOTATION_TYPES) });
      }
      
      if (req.method === 'POST' && url.pathname.match(/^\/api\/papers\/([^/]+)\/detect-types$/)) {
        if (!checkRateLimit('api')) return;
        
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/detect-types$/)[1];
        const body = await readJsonBody(req);
        
        const types = detectRelevantTypes({ text: body.content || '' });
        return sendJson(res, 200, { types });
      }
      
      // ============================================================
      // PHASE 2: ONTOLOGY ENDPOINTS
      // ============================================================
      
      if (req.method === 'GET' && url.pathname.match(/^\/api\/papers\/([^/]+)\/concepts$/)) {
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/concepts$/)[1];
        const annotations = await getAnnotations(paperId);
        
        // TODO: extractConcepts is not exported from ontology-annotator.mjs
        // const allConcepts = [];
        // for (const annotation of annotations) {
        //   const concepts = await extractConcepts(annotation);
        //   allConcepts.push(...concepts);
        // }
        const allConcepts = [];
        
        return sendJson(res, 200, { concepts: allConcepts });
      }
      
      if (req.method === 'GET' && url.pathname.match(/^\/api\/concepts\/([^/]+)\/related$/)) {
        const conceptId = url.pathname.match(/^\/api\/concepts\/([^/]+)\/related$/)[1];
        const related = await getRelatedConcepts(conceptId);
        
        return sendJson(res, 200, { related });
      }
      
      if (req.method === 'POST' && url.pathname === '/api/concepts/link') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const body = await readJsonBody(req);
        const validation = validateParams(body, {
          fromConceptId: { required: true, type: 'string' },
          toConceptId: { required: true, type: 'string' },
          relationshipType: { required: true, type: 'string', enum: ['PREREQUISITE', 'RELATED_TO', 'PART_OF'] }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        // TODO: linkConcepts is not exported from ontology-annotator.mjs
        // await linkConcepts(body.fromConceptId, body.toConceptId, body.relationshipType);
        return sendJson(res, 501, { error: 'linkConcepts not implemented' });
        return sendJson(res, 200, { message: 'Concepts linked' });
      }
      
      // ============================================================
      // PHASE 2: FIGURES ENDPOINTS (DISABLED - missing implementations)
      // ============================================================
      
      /*
      if (req.method === 'GET' && url.pathname.match(/^\/api\/papers\/([^/]+)\/figures$/)) {
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/figures$/)[1];
        const figures = await getFiguresByPaper(paperId);
        
        return sendJson(res, 200, { figures });
      }
      
      if (req.method === 'POST' && url.pathname.match(/^\/api\/papers\/([^/]+)\/figures\/analyze$/)) {
        if (!checkRateLimit('api')) return;
        
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/figures\/analyze$/)[1];
        const body = await readJsonBody(req);
        
        // Analyze figures in background
        analyzeFigures(body.pdfPath, paperId).catch(err => console.error('Figure analysis error:', err));
        
        return sendJson(res, 202, { 
          message: 'Figure analysis started',
          paperId
        });
      }
      
      if (req.method === 'GET' && url.pathname.match(/^\/api\/figures\/([^/]+)$/)) {
        const figureId = url.pathname.match(/^\/api\/figures\/([^/]+)$/)[1];
        const figure = await getFigureById(figureId);
        
        if (!figure) {
          return sendJson(res, 404, notFoundError('Figure'));
        }
        
        return sendJson(res, 200, { figure });
      }
      */
      
      if (req.method === 'GET' && url.pathname.match(/^\/api\/figures\/([^/]+)\/image$/)) {
        const figureId = url.pathname.match(/^\/api\/figures\/([^/]+)\/image$/)[1];
        const figure = await getFigureById(figureId);
        
        if (!figure || !figure.image_data) {
          return sendJson(res, 404, notFoundError('Figure image'));
        }
        
        // Return base64 image
        const imageData = figure.image_data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(imageData, 'base64');
        
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(buffer);
        return;
      }
      
      // ============================================================
      // PHASE 2: ANNOTATION MANAGEMENT ENDPOINTS
      // ============================================================
      
      if (req.method === 'GET' && url.pathname.match(/^\/api\/annotations\/([^/]+)\/history$/)) {
        const annotationId = url.pathname.match(/^\/api\/annotations\/([^/]+)\/history$/)[1];
        const history = await getAnnotationHistory(annotationId);
        
        return sendJson(res, 200, { history });
      }
      
      if (req.method === 'POST' && url.pathname.match(/^\/api\/annotations\/([^/]+)\/rate$/)) {
        const user = authenticate();
        const userId = user ? user.userId : 'anonymous';
        
        const annotationId = url.pathname.match(/^\/api\/annotations\/([^/]+)\/rate$/)[1];
        const body = await readJsonBody(req);
        
        const validation = validateParams(body, {
          rating: { required: true, type: 'number', enum: [-1, 1] }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        await rateAnnotation(annotationId, userId, body.rating);
        return sendJson(res, 200, { message: 'Rating saved' });
      }
      
      if (req.method === 'POST' && url.pathname.match(/^\/api\/annotations\/([^/]+)\/report$/)) {
        const user = authenticate();
        const userId = user ? user.userId : 'anonymous';
        
        const annotationId = url.pathname.match(/^\/api\/annotations\/([^/]+)\/report$/)[1];
        const body = await readJsonBody(req);
        
        const validation = validateParams(body, {
          reason: { required: true, type: 'string', minLength: 10, maxLength: 500 }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        await reportAnnotation(annotationId, userId, body.reason);
        return sendJson(res, 200, { message: 'Report submitted' });
      }
      
      if (req.method === 'POST' && url.pathname === '/api/annotations/bulk/delete') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const body = await readJsonBody(req);
        const validation = validateParams(body, {
          annotationIds: { required: true, type: 'array', minItems: 1 }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        const result = await bulkDeleteAnnotations(body.annotationIds, user.userId);
        return sendJson(res, 200, { message: `Deleted ${result.deleted} annotations` });
      }
      
      if (req.method === 'POST' && url.pathname === '/api/annotations/bulk/hide') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const body = await readJsonBody(req);
        const validation = validateParams(body, {
          annotationIds: { required: true, type: 'array', minItems: 1 },
          hidden: { required: true, type: 'boolean' }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        const result = await bulkHideAnnotations(body.annotationIds, body.hidden);
        return sendJson(res, 200, { message: `Updated ${result.updated} annotations` });
      }
      
      // ============================================================
      // PHASE 2: EXPORT ENDPOINTS
      // ============================================================
      
      if (req.method === 'POST' && url.pathname.match(/^\/api\/papers\/([^/]+)\/export$/)) {
        if (!checkRateLimit('export')) return;
        
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/export$/)[1];
        const body = await readJsonBody(req);
        
        const validation = validateParams(body, {
          format: { required: true, type: 'string', enum: ['json', 'markdown', 'notion', 'obsidian', 'html'] }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        const paper = await getPaper(paperId);
        if (!paper) {
          return sendJson(res, 404, notFoundError('Paper'));
        }
        
        const structure = await getPaperStructure(paperId);
        const annotations = await getAnnotations(paperId);
        
        let result;
        switch (body.format) {
          case 'json':
            result = await exportAsJSON(paper, structure, annotations);
            break;
          case 'markdown':
            result = await exportAsMarkdown(paper, structure, annotations);
            break;
          case 'notion':
            result = await exportForNotion(paper, structure, annotations);
            break;
          case 'obsidian':
            result = await exportForObsidian(paper, structure, annotations);
            break;
          case 'html':
            result = await exportAsPrintHTML(paper, structure, annotations);
            break;
        }
        
        return sendJson(res, 200, { 
          format: body.format,
          content: result
        });
      }
      
      if (req.method === 'POST' && url.pathname.match(/^\/api\/papers\/([^/]+)\/share$/)) {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/share$/)[1];
        const body = await readJsonBody(req);
        
        const shareLink = await generateShareableLink(paperId, body.expiresIn || 7);
        return sendJson(res, 200, { shareLink });
      }
      
      // ============================================================
      // PHASE 2: SEARCH ENDPOINTS
      // ============================================================
      
      if (req.method === 'POST' && url.pathname === '/api/search') {
        if (!checkRateLimit('search')) return;
        
        const body = await readJsonBody(req);
        const user = authenticate();
        const userId = user ? user.userId : 'anonymous';
        
        const validation = validateParams(body, {
          query: { required: true, type: 'string', minLength: 1 },
          type: { required: false, type: 'string', enum: ['papers', 'annotations', 'concepts', 'semantic', 'advanced'] }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        const pagination = validatePagination(body.page, body.limit);
        
        let results;
        switch (body.type || 'papers') {
          case 'papers':
            results = await searchPapers(body.query, body.filters, pagination);
            break;
          case 'annotations':
            results = await searchAnnotations(body.query, body.filters, pagination);
            break;
          case 'concepts':
            results = await searchByConcept(body.query, pagination);
            break;
          case 'semantic':
            results = await semanticSearch(body.query, body.filters, pagination);
            break;
          case 'advanced':
            results = await advancedSearch(body.query, body.filters, pagination);
            break;
        }
        
        return sendJson(res, 200, results);
      }
      
      if (req.method === 'GET' && url.pathname === '/api/search/history') {
        const user = authenticate();
        const userId = user ? user.userId : 'anonymous';
        
        const pagination = validatePagination(url.searchParams.get('page'), url.searchParams.get('limit'));
        const history = await getSearchHistory(userId, pagination);
        
        return sendJson(res, 200, history);
      }
      
      if (req.method === 'POST' && url.pathname === '/api/search/save') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const body = await readJsonBody(req);
        const validation = validateParams(body, {
          name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
          query: { required: true, type: 'string', minLength: 1 }
        });
        
        if (!validation.valid) {
          return sendJson(res, 400, validationError(validation.errors));
        }
        
        const saved = await saveSearch(user.userId, body.name, body.query, body.filters);
        return sendJson(res, 200, { saved });
      }
      
      if (req.method === 'GET' && url.pathname === '/api/search/saved') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        const saved = await getSavedSearches(user.userId);
        return sendJson(res, 200, { searches: saved });
      }
      
      if (req.method === 'DELETE' && url.pathname === '/api/search/history') {
        const user = authenticate();
        if (!user) {
          return sendJson(res, 401, authError());
        }
        
        await clearSearchHistory(user.userId);
        return sendJson(res, 200, { message: 'Search history cleared' });
      }

      // ============================================================
      // EXISTING ENDPOINTS (Progress tracking, etc.)
      // ============================================================

      // Progress tracking endpoints
      if (req.method === 'GET' && url.pathname.match(/^\/api\/papers\/([^/]+)\/progress$/)) {
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/progress$/)[1];
        const progress = await getReadingProgress(paperId);
        return sendJson(res, 200, progress || {});
      }

      if (req.method === 'PUT' && url.pathname.match(/^\/api\/papers\/([^/]+)\/progress$/)) {
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/progress$/)[1];
        const body = await readJsonBody(req);
        await saveReadingProgress(paperId, body);
        return sendJson(res, 200, { message: 'Progress saved' });
      }

      // Document outline endpoint
      if (req.method === 'GET' && url.pathname.match(/^\/api\/papers\/([^/]+)\/outline$/)) {
        const paperId = url.pathname.match(/^\/api\/papers\/([^/]+)\/outline$/)[1];
        const outline = await getDocumentOutline(paperId);
        return sendJson(res, 200, outline || { sections: [] });
      }

      if (req.method === 'GET' && url.pathname === '/api/profile') {
        const profile = await loadLearningProfile('default');
        return sendJson(res, 200, profile);
      }

      if (req.method === 'POST' && url.pathname === '/api/profile/reset') {
        await saveLearningProfile('default', {}, '');
        return sendJson(res, 200, { status: 'reset', profile: await loadLearningProfile('default') });
      }

      if (req.method === 'GET' && url.pathname === '/api/drills') {
        const state = await loadDrillState();
        return sendJson(res, 200, state);
      }

      if (req.method === 'POST' && url.pathname === '/api/drills') {
        const body = await readJsonBody(req);
        const items = Array.isArray(body.items) ? body.items : [];
        const state = await saveDrillState(items);
        return sendJson(res, 200, state);
      }

      if (req.method === 'POST' && url.pathname === '/api/drills/clear') {
        const state = await saveDrillState([]);
        return sendJson(res, 200, state);
      }

      if (req.method === 'GET' && url.pathname === '/api/drills/library') {
        // Return all available drill templates
        const templates = {
          derivation: {
            id: 'derivation',
            name: 'Derivation Check',
            description: 'Ask learner to derive one intermediate step',
            icon: '📐'
          },
          mechanism: {
            id: 'mechanism',
            name: 'Mechanism Check',
            description: 'Explain why one component changes outcome vs baseline',
            icon: '⚙️'
          },
          evidence: {
            id: 'evidence',
            name: 'Evidence Check',
            description: 'Point to paragraph/section/figure supporting a claim',
            icon: '📄'
          },
          ablation: {
            id: 'ablation',
            name: 'Ablation Check',
            description: 'What result worsens if one module is removed',
            icon: '🔬'
          },
          transfer: {
            id: 'transfer',
            name: 'Transfer Check',
            description: 'Apply idea to nearby example or toy case',
            icon: '🔀'
          },
          foundation: {
            id: 'foundation',
            name: 'Foundation Check',
            description: '2-sentence explanation of core prerequisite',
            icon: '🏗️'
          },
          section: {
            id: 'section',
            name: 'Section Check',
            description: 'Reread target section and answer narrow question',
            icon: '📖'
          }
        };
        return sendJson(res, 200, { templates: Object.values(templates), total: Object.keys(templates).length });
      }

      if (req.method === 'POST' && url.pathname === '/api/compare-strictness') {
        const body = await readJsonBody(req);
        const { question, mode: compareMode, paperId } = body;
        
        if (!question) {
          return sendJson(res, 400, { error: 'question is required' });
        }

        // Run with all 4 strictness levels in parallel
        const strictnessLevels = ['soft', 'direct', 'strict', 'brutal'];
        const results = await Promise.all(
          strictnessLevels.map(async (strictness) => {
            try {
              const input = {
                mode: compareMode || 'general',
                strictness,
                language: 'Chinese',
                confusion: question,
                topic: 'Comparison mode',
                paperId
              };
              const prompt = buildPrompt(validateInput(input));
              
              const result = await askModel({
                apiStyle: body.apiStyle,
                apiBaseUrl: body.apiBaseUrl,
                apiKey: body.apiKey,
                model: body.model,
                timeoutMs: body.timeoutMs,
                systemPrompt: prompt.systemPrompt,
                userPrompt: prompt.userPrompt,
              });

              return {
                strictness,
                content: result.content,
                success: true
              };
            } catch (error) {
              return {
                strictness,
                content: error.message,
                success: false
              };
            }
          })
        );

        return sendJson(res, 200, { question, mode: compareMode, results });
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/examples/')) {
        const name = decodeURIComponent(url.pathname.replace('/api/examples/', ''));
        return sendJson(res, 200, await readExample(name));
      }

      if (req.method === 'POST' && url.pathname === '/api/prompt') {
        const input = await readJsonBody(req);
        let normalized = normalizeInputPayload(input);
        try {
          normalized = await enrichInputWithPaperContext(normalized);
        } catch (e) {
          // Fallback: proceed without paper context enrichment if it fails
          console.error('Paper context enrichment failed:', e.message);
        }
        const prompt = buildPrompt(validateInput(normalized));
        return sendJson(res, 200, prompt);
      }

      if (req.method === 'POST' && url.pathname === '/api/ask') {
        const body = await readJsonBody(req);
        let input = normalizeInputPayload(body.input || body);
        try {
          input = await enrichInputWithPaperContext(input);
        } catch (e) {
          // Fallback: proceed without paper context enrichment if it fails
          console.error('Paper context enrichment failed:', e.message);
        }
        const prompt = buildPrompt(validateInput(input));
        
        // Load prior learning profile for context
        const profile = await loadLearningProfile('default');
        const profileSummary = summarizeLearningProfile(profile);
        
        // Inject profile context into prompt if available
        let enhancedUserPrompt = prompt.userPrompt;
        if (profileSummary) {
          enhancedUserPrompt += `\n\n# Prior Learning Profile\n${profileSummary}\n(Note: Reference recurring gaps if relevant to this diagnosis.)`;
        }
        
        const result = await askModel({
          apiStyle: body.apiStyle,
          apiBaseUrl: body.apiBaseUrl,
          apiKey: body.apiKey,
          model: body.model,
          temperature: body.temperature,
          timeoutMs: body.timeoutMs,
          systemPrompt: prompt.systemPrompt,
          userPrompt: enhancedUserPrompt,
        });

        // Save/update learning profile after response
        if (result.content) {
          await saveLearningProfile('default', input, result.content).catch(() => {});
        }

        return sendJson(res, 200, {
          input,
          prompt: { ...prompt, userPrompt: enhancedUserPrompt },
          result,
          profile: { 
            recurringGaps: profile.recurringGaps, 
            gapFrequency: profile.gapFrequency || {},
            recentTopics: profile.recentTopics,
            sessions: profile.sessions,
            gapAnalysis: profile.gapAnalysis || null,
            progressMetrics: profile.progressMetrics || null,
          },
          paperEvidenceIndex: input.paperEvidenceIndex || {},
        });
      }

      // NEW: Dashboard API - Get comprehensive learning data
      if (req.method === 'GET' && url.pathname === '/api/dashboard') {
        const profile = await loadLearningProfile('default');
        const dashboardData = getDashboardData(profile);
        const drillState = await loadAdaptiveDrillState();
        const drillEffectiveness = analyzeDrillEffectiveness(drillState);
        const learningPath = generateLearningPath(profile.gapAnalysis || {}, profile);
        const pathProgress = calculatePathProgress(learningPath, profile);
        
        return sendJson(res, 200, {
          overview: dashboardData.overview,
          gapAnalysis: dashboardData.gapCategories,
          topGaps: dashboardData.topGaps,
          patterns: dashboardData.patterns,
          recommendations: dashboardData.recommendations,
          drillEffectiveness,
          learningPath: {
            phases: learningPath.phases,
            resources: learningPath.resources,
            priority: learningPath.priority,
            estimatedDuration: learningPath.estimatedDuration,
          },
          pathProgress,
        });
      }

      // NEW: Learning Path API
      if (req.method === 'GET' && url.pathname === '/api/learning-path') {
        const profile = await loadLearningProfile('default');
        const learningPath = generateLearningPath(profile.gapAnalysis || {}, profile);
        const pathProgress = calculatePathProgress(learningPath, profile);
        return sendJson(res, 200, { learningPath, pathProgress });
      }

      // NEW: Gap Analysis API
      if (req.method === 'GET' && url.pathname === '/api/gap-analysis') {
        const profile = await loadLearningProfile('default');
        const dashboardData = getDashboardData(profile);
        return sendJson(res, 200, dashboardData);
      }

      // NEW: Drill Stats API
      if (req.method === 'GET' && url.pathname === '/api/drill-stats') {
        const drillState = await loadAdaptiveDrillState();
        const effectiveness = analyzeDrillEffectiveness(drillState);
        return sendJson(res, 200, { drillState, effectiveness });
      }

      if (req.method === 'GET') {
        const assetPath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        return sendStatic(res, assetPath);
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Internal Server Error' });
    }
  });

  // Try to listen on the requested port, fallback to port 0 (auto-assign) if in use
  let resolvedPort = port;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, resolve);
    });
  } catch (listenError) {
    if (listenError.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use, trying to auto-assign an available port...`);
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, host, resolve);
      });
    } else {
      throw listenError;
    }
  }

  const address = server.address();
  resolvedPort = typeof address === 'object' && address ? address.port : port;
  const appUrl = `http://${host}:${resolvedPort}`;

  // Initialize WebSocket server
  initWebSocketServer(server);
  console.log(`WebSocket server initialized at ws://${host}:${resolvedPort}/ws`);

  if (openBrowser) {
    openUrl(appUrl).catch(() => {});
  }

  return {
    server,
    url: appUrl,
    host,
    port: resolvedPort,
  };
}

async function getInfo() {
  const config = await resolveApiConfig({});
  return {
    appName: 'Truth Tutor Web',
    defaultMode: 'paper-reading',
    api: {
      source: config.source,
      style: config.style,
      model: config.model || null,
      baseUrl: config.baseUrl || null,
    },
    examples: await listExamples(),
  };
}

async function listExamples() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
}

async function readExample(name) {
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(name)) {
    throw new Error('Invalid example name');
  }

  const raw = await readFile(new URL(name, EXAMPLES_DIR), 'utf8');
  return JSON.parse(raw);
}

async function sendStatic(res, assetPath) {
  const safePath = assetPath.includes('..') ? 'index.html' : assetPath;
  const fileUrl = new URL(safePath, PUBLIC_DIR);

  try {
    const data = await readFile(fileUrl);
    const type = MIME_TYPES[extname(safePath)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(data);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    throw error;
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

// Progress tracking helpers
const progressStore = new Map(); // In-memory store for progress (use database in production)

async function getReadingProgress(paperId) {
  return progressStore.get(paperId) || null;
}

async function saveReadingProgress(paperId, progressData) {
  progressStore.set(paperId, {
    ...progressData,
    lastUpdated: Date.now()
  });
}

async function getDocumentOutline(paperId) {
  // In production, this would extract outline from PDF or database
  // For now, return null to let frontend generate mock outline
  return null;
}

function normalizeInputPayload(input) {
  const normalized = Object.fromEntries(
    Object.entries(input || {}).filter(([, value]) => value !== undefined && value !== '' && value !== null),
  );
  normalized.mode = normalizeMode(normalized.mode, normalized.source);
  return normalized;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
}

async function openUrl(url) {
  const platform = process.platform;
  if (platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
}
