import { BaseTTSProvider } from './base.js';
import fetch from 'node-fetch';

/**
 * Segmind Orpheus TTS Provider
 *
 * Implements the Segmind Orpheus 3B TTS API
 * Endpoint: https://api.segmind.com/v1/orpheus-3b-0.1
 *
 * Features:
 * - Synchronous audio generation (no polling)
 * - Direct binary audio response
 * - Configurable voice, temperature, and other parameters
 * - Character limit based on max_new_tokens (100-2000)
 */
export class SegmindProvider extends BaseTTSProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    this.name = 'Segmind';
    this.endpoint = 'https://api.segmind.com/v1/orpheus-3b-0.1';
    this.maxCharacters = 1500; // Conservative estimate based on token limits
  }

  /**
   * Generate speech from text using Segmind Orpheus TTS
   *
   * @param {string} text - Text to convert to speech
   * @param {Object} options - Generation options
   * @param {string} options.voice - Voice to use (default: 'dan')
   * @param {number} options.temperature - Temperature (0.1-1.5, default: 0.6)
   * @param {number} options.top_p - Top P sampling (0.1-1, default: 0.95)
   * @param {number} options.max_new_tokens - Max tokens (100-2000, default: 1200)
   * @param {number} options.repetition_penalty - Repetition penalty (1-2, default: 1.1)
   * @returns {Promise<Buffer>} Audio data as Buffer
   */
  async generateSpeech(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('Segmind API key is required');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (text.length > this.maxCharacters) {
      throw new Error(`Text exceeds maximum length of ${this.maxCharacters} characters`);
    }

    const payload = {
      text: text.trim(),
      voice: options.voice || 'dan',
      temperature: options.temperature || 0.6,
      top_p: options.top_p || 0.95,
      max_new_tokens: options.max_new_tokens || 1200,
      repetition_penalty: options.repetition_penalty || 1.1
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Handle error responses
      if (!response.ok) {
        const errorText = await response.text();

        switch (response.status) {
          case 400:
            throw new Error(`Invalid parameters: ${errorText}`);
          case 401:
            throw new Error('Invalid or missing API key');
          case 404:
            throw new Error('Model not found');
          case 406:
            throw new Error('Insufficient credits in your Segmind account');
          case 429:
            throw new Error('Rate limit exceeded. Please try again later.');
          case 500:
            throw new Error(`Server error: ${errorText}`);
          default:
            throw new Error(`API error (${response.status}): ${errorText}`);
        }
      }

      // Get audio data as buffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Received empty audio response');
      }

      return audioBuffer;

    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Unable to connect to Segmind API. Please check your internet connection.');
      }

      throw error;
    }
  }

  /**
   * Get the maximum character limit for this provider
   *
   * @returns {number} Maximum characters per request
   */
  getMaxCharacters() {
    return this.maxCharacters;
  }

  /**
   * Validate API key by making a test request
   *
   * @returns {Promise<boolean>} True if API key is valid
   */
  async validateApiKey() {
    try {
      // Test with minimal text
      await this.generateSpeech('Test', { max_new_tokens: 100 });
      return true;
    } catch (error) {
      if (error.message.includes('Invalid or missing API key')) {
        return false;
      }
      // Other errors don't necessarily mean the API key is invalid
      return true;
    }
  }

  /**
   * Get available voices for this provider
   *
   * @returns {Array<string>} List of available voice names
   */
  getAvailableVoices() {
    // Based on the API documentation, 'dan' is the default
    // Additional voices may be available - check Segmind docs
    return ['dan'];
  }

  /**
   * Get provider-specific settings and their defaults
   *
   * @returns {Object} Settings configuration
   */
  getSettings() {
    return {
      voice: {
        type: 'string',
        default: 'dan',
        options: this.getAvailableVoices(),
        description: 'Voice to use for speech generation'
      },
      temperature: {
        type: 'number',
        default: 0.6,
        min: 0.1,
        max: 1.5,
        step: 0.1,
        description: 'Controls randomness in generation. Lower is more deterministic.'
      },
      top_p: {
        type: 'number',
        default: 0.95,
        min: 0.1,
        max: 1.0,
        step: 0.05,
        description: 'Nucleus sampling parameter. Lower values are more focused.'
      },
      max_new_tokens: {
        type: 'integer',
        default: 1200,
        min: 100,
        max: 2000,
        step: 100,
        description: 'Maximum number of tokens to generate'
      },
      repetition_penalty: {
        type: 'number',
        default: 1.1,
        min: 1.0,
        max: 2.0,
        step: 0.1,
        description: 'Penalty for repeating tokens. Higher values reduce repetition.'
      }
    };
  }
}

export default SegmindProvider;
