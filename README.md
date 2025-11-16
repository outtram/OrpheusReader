# Orpheus Reader - Text-to-Speech Web Application

A production-ready web application that converts text documents into high-quality audio using Orpheus TTS models. Features an Apple-inspired design with elegant aesthetics, intelligent text chunking, and seamless audio generation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

## Features

### Core Functionality
- **Multi-Format Support**: Upload `.txt`, `.md`, `.pdf`, or `.docx` files
- **Smart Text Chunking**: Intelligently splits long documents at sentence boundaries
- **Multi-Provider Architecture**: Support for DeepInfra (Orpheus) and Hugging Face APIs
- **Seamless Audio**: Concatenates chunks for smooth, uninterrupted playback
- **Conversion History**: File-based storage with search and filtering
- **Real-time Progress**: Live updates showing chunk processing status

### User Experience
- **Apple-Inspired Design**: Clean, minimalist interface with calming aesthetics
- **Drag-and-Drop Upload**: Intuitive file upload with visual feedback
- **In-Browser Playback**: Built-in audio player with download options
- **Responsive Layout**: Mobile-friendly design that works on all devices
- **Character Counter**: Live feedback on text length

### Technical Highlights
- **Provider Abstraction**: Easy to add new TTS providers
- **Error Handling**: Graceful failures with retry logic
- **Atomic Storage**: Safe file operations with JSON metadata
- **Audio Processing**: FFmpeg-based concatenation for professional quality

## Screenshots

### Homepage - Convert Text to Audio
Clean, focused interface for creating conversions:
- Title input for naming your audio
- Large textarea with character counter
- Drag-and-drop file upload
- Provider selection
- Real-time progress tracking

### History Page - Manage Conversions
View and manage all your conversions:
- Search and filter capabilities
- Sort by date or title
- Play, download, or delete conversions
- Storage statistics

## Installation

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **FFmpeg** (optional, for audio concatenation)
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt-get install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd OrpheusReader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:
   ```env
   # Required: At least one provider API key
   DEEPINFRA_API_KEY=your_deepinfra_api_key_here
   HF_API_KEY=your_huggingface_api_key_here

   # Optional: Customize settings
   DEFAULT_TTS_PROVIDER=deepinfra
   PORT=3000
   MAX_CHUNK_SIZE=1000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## Getting API Keys

### DeepInfra (Recommended)
1. Sign up at [deepinfra.com](https://deepinfra.com)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key to your `.env` file as `DEEPINFRA_API_KEY`

### Hugging Face
1. Sign up at [huggingface.co](https://huggingface.co)
2. Go to Settings → Access Tokens
3. Create a new token with read permissions
4. Copy the token to your `.env` file as `HF_API_KEY`

## Usage

### Converting Text to Audio

1. **Enter a title** for your conversion (e.g., "Article: AI in 2025")

2. **Choose input method**:
   - **Paste text**: Type or paste directly into the textarea
   - **Upload file**: Drag and drop or click to browse for `.txt`, `.md`, `.pdf`, or `.docx` files

3. **Select TTS provider** (DeepInfra or Hugging Face)

4. **Click "Generate Audio"**
   - Progress bar shows real-time status
   - View which chunk is being processed
   - Estimated completion percentage

5. **Listen or download**
   - Audio plays automatically when ready
   - Download as MP3 for offline listening
   - Access from History page anytime

### Managing Conversions

Visit the **History** page to:
- **Search**: Find conversions by title or content
- **Filter**: Show only completed, processing, or failed conversions
- **Sort**: By newest, oldest, or alphabetically
- **Play**: Listen directly in the browser
- **Download**: Save MP3 files locally
- **Delete**: Remove unwanted conversions

## Architecture

### Project Structure

```
OrpheusReader/
├── src/
│   ├── backend/
│   │   ├── server.js              # Express server & API routes
│   │   ├── providers/
│   │   │   ├── base.js            # Abstract TTS provider class
│   │   │   ├── deepinfra.js       # DeepInfra implementation
│   │   │   ├── huggingface.js     # Hugging Face implementation
│   │   │   └── index.js           # Provider factory
│   │   └── utils/
│   │       ├── chunker.js         # Smart text chunking algorithm
│   │       ├── fileParser.js      # Multi-format file parsing
│   │       ├── audioProcessor.js  # Audio concatenation
│   │       └── storage.js         # JSON-based storage system
│   └── frontend/
│       ├── index.html             # Homepage
│       ├── history.html           # History page
│       ├── styles.css             # Apple-inspired design system
│       └── app.js                 # Frontend JavaScript
├── conversions/
│   ├── audio/                     # Generated audio files
│   └── metadata.json              # Conversion history
├── public/
│   └── assets/                    # Static assets (icons, images)
├── .env                           # Environment configuration
├── .env.example                   # Environment template
├── package.json                   # Dependencies & scripts
└── README.md                      # This file
```

### API Endpoints

#### Conversions
- `POST /api/convert` - Start new conversion
  - Body: `{ title, text?, file?, provider }`
  - Returns: `{ id, status, message }`

- `GET /api/conversions` - List all conversions
  - Query params: `status`, `search`, `sortBy`, `sortOrder`, `limit`, `offset`
  - Returns: `{ conversions, count }`

- `GET /api/conversions/:id` - Get specific conversion
  - Returns: Conversion object with metadata

- `DELETE /api/conversions/:id` - Delete conversion
  - Returns: `{ message }`

- `GET /api/conversions/:id/audio` - Stream audio file
  - Returns: MP3 audio stream

#### Status & Info
- `GET /api/status/:id` - Check conversion status
  - Returns: `{ id, status, progress, currentChunk, totalChunks }`

- `GET /api/providers` - List available providers
  - Returns: `{ providers, default }`

- `GET /api/stats` - Get storage statistics
  - Returns: `{ totalConversions, totalDuration, totalSize, ... }`

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEEPINFRA_API_KEY` | DeepInfra API key | - |
| `HF_API_KEY` | Hugging Face API key | - |
| `DEFAULT_TTS_PROVIDER` | Default provider (`deepinfra` or `huggingface`) | `deepinfra` |
| `PORT` | Server port | `3000` |
| `MAX_CHUNK_SIZE` | Maximum characters per TTS request | `1000` |
| `AUDIO_FORMAT` | Output audio format | `mp3` |
| `AUDIO_SAMPLE_RATE` | Audio sample rate (Hz) | `24000` |

