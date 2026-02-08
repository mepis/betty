const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const mongoService = require('./mongoService');

class ChunkingService {
  constructor() {
    this.initialized = false;
    this.collectionName = config.mongodb.collections.chunks;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure MongoDB is connected
      await mongoService.connect();

      this.initialized = true;
      console.log('Chunking service initialized');
    } catch (error) {
      console.error('Failed to initialize chunking service:', error);
      throw error;
    }
  }

  /**
   * Get chunks collection
   */
  async getCollection() {
    await this.initialize();
    return mongoService.getCollection(this.collectionName);
  }

  /**
   * Split text into overlapping chunks
   * @param {string} text - Text to chunk
   * @param {object} options - Chunking options
   * @returns {Array} Array of chunk objects
   */
  chunkText(text, options = {}) {
    const chunkSize = options.chunkSize || config.rag.chunkSize;
    const overlap = options.overlap || config.rag.chunkOverlap;
    const maxChunks = options.maxChunks || config.rag.maxChunksPerDocument;

    // Simple word-based chunking
    const words = text.split(/\s+/);
    const chunks = [];
    let startIndex = 0;

    while (startIndex < words.length && chunks.length < maxChunks) {
      const endIndex = Math.min(startIndex + chunkSize, words.length);
      const chunkWords = words.slice(startIndex, endIndex);
      const chunkText = chunkWords.join(' ');

      // Calculate character offsets (approximate)
      const startOffset = words.slice(0, startIndex).join(' ').length;
      const endOffset = startOffset + chunkText.length;

      chunks.push({
        text: chunkText,
        startOffset,
        endOffset,
        wordCount: chunkWords.length,
      });

      // Move forward by (chunkSize - overlap) words
      startIndex += Math.max(1, chunkSize - overlap);
    }

    return chunks;
  }

  /**
   * Create and store chunks for a document
   * @param {string} documentId - Document ID
   * @param {string} text - Document text
   * @param {object} options - Chunking options
   * @returns {Array} Array of stored chunks
   */
  async createChunks(documentId, text, options = {}) {
    const collection = await this.getCollection();

    // Generate chunks
    const rawChunks = this.chunkText(text, options);

    // Create chunk objects with IDs
    const chunks = rawChunks.map((chunk, index) => ({
      id: uuidv4(),
      documentId,
      index,
      text: chunk.text,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      wordCount: chunk.wordCount,
      createdAt: new Date(),
    }));

    // Insert into MongoDB
    if (chunks.length > 0) {
      await collection.insertMany(chunks);
    }

    return chunks;
  }

  /**
   * Get chunks for a document
   * @param {string} documentId - Document ID
   * @returns {Array} Array of chunks
   */
  async getChunksByDocument(documentId) {
    const collection = await this.getCollection();
    const chunks = await collection.find({ documentId }).sort({ index: 1 }).toArray();
    return chunks;
  }

  /**
   * Get a specific chunk by ID
   * @param {string} chunkId - Chunk ID
   * @returns {object} Chunk object
   */
  async getChunkById(chunkId) {
    const collection = await this.getCollection();
    const chunk = await collection.findOne({ id: chunkId });

    if (!chunk) {
      throw new Error(`Chunk not found: ${chunkId}`);
    }

    return chunk;
  }

  /**
   * Delete chunks for a document
   * @param {string} documentId - Document ID
   * @returns {boolean} Success status
   */
  async deleteChunks(documentId) {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({ documentId });
    return result.deletedCount > 0;
  }

  /**
   * Get chunk count for a document
   * @param {string} documentId - Document ID
   * @returns {number} Number of chunks
   */
  async getChunkCount(documentId) {
    const collection = await this.getCollection();
    const count = await collection.countDocuments({ documentId });
    return count;
  }

  /**
   * Get all chunks across all documents
   * @returns {Array} Array of all chunks with document info
   */
  async getAllChunks() {
    const collection = await this.getCollection();
    const allChunks = await collection.find({}).toArray();
    return allChunks;
  }

  /**
   * Update chunks for a document (reprocess)
   * @param {string} documentId - Document ID
   * @param {string} text - Document text
   * @param {object} options - Chunking options
   * @returns {Array} Array of updated chunks
   */
  async updateChunks(documentId, text, options = {}) {
    // Delete existing chunks
    await this.deleteChunks(documentId);

    // Create new chunks
    return this.createChunks(documentId, text, options);
  }
}

// Singleton instance
const chunkingService = new ChunkingService();

module.exports = chunkingService;
