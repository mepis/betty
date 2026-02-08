const { MongoClient } = require('mongodb');
const config = require('../config');

class MongoService {
  constructor() {
    this.client = null;
    this.db = null;
    this.connected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    if (this.connected) {
      return this.db;
    }

    try {
      console.log('Connecting to MongoDB...');
      this.client = new MongoClient(config.mongodb.uri, config.mongodb.options);
      await this.client.connect();

      this.db = this.client.db(config.mongodb.database);
      this.connected = true;

      console.log(`MongoDB connected to database: ${config.mongodb.database}`);
      return this.db;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  async getDb() {
    if (!this.connected) {
      await this.connect();
    }
    return this.db;
  }

  /**
   * Get a collection
   */
  async getCollection(collectionName) {
    const db = await this.getDb();
    return db.collection(collectionName);
  }

  /**
   * Close MongoDB connection
   */
  async close() {
    if (this.client && this.connected) {
      await this.client.close();
      this.connected = false;
      console.log('MongoDB connection closed');
    }
  }

  /**
   * Initialize collections with indexes
   */
  async initializeIndexes() {
    try {
      const db = await this.getDb();

      // Documents collection indexes
      const documentsCollection = db.collection(config.mongodb.collections.documents);
      await documentsCollection.createIndex({ id: 1 }, { unique: true });
      await documentsCollection.createIndex({ status: 1 });
      await documentsCollection.createIndex({ uploadedAt: -1 });
      await documentsCollection.createIndex({ 'metadata.tags': 1 });

      // Chunks collection indexes
      const chunksCollection = db.collection(config.mongodb.collections.chunks);
      await chunksCollection.createIndex({ id: 1 }, { unique: true });
      await chunksCollection.createIndex({ documentId: 1 });
      await chunksCollection.createIndex({ documentId: 1, index: 1 });

      // Vectors collection indexes
      const vectorsCollection = db.collection(config.mongodb.collections.vectors);
      await vectorsCollection.createIndex({ chunkId: 1 }, { unique: true });
      await vectorsCollection.createIndex({ documentId: 1 });

      // Users collection indexes
      const usersCollection = db.collection(config.mongodb.collections.users);
      await usersCollection.createIndex({ id: 1 }, { unique: true });
      await usersCollection.createIndex({ username: 1 }, { unique: true });
      await usersCollection.createIndex({ email: 1 });
      await usersCollection.createIndex({ isActive: 1 });

      // Sessions collection indexes
      const sessionsCollection = db.collection(config.mongodb.collections.sessions);
      await sessionsCollection.createIndex({ id: 1 }, { unique: true });
      await sessionsCollection.createIndex({ userId: 1 });
      await sessionsCollection.createIndex({ expiresAt: 1 });

      // Settings collection - no indexes needed (single document)
      // The settings collection stores system-wide settings with _id: 'system'

      console.log('MongoDB indexes created successfully');
    } catch (error) {
      console.error('Failed to create MongoDB indexes:', error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

// Singleton instance
const mongoService = new MongoService();

module.exports = mongoService;
