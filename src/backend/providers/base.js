/**
 * Base TTS Provider Class
 *
 * Abstract class that defines the interface for all TTS providers.
 * Each provider implementation must extend this class and implement
 * the required methods.
 */

export class BaseTTSProvider {
  constructor(apiKey, config = {}) {
    if (this.constructor === BaseTTSProvider) {
      throw new Error('BaseTTSProvider is an abstract class and cannot be instantiated directly');
    }

    this.apiKey = apiKey;
    this.config = {
      maxChunkSize: config.maxChunkSize || 1000,
      audioFormat: config.audioFormat || 'mp3',
      sampleRate: config.sampleRate || 24000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
  }

  /**
   * Generate speech from text
   * @param {string} text - The text to convert to speech
   * @param {Object} options - Additional options for generation
   * @returns {Promise<Buffer>} - Audio buffer
   */
  async generateSpeech(text, options = {}) {
    throw new Error('generateSpeech() must be implemented by subclass');
  }

  /**
   * Get the maximum character limit for this provider
   * @returns {number} - Maximum characters per request
   */
  getMaxChunkSize() {
    return this.config.maxChunkSize;
  }

  /**
   * Validate API key
   * @returns {Promise<boolean>} - True if valid
   */
  async validateApiKey() {
    throw new Error('validateApiKey() must be implemented by subclass');
  }

  /**
   * Get provider name
   * @returns {string} - Provider name
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }

  /**
   * Retry logic wrapper
   * @param {Function} fn - Async function to retry
   * @param {number} attempts - Number of retry attempts
   * @returns {Promise<any>} - Result of function
   */
  async retry(fn, attempts = this.config.retryAttempts) {
    let lastError;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on authentication errors
        if (error.status === 401 || error.status === 403) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (i < attempts - 1) {
          const delay = this.config.retryDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Sanitize text for TTS processing
   * @param {string} text - Raw text
   * @returns {string} - Sanitized text
   */
  sanitizeText(text) {
    return text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Remove excessive newlines
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .replace(/[^\S\r\n]+/g, ' ')      // Remove extra spaces
      .trim();
  }
}
