/**
 * TTS Provider Factory
 *
 * Factory pattern for creating and managing TTS provider instances
 */

import { DeepInfraProvider } from './deepinfra.js';
import { HuggingFaceProvider } from './huggingface.js';
import { SegmindProvider } from './segmind.js';

export class ProviderFactory {
  static providers = {
    segmind: SegmindProvider,
    deepinfra: DeepInfraProvider,
    huggingface: HuggingFaceProvider
  };

  /**
   * Create a TTS provider instance
   * @param {string} providerName - Name of the provider (segmind, deepinfra, huggingface)
   * @param {string} apiKey - API key for the provider
   * @param {Object} config - Additional configuration
   * @returns {BaseTTSProvider} - Provider instance
   */
  static createProvider(providerName, apiKey, config = {}) {
    const ProviderClass = this.providers[providerName.toLowerCase()];

    if (!ProviderClass) {
      throw new Error(
        `Unknown provider: ${providerName}. Available providers: ${Object.keys(this.providers).join(', ')}`
      );
    }

    if (!apiKey) {
      throw new Error(`API key required for provider: ${providerName}`);
    }

    return new ProviderClass(apiKey, config);
  }

  /**
   * Get list of available provider names
   * @returns {Array<string>} - Provider names
   */
  static getAvailableProviders() {
    return Object.keys(this.providers);
  }

  /**
   * Validate provider configuration
   * @param {string} providerName - Provider name
   * @param {string} apiKey - API key
   * @returns {Promise<boolean>} - True if valid
   */
  static async validateProvider(providerName, apiKey) {
    try {
      const provider = this.createProvider(providerName, apiKey);
      return await provider.validateApiKey();
    } catch (error) {
      return false;
    }
  }
}

export { DeepInfraProvider, HuggingFaceProvider, SegmindProvider };