### Text Chunking

The smart chunking algorithm:
1. Splits at **paragraph boundaries** when possible
2. Falls back to **sentence boundaries** for long paragraphs
3. Uses **word boundaries** for extremely long sentences
4. Never exceeds the provider's character limit
5. Preserves context for natural-sounding audio

### Adding New TTS Providers

1. Create a new provider class in `src/backend/providers/`
   ```javascript
   import { BaseTTSProvider } from './base.js';

   export class MyProvider extends BaseTTSProvider {
     constructor(apiKey, config) {
       super(apiKey, config);
     }

     async generateSpeech(text, options) {
       // Implementation
     }

     // ... other required methods
   }
   ```

2. Register in `src/backend/providers/index.js`
   ```javascript
   import { MyProvider } from './myprovider.js';

   export class ProviderFactory {
     static providers = {
       // ... existing providers
       myprovider: MyProvider
     };
   }
   ```

3. Add API key to `.env`
   ```env
   MYPROVIDER_API_KEY=your_key_here
   ```

## Troubleshooting

### Common Issues

**Issue**: "API key not configured"
- **Solution**: Ensure you've copied `.env.example` to `.env` and added your API keys

**Issue**: "FFmpeg not found" warning
- **Solution**: Install FFmpeg or the app will use fallback concatenation (may not work for all audio formats)

**Issue**: "File too large" error
- **Solution**: Maximum file size is 10MB. Split large documents into smaller files

**Issue**: Audio has gaps or breaks
- **Solution**: Ensure FFmpeg is installed for proper concatenation. Check that chunks aren't breaking mid-sentence.

**Issue**: "Failed to parse PDF"
- **Solution**: Some PDFs with images-only or complex layouts may not extract text properly. Try converting to TXT or DOCX first.

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development npm start
```

Check logs in the terminal for detailed error messages and API responses.

## Performance Tips

1. **Optimize chunk size**: Adjust `MAX_CHUNK_SIZE` based on your provider's limits
2. **Use DeepInfra**: Generally faster than Hugging Face for Orpheus models
3. **Pre-process large files**: Clean up unnecessary formatting before upload
4. **Monitor API limits**: Most providers have rate limits; space out large conversions

## Development

### Running Tests
```bash
npm test
```

### Code Style
This project follows:
- ES6+ JavaScript with modules
- Consistent indentation (2 spaces)
- JSDoc comments for functions
- Descriptive variable and function names

### Contributing
Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Test thoroughly
5. Submit a pull request

## Security Considerations

- **API Keys**: Never commit `.env` file or expose API keys
- **File Upload**: Validated file types and size limits (10MB max)
- **Sanitization**: All text input is sanitized before processing
- **Storage**: Conversion history stored locally, not sent to third parties

## License

MIT License - see LICENSE file for details

## Acknowledgments

- **Orpheus TTS**: High-quality text-to-speech model by Canopy Labs
- **DeepInfra**: Fast, reliable inference API
- **Hugging Face**: Open-source model hosting and inference
- **FFmpeg**: Audio processing excellence
- **Apple**: Design inspiration for clean, user-friendly interfaces

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing issues for solutions
- Consult the troubleshooting section above

---

Built with ❤️ for seamless text-to-audio conversion

**Version**: 1.0.0
**Last Updated**: 2025
