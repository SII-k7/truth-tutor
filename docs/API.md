# API Reference

Complete API documentation for Truth Tutor.

## Base URL

```
http://localhost:3474/api
```

## Authentication

Most endpoints require authentication via JWT token or API key.

### Headers

```
Authorization: Bearer <jwt_token>
```

or

```
Authorization: <api_key>
```

## Rate Limiting

All endpoints are rate-limited. Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when limit resets

## Authentication Endpoints

### Register User

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Current User

```http
GET /api/auth/me
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-03-17T12:00:00Z"
  }
}
```

## User Management

### Update Profile

```http
PUT /api/user/profile
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

### Change Password

```http
POST /api/user/change-password
```

**Request Body:**
```json
{
  "oldPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

### Create API Key

```http
POST /api/user/api-keys
```

**Request Body:**
```json
{
  "name": "My API Key"
}
```

**Response:**
```json
{
  "apiKey": "tt_abc123...",
  "message": "Save this API key securely. It will not be shown again."
}
```

### List API Keys

```http
GET /api/user/api-keys
```

### Revoke API Key

```http
DELETE /api/user/api-keys/:keyId
```

### Get User Stats

```http
GET /api/user/stats
```

**Response:**
```json
{
  "papers_count": 15,
  "annotations_count": 234,
  "searches_count": 89,
  "saved_searches_count": 5
}
```

## Paper Management

### Upload Paper

```http
POST /api/papers/upload
```

**Request Body:**
```json
{
  "pdfPath": "/path/to/paper.pdf",
  "title": "Paper Title"
}
```

### Analyze Paper

```http
POST /api/papers/:paperId/analyze
```

**Request Body:**
```json
{
  "pdfPath": "/path/to/paper.pdf",
  "mode": "explain"
}
```

**Response:** `202 Accepted`
```json
{
  "message": "Analysis started",
  "paperId": "paper_123",
  "note": "Connect to WebSocket at /ws for progress updates"
}
```

### Get Paper

```http
GET /api/papers/:paperId
```

### List Papers

```http
GET /api/papers
```

### Delete Paper

```http
DELETE /api/papers/:paperId
```

### Get Paper Structure

```http
GET /api/papers/:paperId/structure
```

### Get Paper Annotations

```http
GET /api/papers/:paperId/annotations?type=explanation
```

**Query Parameters:**
- `type` (optional): Filter by annotation type

## Annotation Types

### List Annotation Types

```http
GET /api/annotation-types
```

**Response:**
```json
{
  "types": [
    {
      "id": "translation",
      "name": "Translation",
      "color": "#4CAF50",
      "icon": "🌐"
    },
    {
      "id": "explanation",
      "name": "Explanation",
      "color": "#2196F3",
      "icon": "💡"
    }
  ]
}
```

### Detect Annotation Types

```http
POST /api/papers/:paperId/detect-types
```

**Request Body:**
```json
{
  "content": "The equation ∑(x) represents..."
}
```

**Response:**
```json
{
  "types": ["math", "definition", "explanation"]
}
```

## Ontology

### Get Paper Concepts

```http
GET /api/papers/:paperId/concepts
```

**Response:**
```json
{
  "concepts": [
    {
      "id": "concept_123",
      "name": "Neural Networks",
      "type": "concept"
    }
  ]
}
```

### Get Related Concepts

```http
GET /api/concepts/:conceptId/related
```

**Response:**
```json
{
  "related": [
    {
      "fromConceptId": "concept_123",
      "toConceptId": "concept_456",
      "type": "PREREQUISITE"
    }
  ]
}
```

### Link Concepts

```http
POST /api/concepts/link
```

**Request Body:**
```json
{
  "fromConceptId": "concept_123",
  "toConceptId": "concept_456",
  "relationshipType": "PREREQUISITE"
}
```

## Figures

### List Figures

```http
GET /api/papers/:paperId/figures
```

### Analyze Figures

```http
POST /api/papers/:paperId/figures/analyze
```

**Request Body:**
```json
{
  "pdfPath": "/path/to/paper.pdf"
}
```

### Get Figure

```http
GET /api/figures/:figureId
```

### Get Figure Image

```http
GET /api/figures/:figureId/image
```

Returns PNG image.

## Annotation Management

### Create Annotation

```http
POST /api/annotations
```

### Update Annotation

```http
PUT /api/annotations/:annotationId
```

### Delete Annotation

```http
DELETE /api/annotations/:annotationId
```

### Get Annotation History

```http
GET /api/annotations/:annotationId/history
```

### Rate Annotation

```http
POST /api/annotations/:annotationId/rate
```

**Request Body:**
```json
{
  "rating": 1
}
```

Rating: `-1` (thumbs down) or `1` (thumbs up)

### Report Annotation

```http
POST /api/annotations/:annotationId/report
```

**Request Body:**
```json
{
  "reason": "This annotation is incorrect because..."
}
```

### Bulk Delete Annotations

```http
POST /api/annotations/bulk/delete
```

**Request Body:**
```json
{
  "annotationIds": ["ann_1", "ann_2", "ann_3"]
}
```

### Bulk Hide Annotations

```http
POST /api/annotations/bulk/hide
```

**Request Body:**
```json
{
  "annotationIds": ["ann_1", "ann_2"],
  "hidden": true
}
```

## Export

### Export Paper

```http
POST /api/papers/:paperId/export
```

**Request Body:**
```json
{
  "format": "markdown"
}
```

**Formats:** `json`, `markdown`, `notion`, `obsidian`, `html`

**Response:**
```json
{
  "format": "markdown",
  "content": "# Paper Title\n\n..."
}
```

### Generate Share Link

```http
POST /api/papers/:paperId/share
```

**Request Body:**
```json
{
  "expiresIn": 7
}
```

**Response:**
```json
{
  "shareLink": "https://example.com/share/abc123"
}
```

## Search

### Search

```http
POST /api/search
```

**Request Body:**
```json
{
  "query": "neural networks",
  "type": "papers",
  "filters": {},
  "page": 1,
  "limit": 20
}
```

**Types:** `papers`, `annotations`, `concepts`, `semantic`, `advanced`

### Get Search History

```http
GET /api/search/history?page=1&limit=10
```

### Save Search

```http
POST /api/search/save
```

**Request Body:**
```json
{
  "name": "My Search",
  "query": "neural networks",
  "filters": {}
}
```

### Get Saved Searches

```http
GET /api/search/saved
```

### Clear Search History

```http
DELETE /api/search/history
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common Status Codes:**
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "results": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```
