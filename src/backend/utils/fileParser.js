/**
 * File Parser Utility
 *
 * Extracts clean text from various file formats:
 * - Plain text (.txt)
 * - Markdown (.md)
 * - PDF (.pdf)
 * - Word documents (.docx)
 */

import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { marked } from 'marked';

export class FileParser {
  constructor() {
    this.supportedExtensions = ['.txt', '.md', '.pdf', '.docx'];
  }

  /**
   * Parse file and extract text
   * @param {string} filePath - Path to file
   * @returns {Promise<string>} - Extracted text
   */
  async parseFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (!this.supportedExtensions.includes(ext)) {
      throw new Error(
        `Unsupported file type: ${ext}. Supported: ${this.supportedExtensions.join(', ')}`
      );
    }

    switch (ext) {
      case '.txt':
        return this.parseTxt(filePath);
      case '.md':
        return this.parseMarkdown(filePath);
      case '.pdf':
        return this.parsePdf(filePath);
      case '.docx':
        return this.parseDocx(filePath);
      default:
        throw new Error(`No parser available for ${ext}`);
    }
  }

  /**
   * Parse plain text file
   * @param {string} filePath - Path to .txt file
   * @returns {Promise<string>} - Text content
   */
  async parseTxt(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.cleanText(content);
    } catch (error) {
      throw new Error(`Failed to parse TXT file: ${error.message}`);
    }
  }

  /**
   * Parse Markdown file
   * @param {string} filePath - Path to .md file
   * @returns {Promise<string>} - Text content (without markdown syntax)
   */
  async parseMarkdown(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Configure marked to extract plain text
      const renderer = new marked.Renderer();

      // Override methods to return plain text
      renderer.heading = (text) => text + '\n\n';
      renderer.paragraph = (text) => text + '\n\n';
      renderer.list = (body) => body + '\n';
      renderer.listitem = (text) => '- ' + text + '\n';
      renderer.code = (code) => code + '\n';
      renderer.blockquote = (quote) => quote + '\n';
      renderer.link = (href, title, text) => text;
      renderer.image = (href, title, text) => text || '';
      renderer.strong = (text) => text;
      renderer.em = (text) => text;
      renderer.codespan = (code) => code;

      marked.use({ renderer });

      const html = marked.parse(content);

      // Remove any remaining HTML tags
      const plainText = html.replace(/<[^>]*>/g, '');

      return this.cleanText(plainText);
    } catch (error) {
      throw new Error(`Failed to parse Markdown file: ${error.message}`);
    }
  }

  /**
   * Parse PDF file
   * @param {string} filePath - Path to .pdf file
   * @returns {Promise<string>} - Extracted text
   */
  async parsePdf(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error('PDF appears to be empty or contains only images');
      }

      return this.cleanText(data.text);
    } catch (error) {
      throw new Error(`Failed to parse PDF file: ${error.message}`);
    }
  }

  /**
   * Parse Word document (.docx)
   * @param {string} filePath - Path to .docx file
   * @returns {Promise<string>} - Extracted text
   */
  async parseDocx(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });

      if (!result.value || result.value.trim().length === 0) {
        throw new Error('Document appears to be empty');
      }

      // Log any warnings from mammoth
      if (result.messages && result.messages.length > 0) {
        console.warn('Document parsing warnings:', result.messages);
      }

      return this.cleanText(result.value);
    } catch (error) {
      throw new Error(`Failed to parse DOCX file: ${error.message}`);
    }
  }

  /**
   * Clean and normalize text
   * @param {string} text - Raw text
   * @returns {string} - Cleaned text
   */
  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Remove excessive newlines
      .replace(/\t/g, ' ')              // Replace tabs with spaces
      .replace(/[^\S\r\n]+/g, ' ')      // Normalize spaces
      .replace(/^\s+|\s+$/gm, '')       // Trim lines
      .trim();
  }

  /**
   * Get file info
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} - File information
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();

      return {
        name: path.basename(filePath),
        extension: ext,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        isSupported: this.supportedExtensions.includes(ext),
        modified: stats.mtime
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Validate file before parsing
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} - Validation result
   */
  async validateFile(filePath) {
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    try {
      const info = await this.getFileInfo(filePath);

      const errors = [];
      const warnings = [];

      if (!info.isSupported) {
        errors.push(`Unsupported file type: ${info.extension}`);
      }

      if (info.size > maxFileSize) {
        errors.push(`File too large: ${info.sizeFormatted} (max 10MB)`);
      }

      if (info.size === 0) {
        errors.push('File is empty');
      }

      if (info.size > 5 * 1024 * 1024) {
        warnings.push('Large file may take longer to process');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        info
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
        warnings: [],
        info: null
      };
    }
  }
}

/**
 * Convenience function to parse file
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} - Extracted text
 */
export async function parseFile(filePath) {
  const parser = new FileParser();
  return parser.parseFile(filePath);
}
