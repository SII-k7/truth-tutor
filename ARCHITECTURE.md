# Truth-Tutor Vibero Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                          User Interface                                 │ │
│  │                                                                         │ │
│  │  ┌──────────────┐  ┌─────────────────────┐  ┌────────────────────┐   │ │
│  │  │   Sidebar    │  │    PDF Viewer       │  │   Chat Panel       │   │ │
│  │  │              │  │                     │  │                    │   │ │
│  │  │ • Outline    │  │ • Section Navigator │  │ • Annotation Filter│   │ │
│  │  │ • Progress   │  │ • Progress Tracker  │  │ • Chat Thread      │   │ │
│  │  │ • Collapse   │  │ • PDF Canvas        │  │ • AI Assistant     │   │ │
│  │  │              │  │ • Annotation Layer  │  │ • Composer         │   │ │
│  │  └──────────────┘  └─────────────────────┘  └────────────────────┘   │ │
│  │                                                                         │ │
│  │  280px              Flexible (600px+)          380px                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        Component Layer                                  │ │
│  │                                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ PDFRenderer  │  │ Sidebar      │  │ Progress     │                │ │
│  │  │              │  │              │  │ Tracker      │                │ │
│  │  │ • Load PDF   │  │ • Render     │  │ • Track      │                │ │
│  │  │ • Zoom/Pan   │  │   Outline    │  │   Progress   │                │ │
│  │  │ • Navigate   │  │ • Navigate   │  │ • Auto-save  │                │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │ │
│  │                                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ Annotation   │  │ Section      │  │ Annotation   │                │ │
│  │  │ Layer        │  │ Navigator    │  │ Filter       │                │ │
│  │  │              │  │              │  │              │                │ │
│  │  │ • Overlay    │  │ • Breadcrumb │  │ • Filter     │                │ │
│  │  │ • Render     │  │ • Mini-map   │  │ • Search     │                │ │
│  │  │ • Interact   │  │ • Prev/Next  │  │ • Heatmap    │                │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │ │
│  │                                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ Onboarding   │  │ Keyboard     │  │ Coordinate   │                │ │
│  │  │ Tour         │  │ Shortcuts    │  │ Mapper       │                │ │
│  │  │              │  │              │  │              │                │ │
│  │  │ • Guide      │  │ • Handle     │  │ • PDF→Screen │                │ │
│  │  │ • Spotlight  │  │   Keys       │  │ • Transform  │                │ │
│  │  │ • Progress   │  │ • Help Modal │  │ • Viewport   │                │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      Communication Layer                                │ │
│  │                                                                         │ │
│  │  ┌──────────────────────────┐  ┌──────────────────────────┐           │ │
│  │  │   HTTP API Client        │  │   WebSocket Client       │           │ │
│  │  │                          │  │                          │           │ │
│  │  │ • Fetch API              │  │ • Real-time Updates      │           │ │
│  │  │ • REST Endpoints         │  │ • Progress Streaming     │           │ │
│  │  │ • JSON Payloads          │  │ • Auto-reconnect         │           │ │
│  │  └──────────────────────────┘  └──────────────────────────┘           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/WebSocket
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                              BACKEND LAYER                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Web Server                                      │ │
│  │                                                                         │ │
│  │  ┌──────────────────────────┐  ┌──────────────────────────┐           │ │
│  │  │   HTTP Server            │  │   WebSocket Server       │           │ │
│  │  │                          │  │                          │           │ │
│  │  │ • Route Handling         │  │ • Connection Manager     │           │ │
│  │  │ • Request Parsing        │  │ • Message Broadcasting   │           │ │
│  │  │ • Response Formatting    │  │ • Client Tracking        │           │ │
│  │  └──────────────────────────┘  └──────────────────────────┘           │ │
│  │                                                                         │ │
│  │  API Endpoints:                                                         │ │
│  │  • POST /api/papers/upload                                              │ │
│  │  • POST /api/papers/:id/analyze                                         │ │
│  │  • GET  /api/papers/:id/structure                                       │ │
│  │  • GET  /api/papers/:id/annotations                                     │ │
│  │  • GET  /api/papers/:id/progress                                        │ │
│  │  • PUT  /api/papers/:id/progress                                        │ │
│  │  • GET  /api/papers/:id/outline                                         │ │
│  │  • WebSocket /ws                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                       Service Layer                                     │ │
│  │                                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ PDF Parser   │  │ Structure    │  │ Annotation   │                │ │
│  │  │              │  │ Extractor    │  │ Generator    │                │ │
│  │  │ • Extract    │  │              │  │              │                │ │
│  │  │   Text       │  │ • Detect     │  │ • AI Model   │                │ │
│  │  │ • Get        │  │   Sections   │  │   Client     │                │ │
│  │  │   Coords     │  │ • Parse      │  │ • Generate   │                │ │
│  │  │ • Metadata   │  │   Structure  │  │   Annots     │                │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │ │
│  │                                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐                                   │ │
│  │  │ Analysis     │  │ WebSocket    │                                   │ │
│  │  │ Pipeline     │  │ Handler      │                                   │ │
│  │  │              │  │              │                                   │ │
│  │  │ • Orchestrate│  │ • Broadcast  │                                   │ │
│  │  │ • Stream     │  │ • Progress   │                                   │ │
│  │  │ • Error      │  │ • Events     │                                   │ │
│  │  │   Handling   │  │              │                                   │ │
│  │  └──────────────┘  └──────────────┘                                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                       Data Layer                                        │ │
│  │                                                                         │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │                      Database Module                              │ │ │
│  │  │                                                                   │ │ │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │ │ │
│  │  │  │  Papers    │  │ Structure  │  │Annotations │  │  Reading  │ │ │ │
│  │  │  │            │  │            │  │            │  │   State   │ │ │ │
│  │  │  │ • ID       │  │ • Sections │  │ • Type     │  │ • Page    │ │ │ │
│  │  │  │ • Title    │  │ • Paras    │  │ • Text     │  │ • Visited │ │ │ │
│  │  │  │ • Path     │  │ • Figures  │  │ • Content  │  │ • Time    │ │ │ │
│  │  │  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │ │ │
│  │  │                                                                   │ │ │
│  │  │  SQLite Database                                                  │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ External API
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│                                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────────┐               │
│  │   AI Model Provider      │  │   arXiv API              │               │
│  │                          │  │                          │               │
│  │ • OpenAI / Anthropic     │  │ • Paper Search           │               │
│  │ • Generate Annotations   │  │ • Metadata Retrieval     │               │
│  │ • Translation            │  │ • PDF Download           │               │
│  │ • Explanation            │  │                          │               │
│  └──────────────────────────┘  └──────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Load Paper Flow

