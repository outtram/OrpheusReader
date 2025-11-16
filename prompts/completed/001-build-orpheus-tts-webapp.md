# Build Orpheus Text-to-Speech Web Application

<objective>
Build a production-ready text-to-speech web application that converts text documents into high-quality audio using Orpheus TTS models. The application should provide a seamless, Apple-inspired user experience with elegant design, calming aesthetics, and intelligent handling of long-form content.

This is for personal use to convert articles, documents, and text content into audio for listening on the go. The end goal is a polished, professional web app that feels premium and is enjoyable to use daily.
</objective>

<context>
The Orpheus TTS models (via DeepInfra/Hugging Face) have token/character limits per request, so long documents must be intelligently chunked. The application needs to handle various input formats (paste, txt, md, pdf, docx), process them efficiently, and maintain a history of conversions for easy retrieval.

Design inspiration: Apple.com's clean, minimalist aesthetic with generous whitespace, smooth animations, high-quality typography (San Francisco/Inter font), and calming color palette (soft blues, grays, whites).

Thoroughly analyze the requirements and consider multiple approaches for text chunking, audio generation, and provider abstraction to create the most robust solution.
</context>

<requirements>

## Functional Requirements

1. **Text Input Methods**
   - Large textarea for paste/typing with live character count
   - File upload supporting: .txt, .md, .pdf, .docx
   - Title field for naming conversions
   - File parsing to extract clean text from all supported formats

2. **Multi-Provider TTS Architecture**
   - Support for DeepInfra Orpheus API (canopylabs/orpheus-3b-0.1-ft)
   - Support for Hugging Face Inference API
   - Provider abstraction layer for easy switching/fallback
   - API key configuration (environment variables)

