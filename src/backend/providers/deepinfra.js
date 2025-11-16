/**
 * DeepInfra Orpheus TTS Provider
 *
 * Implementation for the DeepInfra API using Orpheus TTS model
 * Model: canopylabs/orpheus-3b-0.1-ft
 */

import fetch from 'node-fetch';
import { BaseTTSProvider } from './base.js';

export class DeepInfraProvider extends BaseTTSProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, {
      maxChunkSize: 1000,
      model: 'canopylabs/orpheus-3b-0.1-ft',
      endpoint: 'https://api.deepinfra.com/v1/inference',
      ...config
    });

    this.modelEndpoint = `${this.config.endpoint}/${this.config.model}`;
  }

  getName() {
    return 'DeepInfra Orpheus';
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey() {
    try {
      await this.generateSpeech('Test', { validate: true });
      return true;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        return false;
      }
      // Other errors don't necessarily mean invalid key
      return true;
    }
  }

  /**
   * Generate speech using DeepInfra Orpheus API
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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          input: sanitizedText,
          // Add any model-specific parameters here
          ...options
        })
      });

      if (!response.ok) {
        const error = new Error(`DeepInfra API error: ${response.statusText}`);
        error.status = response.status;

        try {
          const errorData = await response.json();
          error.message = errorData.error || errorData.message || error.message;
        } catch (e) {
          // If response is not JSON, use status text
        }

        throw error;
      }

      // DeepInfra returns audio as binary data
      const audioBuffer = await response.buffer();

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Received empty audio buffer from DeepInfra');
      }

      return audioBuffer;
    });
  }

  /**
   * Get available voices (if supported by model)
   * @returns {Promise<Array>} - List of available voices
   */
  async getVoices() {
    // Orpheus model may have multiple voices - implement if available
    return ['default'];
  }

  /**
   * Estimate cost for text conversion
   * @param {string} text - Text to estimate
   * @returns {number} - Estimated cost in USD
   */
  estimateCost(text) {
    // DeepInfra pricing - update based on actual pricing
    const charactersPerDollar = 1000000; // Example: $1 per 1M characters
    return (text.length / charactersPerDollar).toFixed(4);
  }
}