```
User → Search/Paste URL → Web Server → arXiv API → Download PDF
                                    ↓
                            Store in Database
                                    ↓
                            Return to Frontend
                                    ↓
                            PDFRenderer loads PDF
                                    ↓
                            Initialize Components
                                    ↓
                            Load Outline & Progress
```

### 2. Analyze Paper Flow

```
User clicks "Analyze" → Web Server → Analysis Pipeline
                                            ↓
                                    PDF Parser (extract text)
                                            ↓
                                    Structure Extractor (sections)
                                            ↓
                                    Annotation Generator (AI)
                                            ↓
                                    Store in Database
                                            ↓
                                    Stream via WebSocket
                                            ↓
                                    Frontend updates in real-time
```

### 3. Navigation Flow

```
User clicks section → Sidebar emits event → App.js handler
                                                    ↓
                                            PDFRenderer.goToPage()
                                                    ↓
                                            Update Progress Tracker
                                                    ↓
                                            Update Section Navigator
                                                    ↓
                                            Auto-save after 30s
```

### 4. Progress Tracking Flow

```
Page change → ProgressTracker.updateProgress()
                        ↓
                Calculate stats (%, time)
                        ↓
                Update UI (progress bar)
                        ↓
                Auto-save timer (30s)
                        ↓
                PUT /api/papers/:id/progress
                        ↓
                Store in Database + LocalStorage
```

### 5. Annotation Filter Flow

