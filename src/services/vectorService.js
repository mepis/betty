const axios = require('axios');
const config = require('../config');
const mongoService = require('./mongoService');
const embeddingServerService = require('./embeddingServerService');

class VectorService {
  constructor() {
    // Default to main llama.cpp server
    this.mainServerUrl = `http://${config.llama.host}:${config.llama.port}`;
    this.initialized = false;
    this.collectionName = config.mongodb.collections.vectors;
  }

  /**
   * Get the appropriate URL for embedding requests
   * Uses dedicated embedding server if running, otherwise falls back to main server
   */
  getEmbeddingUrl() {
    if (embeddingServerService.getIsRunning()) {
      return embeddingServerService.getBaseUrl();
    }
    return this.mainServerUrl;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure MongoDB is connected
      await mongoService.connect();

      this.initialized = true;
      console.log('Vector service initialized');
    } catch (error) {
      console.error('Failed to initialize vector service:', error);
      throw error;
    }
  }

  /**
   * Get vectors collection
   */
  async getCollection() {
    await this.initialize();
    return mongoService.getCollection(this.collectionName);
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Array} Embedding vector
   */
  async generateEmbedding(text) {
    try {
      const baseUrl = this.getEmbeddingUrl();
      const response = await axios.post(
        `${baseUrl}/v1/embeddings`,
        {
          input: text,
          model: 'llama',
        },
        {
          timeout: 30000,
        }
      );

      if (response.data && response.data.data && response.data.data[0]) {
        return response.data.data[0].embedding;
      }

      throw new Error('Invalid embedding response');
    } catch (error) {
      console.error('Failed to generate embedding:', error.message);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   * @param {Array} texts - Array of texts to embed
   * @param {number} batchSize - Batch size
   * @returns {Array} Array of embedding vectors
   */
  async batchGenerateEmbeddings(texts, batchSize = null) {
    batchSize = batchSize || config.rag.batchSize;
    const embeddings = [];
    const baseUrl = this.getEmbeddingUrl();

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Generating embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} (using ${baseUrl})`);

      try {
        const response = await axios.post(
          `${baseUrl}/v1/embeddings`,
          {
            input: batch,
            model: 'llama',
          },
          {
            timeout: 60000, // Longer timeout for batches
          }
        );

        if (response.data && response.data.data) {
          embeddings.push(...response.data.data.map((d) => d.embedding));
        }
      } catch (error) {
        console.error(`Failed to generate embeddings for batch ${i}:`, error.message);
        throw error;
      }
    }

    return embeddings;
  }

  /**
   * Store embeddings for a document
   * @param {string} documentId - Document ID
   * @param {Array} chunks - Array of chunk objects
   * @param {Array} embeddings - Array of embedding vectors
   * @returns {boolean} Success status
   */
  async storeEmbeddings(documentId, chunks, embeddings) {
    const collection = await this.getCollection();

    if (chunks.length !== embeddings.length) {
      throw new Error('Chunks and embeddings length mismatch');
    }

    // Create vector documents
    const vectors = chunks.map((chunk, index) => ({
      chunkId: chunk.id,
      documentId,
      embedding: embeddings[index],
      createdAt: new Date(),
    }));

    // Insert into MongoDB
    await collection.insertMany(vectors);

    console.log(`Stored ${vectors.length} embeddings for document ${documentId}`);
    return true;
  }

  /**
   * Load embeddings for a document
   * @param {string} documentId - Document ID
   * @returns {Array} Array of vector objects
   */
  async loadEmbeddings(documentId) {
    const collection = await this.getCollection();
    const vectors = await collection.find({ documentId }).toArray();
    return vectors;
  }

  /**
   * Delete embeddings for a document
   * @param {string} documentId - Document ID
   * @returns {boolean} Success status
   */
  async deleteEmbeddings(documentId) {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({ documentId });
    return result.deletedCount > 0;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array} vec1 - First vector
   * @param {Array} vec2 - Second vector
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return similarity;
  }

  /**
   * Search for similar vectors across all documents
   * @param {Array} queryEmbedding - Query vector
   * @param {number} topK - Number of results to return
   * @param {object} options - Search options
   * @returns {Array} Array of search results
   */
  async searchSimilar(queryEmbedding, topK = 5, options = {}) {
    const minSimilarity = options.minSimilarity || config.rag.minSimilarity;
    const documentIds = options.documentIds || null;

    // Use Atlas Vector Search if enabled (requires MongoDB Atlas M10+)
    if (config.mongodb.vectorSearch.enabled) {
      return this.searchWithAtlasVectorSearch(queryEmbedding, topK, options);
    }

    // Otherwise, use manual cosine similarity search
    return this.searchWithCosineSimilarity(queryEmbedding, topK, options);
  }

  /**
   * Search using MongoDB Atlas Vector Search
   * @param {Array} queryEmbedding - Query vector
   * @param {number} topK - Number of results to return
   * @param {object} options - Search options
   * @returns {Array} Array of search results
   */
  async searchWithAtlasVectorSearch(queryEmbedding, topK, options) {
    const collection = await this.getCollection();
    const minSimilarity = options.minSimilarity || config.rag.minSimilarity;
    const documentIds = options.documentIds || null;

    // Build Atlas Vector Search pipeline
    const pipeline = [
      {
        $vectorSearch: {
          index: config.mongodb.vectorSearch.indexName,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: topK * 10, // Search more candidates for better results
          limit: topK,
        },
      },
      {
        $addFields: {
          similarity: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    // Add document filter if specified
    if (documentIds) {
      pipeline.push({
        $match: {
          documentId: { $in: documentIds },
        },
      });
    }

    // Filter by minimum similarity
    pipeline.push({
      $match: {
        similarity: { $gte: minSimilarity },
      },
    });

    // Project only needed fields
    pipeline.push({
      $project: {
        chunkId: 1,
        documentId: 1,
        similarity: 1,
        _id: 0,
      },
    });

    const results = await collection.aggregate(pipeline).toArray();
    return results;
  }

  /**
   * Search using manual cosine similarity calculation
   * @param {Array} queryEmbedding - Query vector
   * @param {number} topK - Number of results to return
   * @param {object} options - Search options
   * @returns {Array} Array of search results
   */
  async searchWithCosineSimilarity(queryEmbedding, topK, options) {
    const collection = await this.getCollection();
    const minSimilarity = options.minSimilarity || config.rag.minSimilarity;
    const documentIds = options.documentIds || null;

    // Build query filter
    const query = {};
    if (documentIds) {
      query.documentId = { $in: documentIds };
    }

    // Fetch all vectors matching the filter
    const vectors = await collection.find(query).toArray();
    const results = [];

    // Calculate cosine similarity for each vector
    for (const vector of vectors) {
      const similarity = this.cosineSimilarity(queryEmbedding, vector.embedding);

      if (similarity >= minSimilarity) {
        results.push({
          chunkId: vector.chunkId,
          documentId: vector.documentId,
          similarity,
        });
      }
    }

    // Sort by similarity (descending) and take top-K
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  /**
   * Get all embeddings count
   * @returns {object} Statistics about embeddings
   */
  async getStats() {
    const collection = await this.getCollection();

    // Get total vector count
    const totalVectors = await collection.countDocuments();

    // Get distinct document count
    const distinctDocumentIds = await collection.distinct('documentId');
    const documentCount = distinctDocumentIds.length;

    return {
      documentCount,
      totalVectors,
      averageVectorsPerDocument: documentCount > 0 ? Math.round(totalVectors / documentCount) : 0,
    };
  }
}

// Singleton instance
const vectorService = new VectorService();

module.exports = vectorService;
