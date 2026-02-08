const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PDFParse } = require('pdf-parse');
const config = require('../config');
const mongoService = require('./mongoService');

class DocumentService {
  constructor() {
    this.documentsDir = path.join(process.cwd(), config.rag.documentsDir);
    this.initialized = false;
    this.collectionName = config.mongodb.collections.documents;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure MongoDB is connected
      await mongoService.connect();

      // Ensure directories exist
      await fs.mkdir(this.documentsDir, { recursive: true });

      this.initialized = true;
      console.log('Document service initialized');
    } catch (error) {
      console.error('Failed to initialize document service:', error);
      throw error;
    }
  }

  /**
   * Get documents collection
   */
  async getCollection() {
    await this.initialize();
    return mongoService.getCollection(this.collectionName);
  }

   async uploadDocument(file, metadata = {}) {
     const collection = await this.getCollection();

     const documentId = uuidv4();
     const fileExtension = path.extname(file.originalname);
     const filename = file.originalname;
     const filePath = path.join(this.documentsDir, `${documentId}${fileExtension}`);

     // Save file to disk - handle both buffer and stream inputs
     if (file.buffer) {
       // Traditional buffer approach
       await fs.writeFile(filePath, file.buffer);
     } else if (file.stream) {
       // Stream approach for large files
       const writeStream = fs.createWriteStream(filePath);
       file.stream.pipe(writeStream);
       await new Promise((resolve, reject) => {
         writeStream.on('finish', resolve);
         writeStream.on('error', reject);
         file.stream.on('error', reject);
       });
     } else {
       throw new Error('No file data provided');
     }

     // Get file size
     const stats = await fs.stat(filePath);

     // Create document metadata
     const document = {
       id: documentId,
       filename,
       path: filePath,
       type: fileExtension.substring(1).toLowerCase(),
       size: stats.size,
       uploadedAt: new Date(),
       chunkCount: 0,
       status: 'pending', // pending, processing, ready, error
       metadata: {
         title: metadata.title || filename,
         tags: metadata.tags || [],
         ...metadata,
       },
     };

     // Save to MongoDB
     await collection.insertOne(document);

     return document;
   }

  async deleteDocument(documentId) {
    const collection = await this.getCollection();

    const document = await collection.findOne({ id: documentId });
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Delete file
    try {
      await fs.unlink(document.path);
    } catch (error) {
      console.error(`Failed to delete file: ${document.path}`, error);
    }

    // Remove from MongoDB
    await collection.deleteOne({ id: documentId });

    return { success: true, documentId };
  }

  async getDocument(documentId) {
    const collection = await this.getCollection();

    const document = await collection.findOne({ id: documentId });
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    return document;
  }

  async listDocuments(filter = {}) {
    const collection = await this.getCollection();

    // Build query filter
    const query = {};
    if (filter.type) {
      query.type = filter.type;
    }
    if (filter.tag) {
      query['metadata.tags'] = filter.tag;
    }
    if (filter.status) {
      query.status = filter.status;
    }

    // Fetch and sort documents
    const documents = await collection
      .find(query)
      .sort({ uploadedAt: -1 })
      .toArray();

    return documents;
  }

  async updateDocument(documentId, updates) {
    const collection = await this.getCollection();

    const result = await collection.findOneAndUpdate(
      { id: documentId },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error(`Document not found: ${documentId}`);
    }

    return result;
  }

  async extractText(documentId) {
    await this.initialize();

    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const fileBuffer = await fs.readFile(document.path);
    const fileType = document.type;

    let text = '';

    try {
      if (fileType === 'pdf') {
        const data = await PDFParse(fileBuffer);
        text = data.text;
      } else if (fileType === 'txt' || fileType === 'md') {
        text = fileBuffer.toString('utf8');
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Clean up text
      text = text.trim();

      if (!text) {
        throw new Error('No text extracted from document');
      }

      return text;
    } catch (error) {
      console.error(`Failed to extract text from ${documentId}:`, error);
      throw error;
    }
  }

  async updateStatus(documentId, status, error = null) {
    const collection = await this.getCollection();

    const updates = { status };
    if (error) {
      updates.error = error;
    }

    const result = await collection.findOneAndUpdate(
      { id: documentId },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error(`Document not found: ${documentId}`);
    }

    return result;
  }

  async updateChunkCount(documentId, chunkCount) {
    const collection = await this.getCollection();

    const result = await collection.findOneAndUpdate(
      { id: documentId },
      { $set: { chunkCount } },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new Error(`Document not found: ${documentId}`);
    }

    return result;
  }

  getDocumentsDir() {
    return this.documentsDir;
  }
}

// Singleton instance
const documentService = new DocumentService();

module.exports = documentService;