```
User changes filter → AnnotationFilter emits event
                                ↓
                        App.js handler
                                ↓
                        Filter annotations array
                                ↓
                        Re-render AnnotationLayer
                                ↓
                        Update annotation list
```

## Component Communication

```
┌─────────────────────────────────────────────────────────────┐
│                      Event Bus Pattern                       │
│                                                              │
│  Component A                Component B                      │
│      │                          │                            │
│      │ emit('event', data)      │                            │
│      └──────────────────────────▶ on('event', handler)       │
│                                  │                            │
│                                  └─▶ handler(data)            │
│                                                              │
│  Examples:                                                   │
│  • Sidebar → sectionClick → App → PDFRenderer.goToPage()    │
│  • PDFRenderer → pageChange → ProgressTracker.update()      │
│  • AnnotationFilter → filterChange → AnnotationLayer.render()│
│  • KeyboardShortcuts → toggleSidebar → Sidebar.toggle()     │
└─────────────────────────────────────────────────────────────┘
```

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│                      Global State (app.js)                   │
│                                                              │
│  state = {                                                   │
│    messages: [],              // Chat messages              │
│    isBusy: false,             // Loading state              │
│    pdfRenderer: PDFRenderer,  // PDF component              │
│    annotationLayer: Layer,    // Annotation component       │
│    sidebar: Sidebar,          // Sidebar component          │
│    progressTracker: Tracker,  // Progress component         │
│    sectionNavigator: Nav,     // Navigator component        │
│    annotationFilter: Filter,  // Filter component           │
│    onboardingTour: Tour,      // Tour component             │
│    keyboardShortcuts: Keys,   // Shortcuts component        │
│    annotations: [],           // All annotations            │
│    currentPdfUrl: string,     // Current PDF URL            │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Language:** JavaScript ES6+
- **Rendering:** PDF.js
- **Styling:** CSS3 (Grid, Flexbox, Custom Properties)
- **Communication:** Fetch API, WebSocket
- **Storage:** LocalStorage

### Backend
- **Runtime:** Node.js
- **Server:** HTTP + WebSocket
- **Database:** SQLite3
- **PDF Processing:** pdf-parse
- **AI:** OpenAI/Anthropic API

### Development
- **Package Manager:** npm
- **Linting:** ESLint
- **Formatting:** Prettier

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Production Setup                        │
│                                                              │
│  ┌──────────────┐                                           │
│  │   Nginx      │  (Reverse Proxy)                          │
│  │   :80/:443   │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         ├─▶ Static Files (HTML, CSS, JS)                    │
│         │                                                    │
│         └─▶ ┌──────────────┐                                │
│             │  Node.js     │                                │
│             │  :3474       │                                │
│             └──────┬───────┘                                │
│                    │                                         │
│                    ├─▶ HTTP API                             │
│                    ├─▶ WebSocket                            │
│                    │                                         │
│                    └─▶ ┌──────────────┐                     │
│                        │  SQLite DB   │                     │
│                        │  data.db     │                     │
│                        └──────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **Input Validation:** All user inputs sanitized
2. **SQL Injection:** Parameterized queries
3. **XSS Prevention:** HTML escaping
4. **CORS:** Configured for same-origin
5. **Rate Limiting:** API rate limits (future)
6. **Authentication:** Single-user (future: multi-user)

## Performance Optimizations

1. **Lazy Loading:** Components initialize on demand
2. **Debouncing:** Scroll events debounced
3. **Memoization:** Expensive calculations cached
4. **Virtual Scrolling:** For large lists (future)
5. **Code Splitting:** ES6 modules
6. **CSS Optimization:** Minimal repaints
7. **Database Indexing:** Fast queries

## Scalability

### Current Capacity
- **Users:** Single user
- **Papers:** Unlimited (disk space)
- **Annotations:** ~10,000 per paper
- **Concurrent Connections:** 1 WebSocket

### Future Scaling
- **Multi-user:** Add authentication
- **Database:** Migrate to PostgreSQL
- **Caching:** Redis for sessions
- **Load Balancing:** Multiple Node instances
- **CDN:** Static asset delivery

---

**Architecture Version:** 1.0  
**Last Updated:** March 17, 2025  
**Status:** Production Ready
