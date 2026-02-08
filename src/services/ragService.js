const documentService = require('./documentService');
const chunkingService = require('./chunkingService');
const vectorService = require('./vectorService');
const config = require('../config');

class RagService {
  constructor() {
    this.config = config.rag;
  }

  /**
   * Process a document through the full RAG pipeline
   * @param {string} documentId - Document ID
   * @param {object} options - Processing options
   * @returns {object} Processing result
   */
  async processDocument(documentId, options = {}) {
    try {
      // Update document status
      await documentService.updateStatus(documentId, 'processing');

      // Step 1: Extract text from document
      console.log(`Extracting text from document ${documentId}...`);
      const text = await documentService.extractText(documentId);

      if (!text || text.length === 0) {
        throw new Error('No text extracted from document');
      }

      // Step 2: Chunk the text
      console.log(`Chunking text for document ${documentId}...`);
      const chunks = await chunkingService.createChunks(documentId, text, options);

      if (chunks.length === 0) {
        throw new Error('No chunks created from document');
      }

      console.log(`Created ${chunks.length} chunks`);

      // Update chunk count
      await documentService.updateChunkCount(documentId, chunks.length);

      // Step 3: Generate embeddings
      console.log(`Generating embeddings for ${chunks.length} chunks...`);
      const texts = chunks.map((chunk) => chunk.text);
      const embeddings = await vectorService.batchGenerateEmbeddings(texts);

      // Step 4: Store embeddings
      console.log(`Storing embeddings for document ${documentId}...`);
      await vectorService.storeEmbeddings(documentId, chunks, embeddings);

      // Update document status to ready
      await documentService.updateStatus(documentId, 'ready');

      return {
        success: true,
        documentId,
        chunkCount: chunks.length,
        status: 'ready',
      };
    } catch (error) {
      console.error(`Failed to process document ${documentId}:`, error);

      // Update document status to error
      await documentService.updateStatus(documentId, 'error', error.message);

      throw error;
    }
  }

  /**
   * Search for relevant context across documents
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Search results with chunks
   */
  async search(query, options = {}) {
    const topK = options.topK || this.config.defaultTopK;
    const minSimilarity = options.minSimilarity || this.config.minSimilarity;
    const documentIds = options.documentIds || null;

    try {
      // Generate query embedding
      console.log(`Generating embedding for query: "${query.substring(0, 50)}..."`);
      const queryEmbedding = await vectorService.generateEmbedding(query);

      // Search for similar vectors
      console.log(`Searching for top ${topK} similar chunks...`);
      const results = await vectorService.searchSimilar(queryEmbedding, topK, {
        minSimilarity,
        documentIds,
      });

      // Enrich results with chunk and document information
      const enrichedResults = await Promise.all(
        results.map(async (result) => {
          const chunk = await chunkingService.getChunkById(result.chunkId);
          const document = await documentService.getDocument(result.documentId);

          return {
            chunkId: result.chunkId,
            documentId: result.documentId,
            documentName: document.filename,
            text: chunk.text,
            similarity: result.similarity,
            metadata: {
              chunkIndex: chunk.index,
              wordCount: chunk.wordCount,
              documentTitle: document.metadata.title,
              documentTags: document.metadata.tags,
            },
          };
        })
      );

      return enrichedResults;
    } catch (error) {
      console.error('Failed to search:', error);
      throw error;
    }
  }

  /**
   * Retrieve context for chat completion
   * @param {string} query - User query
   * @param {number} topK - Number of chunks to retrieve
   * @returns {Array} Relevant chunks
   */
  async retrieveContext(query, topK = null) {
    topK = topK || this.config.defaultTopK;

    const results = await this.search(query, { topK });
    return results;
  }

  /**
   * Format retrieved chunks for prompt injection
   * @param {Array} chunks - Retrieved chunks
   * @returns {string} Formatted context
   */
  formatContextForPrompt(chunks) {
    if (chunks.length === 0) {
      return '';
    }

    const context = chunks
      .map((chunk, index) => {
        const source = `[${index + 1}] ${chunk.documentName}`;
        return `${source}\n${chunk.text}`;
      })
      .join('\n\n---\n\n');

    return `Relevant context from knowledge base:\n\n${context}`;
  }

  /**
   * Reprocess a document (delete and recreate embeddings)
   * @param {string} documentId - Document ID
   * @param {object} options - Processing options
   * @returns {object} Processing result
   */
  async reprocessDocument(documentId, options = {}) {
    try {
      // Delete existing chunks and embeddings
      await chunkingService.deleteChunks(documentId);
      await vectorService.deleteEmbeddings(documentId);

      // Process document again
      return await this.processDocument(documentId, options);
    } catch (error) {
      console.error(`Failed to reprocess document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Delete all RAG data for a document
   * @param {string} documentId - Document ID
   * @returns {boolean} Success status
   */
  async deleteDocumentData(documentId) {
    try {
      // Delete chunks
      await chunkingService.deleteChunks(documentId);

      // Delete embeddings
      await vectorService.deleteEmbeddings(documentId);

      // Delete document
      await documentService.deleteDocument(documentId);

      return true;
    } catch (error) {
      console.error(`Failed to delete document data for ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get RAG system statistics
   * @returns {object} System statistics
   */
  async getStats() {
    const documents = await documentService.listDocuments();
    const vectorStats = await vectorService.getStats();

    const statusCounts = documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalDocuments: documents.length,
      documentsByStatus: statusCounts,
      totalChunks: vectorStats.totalVectors,
      averageChunksPerDocument: vectorStats.averageVectorsPerDocument,
    };
  }

  /**
   * Get current RAG configuration
   * @returns {object} RAG configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update RAG configuration (runtime only, not persisted)
   * @param {object} updates - Configuration updates
   * @returns {object} Updated configuration
   */
  updateConfig(updates) {
    Object.assign(this.config, updates);
    return this.getConfig();
  }
}

// Singleton instance
const ragService = new RagService();

module.exports = ragService;
