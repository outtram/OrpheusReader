# Orpheus Reader - Architecture Documentation

## Overview

Orpheus Reader is a full-stack web application built with a clean separation between frontend and backend, using file-based storage for simplicity and reliability.

## Technology Stack

### Backend
- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **File Processing**: pdf-parse, mammoth, marked
- **Audio Processing**: FFmpeg (optional but recommended)
- **HTTP Client**: node-fetch

### Frontend
- **Vanilla JavaScript** (ES6+)
- **HTML5** with semantic markup
- **CSS3** with custom properties (CSS variables)
- **Inter/SF Pro** typography for Apple-like aesthetics

### Storage
- **File-based JSON** for metadata
- **Local filesystem** for audio files
- **No database required** - perfect for personal use

## Architecture Layers

### 1. Provider Abstraction Layer

**Location**: `src/backend/providers/`

The provider layer uses the **Abstract Factory Pattern** to enable easy switching between TTS providers.

```
BaseTTSProvider (abstract)
    ↓
    ├── DeepInfraProvider
    ├── HuggingFaceProvider
    └── [Future providers...]
```

**Key Features**:
- Unified interface for all providers
- Built-in retry logic with exponential backoff
- Text sanitization before sending to APIs
- Provider-specific configuration

**Adding New Providers**:
1. Extend `BaseTTSProvider`
2. Implement required methods: `generateSpeech()`, `validateApiKey()`, `getName()`
3. Register in `ProviderFactory`

### 2. Text Processing Pipeline

**Location**: `src/backend/utils/`

#### Chunking Algorithm (`chunker.js`)

The smart chunking algorithm follows this priority:
1. **Paragraph boundaries** (ideal for natural breaks)
2. **Sentence boundaries** (maintains context)
3. **Word boundaries** (last resort for very long sentences)
4. **Character split** (extreme edge case)

```
Input Text
    ↓
Split into Paragraphs
    ↓
For each paragraph:
    ├─ Fits in chunk? → Add to current chunk
    ├─ Too long? → Split by sentences
    └─ Sentence too long? → Split by words
    ↓
Validate all chunks ≤ maxChunkSize
    ↓
Return chunks[]
```

**Example**:
- Input: 2000 character article
- Max chunk size: 1000
- Output: 2-3 chunks split at paragraph/sentence boundaries
- Result: Seamless audio playback with no jarring transitions

#### File Parser (`fileParser.js`)

Supports multiple formats with format-specific extraction:

| Format | Library | Features |
|--------|---------|----------|
| `.txt` | Native fs | Direct read, UTF-8 encoding |
| `.md` | marked | Strips markdown syntax, preserves text |
| `.pdf` | pdf-parse | Extracts text from all pages |
| `.docx` | mammoth | Extracts text, handles formatting |

**Parsing Pipeline**:
```
File Upload
    ↓
Detect extension
    ↓
Select appropriate parser
    ↓
Extract raw text
    ↓
Clean & normalize
    ↓
Return clean text
```

#### Audio Processor (`audioProcessor.js`)

Handles audio concatenation with FFmpeg integration:

```
Audio Buffers[]
    ↓
Save each as temp file
    ↓
FFmpeg concat demuxer
    ↓
Single seamless MP3
    ↓
Clean up temp files
```

**Fallback**: If FFmpeg unavailable, uses simple binary concatenation (limited compatibility).

### 3. Storage System

**Location**: `src/backend/utils/storage.js`

**Design Pattern**: Singleton with atomic file operations

```json
// conversions/metadata.json
{
  "conversions": [
    {
      "id": "uuid-v4",
      "title": "Article Title",
      "text": "Original text...",
      "audioPath": "./conversions/audio/uuid.mp3",
      "createdAt": "2025-11-16T22:00:00.000Z",
      "duration": 123.45,
      "status": "completed",
      "provider": "deepinfra",
      "chunkCount": 3,
      "characterCount": 2000
    }
  ]
}
```

**Atomic Writes**:
1. Write to `.tmp` file
2. Rename to actual file (atomic operation)
3. Prevents corruption if process interrupted

### 4. API Layer

**Location**: `src/backend/server.js`

RESTful API with clear resource boundaries:

```
POST   /api/convert              → Start conversion
GET    /api/conversions          → List all
GET    /api/conversions/:id      → Get one
DELETE /api/conversions/:id      → Delete one
GET    /api/conversions/:id/audio → Stream audio
GET    /api/status/:id           → Check progress
GET    /api/providers            → List providers
GET    /api/stats                → Get statistics
```

**Request Flow**:
```
Client Request
    ↓
Express Middleware
    ↓
Route Handler
    ↓
Business Logic (utils/providers)
    ↓
Storage Layer
    ↓
Response
```

### 5. Frontend Architecture

**Location**: `src/frontend/`

**Pattern**: Progressive enhancement with vanilla JavaScript

```
HTML (Structure)
    ↓
CSS (Apple-inspired design system)
    ↓
JavaScript (Behavior & API calls)
```

#### Design System (`styles.css`)

Based on CSS custom properties for easy theming:

```css
:root {
  --color-accent: #007AFF;      /* iOS blue */
  --color-bg: #F5F5F7;          /* Apple gray */
  --font-family: 'Inter', ...;  /* Modern sans-serif */
  --radius-md: 12px;            /* Rounded corners */
  --shadow-md: ...;             /* Subtle depth */
}
```

