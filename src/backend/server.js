/**
 * Express Server for Orpheus TTS Reader
 *
 * API Routes:
 * - POST /api/convert - Start new conversion
 * - GET /api/conversions - Get all conversions
 * - GET /api/conversions/:id - Get specific conversion
 * - DELETE /api/conversions/:id - Delete conversion
 * - GET /api/conversions/:id/audio - Stream audio file
 * - GET /api/status/:jobId - Check job status
 * - GET /api/providers - Get available providers
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs/promises';

import { ProviderFactory } from './providers/index.js';
import { TextChunker } from './utils/chunker.js';
import { FileParser } from './utils/fileParser.js';
import { AudioProcessor } from './utils/audioProcessor.js';
import { getStorage } from './utils/storage.js';

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/public', express.static(path.join(__dirname, '../../public')));

// Configure multer for file uploads
const upload = multer({
  dest: './temp/uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.txt', '.md', '.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported: ${ext}`));
    }
  }
});

// In-memory job tracking
const jobs = new Map();

// ==================== API Routes ====================

/**
 * POST /api/convert
 * Start a new text-to-speech conversion
 */
app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    let text = req.body.text || '';
    const title = req.body.title || 'Untitled';
    const providerName = req.body.provider || process.env.DEFAULT_TTS_PROVIDER || 'segmind';

    // Get advanced TTS options
    const ttsOptions = {
      voice: req.body.voice || 'tara',
      temperature: parseFloat(req.body.temperature) || 0.6,
      top_p: parseFloat(req.body.top_p) || 0.95,
      max_new_tokens: parseInt(req.body.max_new_tokens) || 1200,
      repetition_penalty: parseFloat(req.body.repetition_penalty) || 1.1
    };

    // If file uploaded, extract text from it
    if (req.file) {
      const parser = new FileParser();
      text = await parser.parseFile(req.file.path);

      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: 'No text provided. Please provide text or upload a file.'
      });
    }

    // Create storage record
    const storage = getStorage();
    const conversion = await storage.saveConversion({
      title,
      text,
      status: 'processing',
      provider: providerName
    });

    // Start background job with TTS options
    processConversion(conversion.id, text, providerName, ttsOptions).catch(error => {
      console.error('Conversion error:', error);
      storage.updateConversion(conversion.id, {
        status: 'failed',
        error: error.message
      });
    });

    res.json({
      id: conversion.id,
      status: 'processing',
      message: 'Conversion started'
    });
  } catch (error) {
    console.error('Convert error:', error);
    res.status(500).json({
      error: error.message || 'Failed to start conversion'
    });
  }
});

/**
 * GET /api/conversions
 * Get all conversions with optional filtering
 */
app.get('/api/conversions', async (req, res) => {
  try {
    const storage = getStorage();
    const options = {
      status: req.query.status,
      search: req.query.search,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    };

    const conversions = await storage.getConversions(options);

    res.json({
      conversions,
      count: conversions.length
    });
  } catch (error) {
    console.error('Get conversions error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch conversions'
    });
  }
});

/**
 * GET /api/conversions/:id
 * Get a specific conversion
 */
app.get('/api/conversions/:id', async (req, res) => {
  try {
    const storage = getStorage();
    const conversion = await storage.getConversion(req.params.id);

    res.json(conversion);
  } catch (error) {
    console.error('Get conversion error:', error);
    res.status(404).json({
      error: error.message || 'Conversion not found'
    });
  }
});

/**
 * DELETE /api/conversions/:id
 * Delete a conversion
 */
app.delete('/api/conversions/:id', async (req, res) => {
  try {
    const storage = getStorage();
    await storage.deleteConversion(req.params.id);

    res.json({
      message: 'Conversion deleted successfully'
    });
  } catch (error) {
    console.error('Delete conversion error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete conversion'
    });
  }
});

/**
 * GET /api/conversions/:id/audio
 * Stream audio file
 */
