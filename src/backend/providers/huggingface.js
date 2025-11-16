/**
 * Hugging Face Inference API TTS Provider
 *
 * Implementation for Hugging Face Inference API
 * Can be configured to use different TTS models
 */

import fetch from 'node-fetch';
import { BaseTTSProvider } from './base.js';

export class HuggingFaceProvider extends BaseTTSProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, {
      maxChunkSize: 1000,
      model: 'facebook/mms-tts-eng', // Default English TTS model
      endpoint: 'https://api-inference.huggingface.co/models',
      ...config
    });

    this.modelEndpoint = `${this.config.endpoint}/${this.config.model}`;
  }

  getName() {
    return 'Hugging Face';
  }

  /**
   * Validate API key
   */
  async validateApiKey() {
    try {
      await this.generateSpeech('Test', { validate: true });
      return true;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        return false;
      }
      return true;
    }
  }

  /**
   * Generate speech using Hugging Face Inference API
   * @param {string} text - Text to convert
   * @param {Object} options - Generation options
   * @returns {Promise<Buffer>} - Audio buffer
   */
  async generateSpeech(text, options = {}) {
    const sanitizedText = this.sanitizeText(text);

    if (sanitizedText.length > this.config.maxChunkSize) {
      throw new Error(
        `Text exceeds maximum chunk size of ${this.config.maxChunkSize} characters`
      );
    }

    return this.retry(async () => {
      const response = await fetch(this.modelEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: sanitizedText,
          options: {
            wait_for_model: true,
            ...options
          }
        })
      });

      if (!response.ok) {
        const error = new Error(`Hugging Face API error: ${response.statusText}`);
        error.status = response.status;

        try {
          const errorData = await response.json();
          error.message = errorData.error || error.message;

          // Check if model is loading
          if (errorData.estimated_time) {
            error.estimatedTime = errorData.estimated_time;
            error.message = `Model is loading. Estimated time: ${errorData.estimated_time}s`;
          }
        } catch (e) {
          // If response is not JSON, use status text
        }

        throw error;
      }

      // Hugging Face returns audio as binary data
      const audioBuffer = await response.buffer();

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Received empty audio buffer from Hugging Face');
      }

      return audioBuffer;
    });
  }

  /**
   * Check model status
   * @returns {Promise<Object>} - Model status information
   */
  async checkModelStatus() {
    try {
      const response = await fetch(this.modelEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        return await response.json();
      }

      return { status: 'unknown' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * List available TTS models
   * @returns {Promise<Array>} - List of model IDs
   */
  static async listModels(apiKey) {
    const popularTTSModels = [
      'facebook/mms-tts-eng',
      'microsoft/speecht5_tts',
      'espnet/kan-bayashi_ljspeech_vits',
      'suno/bark',
      'facebook/fastspeech2-en-ljspeech'
    ];

    return popularTTSModels;
  }
}