**Component Library**:
- Cards
- Buttons (primary, secondary, icon)
- Form elements
- Progress bars
- Status badges
- Audio player

#### State Management (`app.js`)

Simple state management without frameworks:

```javascript
// Global state
let currentConversionId = null;
let currentFile = null;
let statusCheckInterval = null;

// Event-driven updates
Form Submit → API Call → Poll Status → Update UI
```

**Progress Polling**:
```
Submit Form
    ↓
Receive conversion ID
    ↓
Poll /api/status/:id every 2s
    ↓
Update progress bar
    ↓
On complete: Load audio
```

## Data Flow

### Complete Conversion Flow

```
1. User Input
   ├─ Paste text OR upload file
   └─ Enter title, select provider

2. Frontend (app.js)
   ├─ Validate input
   ├─ Create FormData
   └─ POST /api/convert

3. Backend (server.js)
   ├─ Parse file (if uploaded)
   ├─ Create conversion record
   └─ Start background job

4. Background Processing
   ├─ Get TTS provider instance
   ├─ Chunk text (chunker.js)
   ├─ Generate audio for each chunk
   ├─ Concatenate chunks (audioProcessor.js)
   ├─ Save MP3 file
   └─ Update conversion status

5. Status Polling
   ├─ Frontend polls /api/status/:id
   ├─ Backend returns progress
   └─ UI updates in real-time

6. Completion
   ├─ Status changes to "completed"
   ├─ Frontend loads audio player
   └─ User can play/download
```

## Security Considerations

### Input Validation
- File type whitelist (`.txt`, `.md`, `.pdf`, `.docx`)
- File size limit (10MB)
- Text sanitization before TTS processing

### API Security
- API keys stored in environment variables
- Never exposed to frontend
- CORS configured for same-origin

### File Storage
- UUIDs prevent path traversal
- Audio files isolated in dedicated directory
- Atomic writes prevent corruption

### Error Handling
- Graceful degradation on API failures
- Retry logic with exponential backoff
- User-friendly error messages

## Performance Optimizations

### Backend
1. **Streaming**: File uploads use streams (multer)
2. **Concurrent Processing**: Chunks processed sequentially but efficiently
3. **Caching**: Provider instances reused within request

### Frontend
1. **Lazy Loading**: Audio only loaded when conversion complete
2. **Debouncing**: Character counter updates throttled
3. **Efficient DOM Updates**: Minimal re-renders

### Storage
1. **Atomic Operations**: Prevents file corruption
2. **Minimal I/O**: JSON read/write only when needed
3. **No Database Overhead**: Simple file system operations

## Scalability Considerations

### Current Design (Personal Use)
- **Single server**: Express handles all requests
- **File-based storage**: Simple, reliable, easy backup
- **Sequential processing**: One conversion at a time per user

### Future Scaling Options

If needed for multi-user deployment:

1. **Job Queue**: Add Redis/Bull for background jobs
2. **Database**: Migrate to PostgreSQL/MongoDB for metadata
3. **Object Storage**: Use S3/MinIO for audio files
4. **Load Balancing**: Multiple server instances
5. **Caching**: Redis for frequent conversions

**Note**: Current architecture is intentionally simple for personal use. Scaling can be added incrementally.

## Testing Strategy

### Manual Testing Checklist
- [ ] Short text (< 500 chars)
- [ ] Long text (> 2000 chars)
- [ ] Each file format (.txt, .md, .pdf, .docx)
- [ ] Both providers (DeepInfra, Hugging Face)
- [ ] Audio playback quality
- [ ] Download functionality
- [ ] Search/filter in history
- [ ] Delete conversions
- [ ] Mobile responsiveness

### Automated Testing (Future)
- Unit tests for chunker algorithm
- Integration tests for API endpoints
- E2E tests with Playwright/Cypress

## Deployment

### Local Deployment
```bash
npm install
cp .env.example .env
# Add API keys
npm start
```

### Production Deployment Options

1. **VPS (DigitalOcean, Linode)**
   - Install Node.js, FFmpeg
   - Clone repo, install deps
   - Use PM2 for process management
   - Nginx reverse proxy

2. **Docker**
   - Create Dockerfile
   - Build image with Node + FFmpeg
   - Docker Compose for easy deployment

3. **Serverless (with modifications)**
   - Convert to serverless functions
   - Use cloud storage for audio
   - Add job queue for long processing

## Monitoring & Maintenance

### Logs
- Server logs to stdout (use PM2/systemd for persistence)
- Error tracking in terminal
- Conversion history in `metadata.json`

### Backups
- Backup `conversions/` directory regularly
- `metadata.json` contains all conversion info
- Audio files can be regenerated if needed

### Updates
- Check for dependency updates: `npm outdated`
- Update providers if APIs change
- Monitor API rate limits

## Future Enhancements

### Potential Features
1. **Voice Selection**: Multiple voices per provider
2. **Speed Control**: Playback speed adjustment
3. **Batch Processing**: Upload multiple files
4. **Scheduled Conversions**: Queue for later
5. **Export Options**: More formats (WAV, OGG)
6. **Sharing**: Generate shareable links
7. **Analytics**: Track most converted content
8. **Mobile App**: React Native wrapper

### Code Improvements
1. Add TypeScript for type safety
2. Implement comprehensive test suite
3. Add API documentation (Swagger)
4. Create Docker configuration
5. Add CI/CD pipeline

---

**Last Updated**: November 2025
**Version**: 1.0.0