3. **Intelligent Text Processing**
   - Smart chunking algorithm that respects:
     - Sentence boundaries (don't break mid-sentence)
     - Paragraph boundaries (prefer paragraph breaks)
     - Character limits per TTS provider
   - Streaming approach (experimental): Generate audio chunks and stream as available
   - Chunking approach (primary): Generate all chunks, concatenate audio files

4. **Audio Generation & Management**
   - Queue system for processing multiple chunks
   - Progress indicator showing chunk X of Y
   - Audio concatenation for seamless playback
   - Download option for final audio file (MP3/WAV)
   - In-browser audio player with controls

5. **Conversion History**
   - File-based storage using JSON for metadata:
     - Conversion ID, title, original text, timestamp, audio file path, status
   - Store audio files in `./conversions/audio/` directory
   - History page showing all past conversions
   - Search/filter conversions by title or date
   - Re-download or replay any conversion
   - Delete conversions

6. **User Interface (Apple-inspired Design)**
   - Typography: Inter or SF Pro Display font
   - Color palette: Soft blues (#007AFF accent), grays (#F5F5F7 background, #1D1D1F text), pure whites
   - Layout: Generous whitespace, centered content (max-width ~1200px), clean sections
   - Animations: Smooth transitions (ease-in-out), subtle hover effects, loading animations
   - Components:
     - Hero section on homepage with clear CTA
     - Card-based conversion history
     - Glassmorphism effects (optional, tasteful)
     - Responsive design (mobile-friendly)

## Technical Requirements

1. **Tech Stack** (Select optimal based on requirements)
   - Consider: Next.js/React, Vite + React, or vanilla HTML/JS
   - Backend: Node.js/Express or Python Flask/FastAPI
   - File parsing: pdf-parse, mammoth (docx), markdown parsers
   - Audio: FFmpeg for concatenation, Web Audio API for playback

2. **File Structure**
   ```
   ./
   ├── src/
   │   ├── frontend/      # UI components
   │   ├── backend/       # API routes, TTS logic
   │   ├── utils/         # Text chunking, file parsing
   │   └── providers/     # TTS provider implementations
   ├── conversions/
   │   ├── audio/         # Generated audio files
   │   └── metadata.json  # Conversion history
   ├── public/            # Static assets
   └── config/            # Environment config
   ```

3. **Configuration**
   - `.env` file for API keys (DEEPINFRA_API_KEY, HF_API_KEY)
   - Provider selection and fallback logic
   - Chunk size configuration per provider

</requirements>

<implementation>

## Design Principles

1. **Why Apple-inspired?** The calming, premium aesthetic reduces cognitive load and makes daily use pleasant. Clean design ensures focus on content, not interface.

2. **Why file-based storage?** Simpler setup with no database dependencies, easier to backup/restore, sufficient for personal use. Each conversion is self-contained.

3. **Why both chunking and streaming?** Chunking is reliable and proven (primary approach). Streaming provides better UX for long documents but is more complex (experimental feature to iterate on).

## Implementation Steps

1. **Project Setup**
   - Initialize project with chosen tech stack
   - Set up file structure as outlined above
   - Install dependencies (TTS clients, file parsers, audio tools)
   - Create `.env.example` with required keys

2. **TTS Provider Abstraction**
   - Create base provider interface/class
   - Implement DeepInfra Orpheus provider
   - Implement Hugging Face provider
   - Add provider factory/selector logic
   - Include error handling and rate limiting

3. **Text Processing Engine**
   - Build file upload handler for each format (txt, md, pdf, docx)
   - Implement smart chunking algorithm:
     - Detect sentence boundaries (period, question mark, exclamation)
     - Prefer paragraph breaks when near chunk limit
     - Ensure no chunk exceeds provider's character limit
     - Maintain context across chunks (optional: small overlap)
   - Add text preprocessing (clean special characters, handle formatting)

4. **Audio Generation System**
   - Create job queue for processing chunks sequentially
   - Implement progress tracking (emit events for UI updates)
   - Generate audio for each chunk via selected provider
   - Concatenate chunks using FFmpeg or audio libraries
   - Save final audio file with unique ID
   - (Experimental) Implement streaming: generate and stream chunks as ready

5. **Storage System**
   - Design JSON schema for metadata.json:
     ```json
     {
       "conversions": [
         {
           "id": "uuid",
           "title": "Article Title",
           "text": "Original text...",
           "audioPath": "./conversions/audio/uuid.mp3",
           "createdAt": "ISO timestamp",
           "duration": 123.45,
           "status": "completed|processing|failed"
         }
       ]
     }
     ```
   - Create utility functions: saveConversion, getConversions, deleteConversion
   - Ensure atomic file writes (temp file + rename)

6. **Frontend - Homepage**
   - Apple-style hero section: Large heading, subheading, gradient background
   - Input section:
     - Title input (clean, minimal design)
     - Textarea with placeholder text, character counter
     - File upload drop zone (drag-and-drop + click to browse)
     - Provider selector (dropdown, subtle)
     - Large "Generate Audio" CTA button (blue accent, rounded)
   - Progress section (appears when processing):
     - Progress bar with smooth animation
     - Status text: "Processing chunk 3 of 12..."
     - Cancel button
   - Result section:
     - Audio player (custom-styled, Apple-like controls)
     - Download button
     - Save to history confirmation

7. **Frontend - History Page**
   - Card grid layout (responsive, 2-3 columns)
   - Each card shows:
     - Title, date, duration
     - Play button (inline mini-player)
     - Download and delete icons
   - Search bar at top (live filter)
   - Sort options: newest, oldest, title A-Z
   - Empty state: Beautiful illustration + "No conversions yet" message

8. **Styling (Apple Aesthetic)**
   - Use Inter or SF Pro font (import from Google Fonts or local)
   - CSS variables for color palette:
     ```css
     --color-bg: #F5F5F7;
     --color-surface: #FFFFFF;
     --color-text: #1D1D1F;
     --color-text-secondary: #6E6E73;
     --color-accent: #007AFF;
     --color-accent-hover: #0051D5;
     --border-radius: 12px;
     --spacing-unit: 8px;
     ```
   - Smooth transitions: `transition: all 0.3s ease-in-out;`
   - Box shadows: Subtle, soft shadows for depth
   - Hover effects: Slight scale/opacity changes
   - Loading animations: Skeleton screens or elegant spinners

9. **API Routes**
   - POST `/api/convert` - Start new conversion
   - GET `/api/conversions` - Fetch history
   - GET `/api/conversions/:id` - Get specific conversion
   - DELETE `/api/conversions/:id` - Delete conversion
   - GET `/api/conversions/:id/audio` - Stream audio file
   - GET `/api/status/:jobId` - Check processing status (for long-running jobs)

10. **Error Handling & Edge Cases**
    - File too large: Warn user, suggest chunking
    - Invalid file format: Clear error message
    - API failures: Retry logic, fallback to alternate provider
    - Quota exceeded: Graceful error, suggest waiting
    - Network issues: Offline detection, queue for later
    - Corrupted audio: Validation, re-generate if needed

## What to Avoid (and Why)

- **Don't use complex databases**: File-based is simpler for this use case and avoids setup/maintenance overhead
- **Don't over-engineer the UI**: Apple's design strength is restraint. Avoid excessive animations, gradients, or effects that distract
- **Don't ignore accessibility**: Even with focus on aesthetics, ensure proper ARIA labels, keyboard navigation, and screen reader support matter for inclusive design
- **Don't hardcode provider logic**: Abstract it for easy switching/testing, as TTS providers may change or need fallbacks
- **Never break mid-sentence**: This creates jarring audio transitions. Always chunk at natural boundaries for better listening experience

</implementation>

<output>

Create the following file structure with relative paths:

- `./package.json` - Dependencies and scripts
- `./src/backend/server.js` - Express/Node server with API routes
- `./src/backend/providers/base.js` - Base TTS provider class
- `./src/backend/providers/deepinfra.js` - DeepInfra Orpheus implementation
- `./src/backend/providers/huggingface.js` - Hugging Face implementation
- `./src/backend/utils/chunker.js` - Smart text chunking algorithm
- `./src/backend/utils/fileParser.js` - File upload and text extraction
- `./src/backend/utils/audioProcessor.js` - Audio concatenation logic
- `./src/backend/utils/storage.js` - JSON file-based storage operations
- `./src/frontend/index.html` - Homepage with Apple-inspired design
- `./src/frontend/history.html` - Conversion history page
- `./src/frontend/styles.css` - Global styles with Apple aesthetic
- `./src/frontend/app.js` - Frontend JavaScript (API calls, UI updates)
- `./public/assets/` - Any icons, images, or static files
- `./.env.example` - Template for environment variables
- `./README.md` - Setup instructions, API documentation, usage guide
- `./conversions/metadata.json` - Initial empty conversion history

If using a framework like Next.js/React, adapt the structure accordingly but maintain the separation of concerns.

</output>

<verification>

Before declaring complete, verify your work:

1. **Test text chunking**: Create a sample 5000-character document, verify it chunks at sentence boundaries and respects limits
2. **Test file upload**: Upload each file type (txt, md, pdf, docx), confirm text extraction works
3. **Test API integration**: Make a test call to chosen TTS provider with a small chunk, verify audio is generated
4. **Test audio concatenation**: Generate 3 chunks, concatenate, verify seamless playback
5. **Test storage**: Create conversion, save to metadata.json, retrieve, delete - verify data integrity
6. **Test UI responsiveness**: Check mobile, tablet, desktop layouts
7. **Test error handling**: Try invalid files, missing API keys, network failures
8. **Visual review**: Compare UI against Apple.com for spacing, typography, color accuracy

Run a full end-to-end test:
- Upload a markdown file with 2000+ characters
- Verify it processes, chunks correctly, generates audio
- Check history page shows the conversion
- Download and play the audio file
- Delete the conversion successfully

</verification>

<success_criteria>

The implementation is successful when:

1. ✅ Users can paste text or upload files (txt, md, pdf, docx) and get high-quality audio
2. ✅ Long documents (>2000 chars) are intelligently chunked without breaking sentences
3. ✅ Audio plays seamlessly (no gaps or breaks between chunks)
4. ✅ History page displays all conversions with search/filter
5. ✅ UI matches Apple's aesthetic: clean, calming, professional
6. ✅ Application works with both DeepInfra and Hugging Face providers
7. ✅ Error handling is graceful with clear user feedback
8. ✅ File-based storage persists conversions reliably
9. ✅ README provides clear setup instructions for running the app
10. ✅ Code is well-organized, commented, and maintainable

</success_criteria>

<extended_thinking>

For maximum efficiency, whenever you need to perform multiple independent operations (like reading example APIs, checking package availability, or creating separate utility files), invoke all relevant tools simultaneously rather than sequentially.

After receiving tool results, carefully reflect on their quality—especially for the chunking algorithm and provider implementations—and determine optimal next steps before proceeding. The chunking logic is critical to user experience, so consider edge cases like varying sentence lengths, special characters, and formatting.

Deeply consider the trade-offs between different tech stacks before selecting one. For this use case, consider:
- Next.js: Great DX, built-in API routes, but more complex setup
- Vite + React: Lighter, faster, but needs separate backend
- Vanilla HTML/JS + Express: Simplest, easiest to understand, but less modern tooling

Choose based on what will deliver the best user experience while remaining maintainable for a solo developer.

</extended_thinking>
