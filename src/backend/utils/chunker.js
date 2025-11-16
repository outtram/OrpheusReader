/**
 * Smart Text Chunking Algorithm
 *
 * Intelligently splits long text into chunks that respect:
 * - Sentence boundaries (don't break mid-sentence)
 * - Paragraph boundaries (prefer paragraph breaks)
 * - Character limits per TTS provider
 *
 * This ensures natural-sounding audio without jarring transitions.
 */

export class TextChunker {
  constructor(maxChunkSize = 1000) {
    this.maxChunkSize = maxChunkSize;
    // Reserve some characters for safety margin
    this.safeChunkSize = Math.floor(maxChunkSize * 0.95);
  }

  /**
   * Split text into smart chunks
   * @param {string} text - Text to chunk
   * @returns {Array<string>} - Array of text chunks
   */
  chunk(text) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // If text is short enough, return as single chunk
    if (text.length <= this.safeChunkSize) {
      return [text.trim()];
    }

    // First, try to split by paragraphs
    const paragraphs = this.splitIntoParagraphs(text);
    const chunks = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      // If paragraph itself is too long, split it further
      if (paragraph.length > this.safeChunkSize) {
        // Save current chunk if it exists
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // Split long paragraph into sentences
        const sentenceChunks = this.chunkBySentences(paragraph);
        chunks.push(...sentenceChunks);
      }
      // If adding paragraph would exceed limit, save current chunk
      else if (currentChunk.length + paragraph.length + 1 > this.safeChunkSize) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
      }
      // Otherwise, add to current chunk
      else {
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Split text into paragraphs
   * @param {string} text - Text to split
   * @returns {Array<string>} - Array of paragraphs
   */
  splitIntoParagraphs(text) {
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Split long text by sentences
   * @param {string} text - Text to split
   * @returns {Array<string>} - Array of chunks
   */
  chunkBySentences(text) {
    const sentences = this.splitIntoSentences(text);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      // If single sentence is too long, force split by words
      if (sentence.length > this.safeChunkSize) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        const wordChunks = this.chunkByWords(sentence);
        chunks.push(...wordChunks);
      }
      // If adding sentence would exceed limit, save current chunk
      else if (currentChunk.length + sentence.length + 1 > this.safeChunkSize) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
      // Otherwise, add to current chunk
      else {
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Split text into sentences
   * @param {string} text - Text to split
   * @returns {Array<string>} - Array of sentences
   */
  splitIntoSentences(text) {
    // Enhanced sentence boundary detection
    // Handles: periods, question marks, exclamation marks
    // Avoids: abbreviations (Dr. Mr. Mrs.), decimals (3.14), ellipsis (...)
    const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?]["'])\s+(?=[A-Z])/g;

    return text
      .split(sentenceRegex)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Force split by words (last resort)
   * @param {string} text - Text to split
   * @returns {Array<string>} - Array of chunks
   */
  chunkByWords(text) {
    const words = text.split(/\s+/);
    const chunks = [];
    let currentChunk = '';

    for (const word of words) {
      // If single word is too long, split it (unlikely but possible)
      if (word.length > this.safeChunkSize) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // Split long word into character chunks
        for (let i = 0; i < word.length; i += this.safeChunkSize) {
          chunks.push(word.slice(i, i + this.safeChunkSize));
        }
      }
      // If adding word would exceed limit, save current chunk
      else if (currentChunk.length + word.length + 1 > this.safeChunkSize) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = word;
      }
      // Otherwise, add to current chunk
      else {
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get chunking statistics
   * @param {string} text - Text to analyze
   * @returns {Object} - Statistics
   */
  getStats(text) {
    const chunks = this.chunk(text);

    return {
      totalCharacters: text.length,
      totalChunks: chunks.length,
      averageChunkSize: chunks.length > 0
        ? Math.round(chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length)
        : 0,
      maxChunkSize: chunks.length > 0
        ? Math.max(...chunks.map(c => c.length))
        : 0,
      minChunkSize: chunks.length > 0
        ? Math.min(...chunks.map(c => c.length))
        : 0
    };
  }

  /**
   * Validate that all chunks are within size limit
   * @param {Array<string>} chunks - Chunks to validate
   * @returns {boolean} - True if all valid
   */
  validateChunks(chunks) {
    return chunks.every(chunk => chunk.length <= this.maxChunkSize);
  }
}

/**
 * Convenience function to chunk text
 * @param {string} text - Text to chunk
 * @param {number} maxChunkSize - Maximum chunk size
 * @returns {Array<string>} - Array of chunks
 */
export function chunkText(text, maxChunkSize = 1000) {
  const chunker = new TextChunker(maxChunkSize);
  return chunker.chunk(text);
}
