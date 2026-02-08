require('dotenv').config();

const config = {
  // API Server Configuration
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',

  // llama.cpp Configuration
  llama: {
    port: parseInt(process.env.LLAMA_PORT) || 8080,
    host: process.env.LLAMA_HOST || 'localhost',
    executable: process.env.LLAMA_EXECUTABLE || './llama.cpp/build/bin/llama-server',
    modelPath: process.env.MODEL_PATH || './models/model.gguf',
    contextSize: parseInt(process.env.CONTEXT_SIZE) || 4096,
    threads: parseInt(process.env.THREADS) || 4,
    batchSize: parseInt(process.env.BATCH_SIZE) || 512,
    seed: parseInt(process.env.SEED) || -1,

    // GPU Configuration
    gpuLayers: parseInt(process.env.GPU_LAYERS) || -1, // -1 = all layers
    mainGpu: parseInt(process.env.MAIN_GPU) || 0,
    splitMode: process.env.SPLIT_MODE || 'row', // none, layer, row
    tensorSplit: process.env.TENSOR_SPLIT || '', // e.g., "12,12,16" for 3 GPUs
    flashAttention: process.env.FLASH_ATTENTION || 'auto', // on, off, or auto
  },

  // Health check configuration
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 5000,
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 60000,
    retries: parseInt(process.env.HEALTH_CHECK_RETRIES) || 15,
  },

  // Embedding server configuration (separate llama.cpp instance for embeddings)
  embedding: {
    port: parseInt(process.env.EMBEDDING_PORT) || 8082,
    host: process.env.EMBEDDING_HOST || 'localhost',
    contextSize: parseInt(process.env.EMBEDDING_CONTEXT_SIZE) || 512,
    threads: parseInt(process.env.EMBEDDING_THREADS) || 2,
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE) || 512,
    gpuLayers: parseInt(process.env.EMBEDDING_GPU_LAYERS) || 0, // CPU by default to save GPU memory
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'dev',

  // RAG Configuration
  rag: {
    enabled: process.env.RAG_ENABLED === 'true',
    documentsDir: process.env.RAG_DOCUMENTS_DIR || './models/documents',
    vectorsDir: process.env.RAG_VECTORS_DIR || './models/vectors',

    // Chunking
    chunkSize: parseInt(process.env.RAG_CHUNK_SIZE) || 512,
    chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP) || 128,
    maxChunksPerDocument: parseInt(process.env.RAG_MAX_CHUNKS) || 1000,

    // Search
    defaultTopK: parseInt(process.env.RAG_DEFAULT_TOP_K) || 5,
    minSimilarity: parseFloat(process.env.RAG_MIN_SIMILARITY) || 0.7,

    // File limits
    maxFileSize: parseInt(process.env.RAG_MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: (process.env.RAG_ALLOWED_TYPES || 'pdf,txt,md').split(','),

    // Processing
    batchSize: parseInt(process.env.RAG_BATCH_SIZE) || 10, // Embeddings per batch
  },

  // Authentication Configuration
  auth: {
    sessionDuration: parseInt(process.env.SESSION_DURATION) || 8 * 60 * 60 * 1000, // 8 hours
    sessionCleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL) || 60 * 60 * 1000, // 1 hour
    cookieName: 'betty-session',
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
    argon2: {
      type: 2, // argon2id
      memoryCost: parseInt(process.env.ARGON2_MEMORY_COST) || 65536, // 64 MB
      timeCost: parseInt(process.env.ARGON2_TIME_COST) || 3,
      parallelism: parseInt(process.env.ARGON2_PARALLELISM) || 4,
    },
  },

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'betty',
    options: {
      maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT) || 5000,
    },
    // Collections
    collections: {
      documents: 'documents',
      chunks: 'chunks',
      vectors: 'vectors',
      users: 'users',
      sessions: 'sessions',
      settings: 'settings',
      apikeys: 'apikeys',
      prompts: 'prompts',
    },
    // Vector search configuration
    vectorSearch: {
      enabled: process.env.MONGODB_VECTOR_SEARCH === 'true', // Atlas Vector Search
      indexName: process.env.MONGODB_VECTOR_INDEX || 'vector_index',
    },
  },
};

module.exports = config;
