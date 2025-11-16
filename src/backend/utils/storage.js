/**
 * Storage System
 *
 * File-based storage using JSON for conversion metadata
 * Simple, reliable, and easy to backup
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class ConversionStorage {
  constructor(config = {}) {
    this.metadataPath = config.metadataPath || './conversions/metadata.json';
    this.audioDir = config.audioDir || './conversions/audio';
    this.initialized = false;
  }

  /**
   * Initialize storage (create directories and metadata file)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Create directories
      const metadataDir = path.dirname(this.metadataPath);
      await fs.mkdir(metadataDir, { recursive: true });
      await fs.mkdir(this.audioDir, { recursive: true });

      // Create metadata file if it doesn't exist
      try {
        await fs.access(this.metadataPath);
      } catch {
        await this.writeMetadata({ conversions: [] });
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize storage: ${error.message}`);
    }
  }

  /**
   * Read metadata file
   * @returns {Promise<Object>} - Metadata object
   */
  async readMetadata() {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, return empty structure
      return { conversions: [] };
    }
  }

  /**
   * Write metadata file (atomic operation)
   * @param {Object} metadata - Metadata object
   */
  async writeMetadata(metadata) {
    const tempPath = `${this.metadataPath}.tmp`;

    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, JSON.stringify(metadata, null, 2), 'utf-8');

      // Atomic rename
      await fs.rename(tempPath, this.metadataPath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      throw new Error(`Failed to write metadata: ${error.message}`);
    }
  }

  /**
   * Save a new conversion
   * @param {Object} conversion - Conversion data
   * @returns {Promise<Object>} - Saved conversion with ID
   */
  async saveConversion(conversion) {
    await this.initialize();

    const metadata = await this.readMetadata();

    const newConversion = {
      id: uuidv4(),
      title: conversion.title || 'Untitled',
      text: conversion.text || '',
      audioPath: conversion.audioPath || '',
      createdAt: new Date().toISOString(),
      duration: conversion.duration || 0,
      status: conversion.status || 'pending',
      provider: conversion.provider || 'unknown',
      chunkCount: conversion.chunkCount || 0,
      characterCount: conversion.text ? conversion.text.length : 0
    };

    metadata.conversions.push(newConversion);

    await this.writeMetadata(metadata);

    return newConversion;
  }

  /**
   * Update an existing conversion
   * @param {string} id - Conversion ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated conversion
   */
  async updateConversion(id, updates) {
    await this.initialize();

    const metadata = await this.readMetadata();
    const index = metadata.conversions.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error(`Conversion not found: ${id}`);
    }

    // Update conversion
    metadata.conversions[index] = {
      ...metadata.conversions[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.writeMetadata(metadata);

    return metadata.conversions[index];
  }

  /**
   * Get all conversions
   * @param {Object} options - Filter and sort options
   * @returns {Promise<Array>} - Array of conversions
   */
  async getConversions(options = {}) {
    await this.initialize();

    const metadata = await this.readMetadata();
    let conversions = [...metadata.conversions];

    // Filter by status
    if (options.status) {
      conversions = conversions.filter(c => c.status === options.status);
    }

    // Search by title or text
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      conversions = conversions.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        c.text.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    conversions.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Pagination
    if (options.limit) {
      const offset = options.offset || 0;
      conversions = conversions.slice(offset, offset + options.limit);
    }

    return conversions;
  }

  /**
   * Get a single conversion by ID
   * @param {string} id - Conversion ID
   * @returns {Promise<Object>} - Conversion object
   */
  async getConversion(id) {
    await this.initialize();

    const metadata = await this.readMetadata();
    const conversion = metadata.conversions.find(c => c.id === id);

    if (!conversion) {
      throw new Error(`Conversion not found: ${id}`);
    }

    return conversion;
  }

  /**
   * Delete a conversion
   * @param {string} id - Conversion ID
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteConversion(id) {
    await this.initialize();

    const metadata = await this.readMetadata();
    const conversion = metadata.conversions.find(c => c.id === id);

    if (!conversion) {
      throw new Error(`Conversion not found: ${id}`);
    }

    // Delete audio file if it exists
    if (conversion.audioPath) {
      try {
        await fs.unlink(conversion.audioPath);
      } catch (error) {
        console.warn(`Failed to delete audio file: ${error.message}`);
      }
    }

    // Remove from metadata
    metadata.conversions = metadata.conversions.filter(c => c.id !== id);
    await this.writeMetadata(metadata);

    return true;
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} - Statistics
   */
  async getStats() {
    await this.initialize();

    const metadata = await this.readMetadata();
    const conversions = metadata.conversions;

    let totalSize = 0;
    let totalDuration = 0;

    // Calculate audio files size
    for (const conversion of conversions) {
      if (conversion.audioPath) {
        try {
          const stats = await fs.stat(conversion.audioPath);
          totalSize += stats.size;
        } catch (error) {
          // File might not exist
        }
      }
      totalDuration += conversion.duration || 0;
    }

    return {
      totalConversions: conversions.length,
      completedConversions: conversions.filter(c => c.status === 'completed').length,
      processingConversions: conversions.filter(c => c.status === 'processing').length,
      failedConversions: conversions.filter(c => c.status === 'failed').length,
      totalAudioSize: totalSize,
      totalAudioSizeFormatted: this.formatBytes(totalSize),
      totalDuration: totalDuration,
      totalDurationFormatted: this.formatDuration(totalDuration)
    };
  }

  /**
   * Clean up old or failed conversions
   * @param {Object} options - Cleanup options
   * @returns {Promise<number>} - Number of deleted conversions
   */
  async cleanup(options = {}) {
    await this.initialize();

    const metadata = await this.readMetadata();
    let toDelete = [];

    // Delete failed conversions older than X days
    if (options.deleteFailedOlderThan) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.deleteFailedOlderThan);

      toDelete = metadata.conversions.filter(c =>
        c.status === 'failed' &&
        new Date(c.createdAt) < cutoffDate
      );
    }

    // Delete all failed conversions
    if (options.deleteAllFailed) {
      toDelete = metadata.conversions.filter(c => c.status === 'failed');
    }

    // Delete conversions
    for (const conversion of toDelete) {
      await this.deleteConversion(conversion.id);
    }

    return toDelete.length;
  }

  /**
   * Format bytes for display
   * @param {number} bytes - Bytes
   * @returns {string} - Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration for display
   * @param {number} seconds - Duration in seconds
   * @returns {string} - Formatted string (HH:MM:SS)
   */
  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
  }
}

// Singleton instance
let storageInstance = null;

/**
 * Get storage instance (singleton)
 * @returns {ConversionStorage}
 */
export function getStorage() {
  if (!storageInstance) {
    storageInstance = new ConversionStorage();
  }
  return storageInstance;
}
