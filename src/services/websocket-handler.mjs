import { WebSocketServer } from 'ws';
import { analyzePaper, getAnalysisResults } from './analysis-pipeline.mjs';

/**
 * WebSocket handler for streaming analysis progress
 * Handles /analyze WebSocket connections and streams real-time updates
 */

let wss = null;

/**
 * Initialize WebSocket server
 * @param {Object} httpServer - HTTP server instance
 */
export function initWebSocketServer(httpServer) {
  wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });
  
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        await handleWebSocketMessage(ws, data);
      } catch (error) {
        sendError(ws, `Invalid message: ${error.message}`);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Send welcome message
    send(ws, {
      type: 'connected',
      message: 'WebSocket connection established'
    });
  });
  
  return wss;
}

/**
 * Handle incoming WebSocket messages
 */
async function handleWebSocketMessage(ws, data) {
  const { action, payload } = data;
  
  switch (action) {
    case 'analyze':
      await handleAnalyze(ws, payload);
      break;
      
    case 'getResults':
      await handleGetResults(ws, payload);
      break;
      
    case 'ping':
      send(ws, { type: 'pong' });
      break;
      
    default:
      sendError(ws, `Unknown action: ${action}`);
  }
}

/**
 * Handle analyze request
 */
async function handleAnalyze(ws, payload) {
  const {
    pdfPath,
    paperId,
    annotationTypes,
    language,
    batchSize,
    maxParagraphs,
    apiStyle,
    apiBaseUrl,
    apiKey,
    model,
    timeoutMs
  } = payload;
  
  if (!pdfPath) {
    sendError(ws, 'pdfPath is required');
    return;
  }
  
  // Send start message
  send(ws, {
    type: 'analysis-started',
    message: 'Starting analysis...',
    paperId: paperId || 'auto-generated'
  });
  
  try {
    // Run analysis with progress callback
    const result = await analyzePaper(pdfPath, {
      paperId,
      annotationTypes,
      language,
      batchSize,
      maxParagraphs,
      apiStyle,
      apiBaseUrl,
      apiKey,
      model,
      timeoutMs
    }, (progress) => {
      // Stream progress updates to client
      send(ws, {
        type: 'progress',
        ...progress
      });
    });
    
    // Send completion message
    send(ws, {
      type: 'analysis-complete',
      message: 'Analysis complete',
      result: {
        paperId: result.paperId,
        stats: result.stats
      }
    });
    
  } catch (error) {
    sendError(ws, `Analysis failed: ${error.message}`);
  }
}

/**
 * Handle get results request
 */
async function handleGetResults(ws, payload) {
  const { paperId } = payload;
  
  if (!paperId) {
    sendError(ws, 'paperId is required');
    return;
  }
  
  try {
    const results = await getAnalysisResults(paperId);
    
    send(ws, {
      type: 'results',
      data: results
    });
    
  } catch (error) {
    sendError(ws, `Failed to get results: ${error.message}`);
  }
}

/**
 * Send message to WebSocket client
 */
function send(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Send error message
 */
function sendError(ws, message) {
  send(ws, {
    type: 'error',
    error: message
  });
}

/**
 * Broadcast message to all connected clients
 */
export function broadcast(data) {
  if (!wss) return;
  
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

/**
 * Close WebSocket server
 */
export function closeWebSocketServer() {
  if (wss) {
    wss.close();
    wss = null;
  }
}
