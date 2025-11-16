/**
 * Audio Processor Utility
 *
 * Handles audio file operations:
 * - Concatenating multiple audio chunks
 * - Converting between formats
 * - Analyzing audio properties
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class AudioProcessor {
  constructor(config = {}) {
    this.config = {
      format: config.format || 'mp3',
      sampleRate: config.sampleRate || 24000,
      bitrate: config.bitrate || '128k',
      channels: config.channels || 1, // Mono for TTS
      ...config
    };

    this.tempDir = config.tempDir || './temp';
  }

  /**
   * Concatenate multiple audio buffers into one file
   * @param {Array<Buffer>} audioBuffers - Array of audio buffers
   * @param {string} outputPath - Output file path
   * @returns {Promise<string>} - Path to concatenated file
   */
  async concatenateBuffers(audioBuffers, outputPath) {
    if (!audioBuffers || audioBuffers.length === 0) {
      throw new Error('No audio buffers provided');
    }

    // If only one buffer, write it directly
    if (audioBuffers.length === 1) {
      await fs.writeFile(outputPath, audioBuffers[0]);
      return outputPath;
    }

    // Create temp directory for intermediate files
    await this.ensureTempDir();

    try {
      // Save each buffer as a temporary file
      const tempFiles = [];
      for (let i = 0; i < audioBuffers.length; i++) {
        const tempFile = path.join(this.tempDir, `chunk_${i}_${Date.now()}.mp3`);
        await fs.writeFile(tempFile, audioBuffers[i]);
        tempFiles.push(tempFile);
      }

      // Concatenate using FFmpeg
      await this.concatenateFiles(tempFiles, outputPath);

      // Clean up temporary files
      await this.cleanupTempFiles(tempFiles);

      return outputPath;
    } catch (error) {
      throw new Error(`Failed to concatenate audio: ${error.message}`);
    }
  }

  /**
   * Concatenate audio files using FFmpeg
   * @param {Array<string>} inputFiles - Array of input file paths
   * @param {string} outputPath - Output file path
   * @returns {Promise<void>}
   */
  async concatenateFiles(inputFiles, outputPath) {
    if (!inputFiles || inputFiles.length === 0) {
      throw new Error('No input files provided');
    }

    // Check if FFmpeg is available
    const hasFFmpeg = await this.checkFFmpeg();

    if (hasFFmpeg) {
      await this.concatenateWithFFmpeg(inputFiles, outputPath);
    } else {
      // Fallback: simple binary concatenation (works for some formats)
      console.warn('FFmpeg not found. Using simple concatenation (may not work for all formats)');
      await this.simpleConcatenate(inputFiles, outputPath);
    }
  }

  /**
   * Concatenate using FFmpeg (preferred method)
   * @param {Array<string>} inputFiles - Input files
   * @param {string} outputPath - Output file
   */
  async concatenateWithFFmpeg(inputFiles, outputPath) {
    // Create a file list for FFmpeg concat demuxer
    const listFile = path.join(this.tempDir, `concat_list_${Date.now()}.txt`);
    const listContent = inputFiles.map(f => `file '${path.resolve(f)}'`).join('\n');

    await fs.writeFile(listFile, listContent);

    try {
      // Use FFmpeg concat demuxer for seamless concatenation
      const command = `ffmpeg -f concat -safe 0 -i "${listFile}" -c copy -y "${outputPath}"`;
      await execAsync(command);
    } catch (error) {
      // If concat demuxer fails, try filter_complex method
      const inputs = inputFiles.map((f, i) => `-i "${f}"`).join(' ');
      const filter = `[0:a]${inputFiles.slice(1).map((_, i) => `[${i + 1}:a]`).join('')}concat=n=${inputFiles.length}:v=0:a=1[out]`;
      const command = `ffmpeg ${inputs} -filter_complex "${filter}" -map "[out]" -y "${outputPath}"`;

      try {
        await execAsync(command);
      } catch (retryError) {
        throw new Error(`FFmpeg concatenation failed: ${retryError.message}`);
      }
    } finally {
      // Clean up list file
      try {
        await fs.unlink(listFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Simple binary concatenation (fallback)
   * @param {Array<string>} inputFiles - Input files
   * @param {string} outputPath - Output file
   */
  async simpleConcatenate(inputFiles, outputPath) {
    const buffers = [];

    for (const file of inputFiles) {
      const buffer = await fs.readFile(file);
      buffers.push(buffer);
    }

    const concatenated = Buffer.concat(buffers);
    await fs.writeFile(outputPath, concatenated);
  }

  /**
   * Check if FFmpeg is available
   * @returns {Promise<boolean>}
   */
  async checkFFmpeg() {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get audio file duration in seconds
   * @param {string} filePath - Path to audio file
   * @returns {Promise<number>} - Duration in seconds
   */
  async getDuration(filePath) {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
      );
      return parseFloat(stdout.trim());
    } catch (error) {
      // Fallback: estimate based on file size (rough approximation)
      const stats = await fs.stat(filePath);
      const bitrateKbps = 128; // Assumed bitrate
      const durationSeconds = (stats.size * 8) / (bitrateKbps * 1000);
      return durationSeconds;
    }
  }

  /**
   * Convert audio format
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {Object} options - Conversion options
   * @returns {Promise<string>} - Output file path
   */
  async convert(inputPath, outputPath, options = {}) {
    const hasFFmpeg = await this.checkFFmpeg();

    if (!hasFFmpeg) {
      throw new Error('FFmpeg is required for audio conversion');
    }

    const sampleRate = options.sampleRate || this.config.sampleRate;
    const bitrate = options.bitrate || this.config.bitrate;
    const channels = options.channels || this.config.channels;

    const command = `ffmpeg -i "${inputPath}" -ar ${sampleRate} -b:a ${bitrate} -ac ${channels} -y "${outputPath}"`;

    try {
      await execAsync(command);
      return outputPath;
    } catch (error) {
      throw new Error(`Audio conversion failed: ${error.message}`);
    }
  }

  /**
   * Ensure temp directory exists
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Clean up temporary files
   * @param {Array<string>} files - Files to delete
   */
  async cleanupTempFiles(files) {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        console.warn(`Failed to delete temp file ${file}:`, error.message);
      }
    }
  }

  /**
   * Validate audio buffer
   * @param {Buffer} buffer - Audio buffer
   * @returns {boolean} - True if valid
   */
  validateAudioBuffer(buffer) {
    if (!buffer || buffer.length === 0) {
      return false;
    }

    // Check for common audio file signatures
    const mp3Signature = buffer.slice(0, 3).toString('hex');
    const wavSignature = buffer.slice(0, 4).toString('ascii');

    // MP3: FF FB or FF F3 or ID3
    if (mp3Signature.startsWith('fffb') || mp3Signature.startsWith('fff3') ||
        buffer.slice(0, 3).toString('ascii') === 'ID3') {
      return true;
    }

    // WAV: RIFF
    if (wavSignature === 'RIFF') {
      return true;
    }

    // If no signature match, assume valid (might be other format)
    return buffer.length > 100; // Minimum reasonable audio file size
  }
}

/**
 * Convenience function to concatenate audio buffers
 * @param {Array<Buffer>} buffers - Audio buffers
 * @param {string} outputPath - Output file path
 * @returns {Promise<string>} - Output path
 */
export async function concatenateAudio(buffers, outputPath) {
  const processor = new AudioProcessor();
  return processor.concatenateBuffers(buffers, outputPath);
}
