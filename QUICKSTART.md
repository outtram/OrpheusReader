# Quick Start Guide

Get up and running with Orpheus Reader in under 5 minutes!

## 1. Install Dependencies

```bash
npm install
```

## 2. Get Your API Key

Choose one provider (or both):

### Option A: DeepInfra (Recommended)
1. Visit https://deepinfra.com
2. Sign up for a free account
3. Go to API Keys section
4. Copy your API key

### Option B: Hugging Face
1. Visit https://huggingface.co
2. Sign up for a free account
3. Go to Settings → Access Tokens
4. Create a new token (read permissions)
5. Copy the token

## 3. Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env and paste your API key(s)
# Use any text editor:
nano .env
# or
code .env
```

**Minimal .env configuration:**
```env
DEEPINFRA_API_KEY=your_key_here
DEFAULT_TTS_PROVIDER=deepinfra
PORT=3000
```

## 4. Install FFmpeg (Optional but Recommended)

FFmpeg is used for seamless audio concatenation.

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

To verify installation:
```bash
ffmpeg -version
```

## 5. Start the Server

```bash
npm start
```

You should see:
```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         Orpheus TTS Reader - Server Running             ║
║                                                          ║
║   URL: http://localhost:3000                            ║
║                                                          ║
║   Providers configured:                                  ║
║   - DeepInfra: ✓                                         ║
║   - Hugging Face: ✗                                      ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

## 6. Open in Browser

Visit: **http://localhost:3000**

## 7. Create Your First Conversion

1. **Enter a title**: "Test Conversion"
2. **Paste some text** or click "Upload File" to test with a document
3. **Click "Generate Audio"**
4. **Wait for processing** (progress bar shows status)
5. **Listen to your audio!**

## Test Text Example

Copy and paste this test text:

```
Welcome to Orpheus Reader! This is a test conversion to demonstrate the text-to-speech capabilities.

The application uses advanced AI models to convert your written content into natural-sounding audio. Whether you're converting articles, blog posts, or entire books, Orpheus Reader makes it easy to listen on the go.

Try uploading different file formats like Markdown, PDF, or Word documents. The smart chunking algorithm ensures seamless audio playback even for long documents.
```

## Common First-Time Issues

### "API key not configured"
- Make sure you created a `.env` file (not `.env.example`)
- Verify the API key is correctly pasted with no extra spaces
- Restart the server after editing `.env`

### Port Already in Use
If port 3000 is taken:
```env
# In .env
PORT=3001
```

### "Cannot find module"
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

## Next Steps

- ✅ Create more conversions with your own content
- ✅ Visit the **History** page to manage conversions
- ✅ Try uploading different file formats (.pdf, .docx, .md)
- ✅ Experiment with both DeepInfra and Hugging Face providers
- ✅ Download audio files for offline listening

## Development Mode

For auto-reload during development:
```bash
npm run dev
```

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review the troubleshooting section
- Verify your API key is valid
- Check the terminal for error messages

---

**You're ready to go!** 🎉

Enjoy converting text to audio with Orpheus Reader.