app.get('/api/conversions/:id/audio', async (req, res) => {
  try {
    const storage = getStorage();
    const conversion = await storage.getConversion(req.params.id);

    if (!conversion.audioPath) {
      return res.status(404).json({
        error: 'Audio file not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(conversion.audioPath);
    } catch {
      return res.status(404).json({
        error: 'Audio file not found on disk'
      });
    }

    // Set headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="${conversion.title}.mp3"`);

    // Stream the file
    const fileStream = await fs.readFile(conversion.audioPath);
    res.send(fileStream);
  } catch (error) {
    console.error('Stream audio error:', error);
    res.status(500).json({
      error: error.message || 'Failed to stream audio'
    });
  }
});

/**
 * GET /api/status/:id
 * Check conversion status
 */
app.get('/api/status/:id', async (req, res) => {
  try {
    const storage = getStorage();
    const conversion = await storage.getConversion(req.params.id);

    const jobStatus = jobs.get(req.params.id) || {};

    res.json({
      id: conversion.id,
      status: conversion.status,
      title: conversion.title,
      progress: jobStatus.progress || 0,
      currentChunk: jobStatus.currentChunk || 0,
      totalChunks: jobStatus.totalChunks || 0,
      error: conversion.error
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(404).json({
      error: error.message || 'Conversion not found'
    });
  }
});

/**
 * GET /api/providers
 * Get available TTS providers
 */
app.get('/api/providers', (req, res) => {
  const providers = ProviderFactory.getAvailableProviders();

  res.json({
    providers: providers.map(name => ({
      name,
      available: !!process.env[`${name.toUpperCase()}_API_KEY`]
    })),
    default: process.env.DEFAULT_TTS_PROVIDER || 'deepinfra'
  });
});

/**
 * GET /api/stats
 * Get storage statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const storage = getStorage();
    const stats = await storage.getStats();

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get statistics'
    });
  }
});

// ==================== Background Processing ====================

/**
 * Process a conversion in the background
 */
async function processConversion(conversionId, text, providerName, ttsOptions = {}) {
  const storage = getStorage();

  try {
    // Get API key for provider
    const apiKeyEnvVar = `${providerName.toUpperCase()}_API_KEY`;
    const apiKey = process.env[apiKeyEnvVar];

    if (!apiKey) {
      throw new Error(`API key not configured for provider: ${providerName}`);
    }

    // Create provider
    const provider = ProviderFactory.createProvider(providerName, apiKey, {
      maxChunkSize: parseInt(process.env.MAX_CHUNK_SIZE) || 1000
    });

    // Chunk the text
    const chunker = new TextChunker(provider.getMaxChunkSize());
    const chunks = chunker.chunk(text);

    console.log(`Processing ${chunks.length} chunks for conversion ${conversionId}`);
    console.log(`TTS Options:`, ttsOptions);

    // Update job status
    jobs.set(conversionId, {
      totalChunks: chunks.length,
      currentChunk: 0,
      progress: 0
    });

    // Generate audio for each chunk with TTS options
    const audioBuffers = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Generating audio for chunk ${i + 1}/${chunks.length}`);

      const audioBuffer = await provider.generateSpeech(chunks[i], ttsOptions);
      audioBuffers.push(audioBuffer);

      // Update progress
      const progress = Math.round(((i + 1) / chunks.length) * 100);
      jobs.set(conversionId, {
        totalChunks: chunks.length,
        currentChunk: i + 1,
        progress
      });
    }

    // Concatenate audio buffers
    const audioPath = path.join('./conversions/audio', `${conversionId}.mp3`);
    const processor = new AudioProcessor();
    await processor.concatenateBuffers(audioBuffers, audioPath);

    // Get audio duration
    const duration = await processor.getDuration(audioPath);

    // Update conversion as completed
    await storage.updateConversion(conversionId, {
      status: 'completed',
      audioPath,
      duration,
      chunkCount: chunks.length
    });

    // Clean up job tracking
    jobs.delete(conversionId);

    console.log(`Conversion ${conversionId} completed successfully`);
  } catch (error) {
    console.error(`Conversion ${conversionId} failed:`, error);

    await storage.updateConversion(conversionId, {
      status: 'failed',
      error: error.message
    });

    jobs.delete(conversionId);

    throw error;
  }
}

// ==================== Serve Frontend ====================

app.get('/history', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/history.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==================== Error Handling ====================

app.use((err, req, res, next) => {
  console.error('Server error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ==================== Start Server ====================

app.listen(PORT, () => {
  const segmindStatus = process.env.SEGMIND_API_KEY ? '✓' : '✗';
  const deepinfraStatus = process.env.DEEPINFRA_API_KEY ? '✓' : '✗';
  const hfStatus = process.env.HF_API_KEY ? '✓' : '✗';

  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         Orpheus TTS Reader - Server Running              ║
║                                                          ║
║   URL: http://localhost:${PORT.toString().padEnd(4)}     ║
║                                                          ║
║   Providers configured:                                  ║
║   - Segmind: ${segmindStatus}                            ║
║   - DeepInfra: ${deepinfraStatus}                        ║
║   - Hugging Face: ${hfStatus}                            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;
