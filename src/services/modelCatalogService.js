const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

// Model catalog data file
const CATALOG_DATA_FILE = path.join(__dirname, '../data/modelCatalog.json');
const METADATA_FILE = path.join(config.llama.modelPath, '../models-metadata.json');
const MODELS_DIR = path.dirname(config.llama.modelPath);

class ModelCatalogService {
  constructor() {
    this.curatedModels = [];
    this.localMetadata = {};
  }

  /**
   * Initialize the service by loading curated models and local metadata
   */
  async initialize() {
    try {
      // Load curated models from data file
      const catalogData = await fs.readFile(CATALOG_DATA_FILE, 'utf-8');
      this.curatedModels = JSON.parse(catalogData);
    } catch (error) {
      console.warn('Could not load model catalog:', error.message);
      this.curatedModels = [];
    }

    try {
      // Load local metadata
      const metadataContent = await fs.readFile(METADATA_FILE, 'utf-8');
      this.localMetadata = JSON.parse(metadataContent);
    } catch (error) {
      // File doesn't exist yet, create empty metadata
      this.localMetadata = { models: {} };
      await this.saveMetadata();
    }
  }

  /**
   * Save metadata to disk
   */
  async saveMetadata() {
    try {
      await fs.writeFile(
        METADATA_FILE,
        JSON.stringify(this.localMetadata, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save metadata:', error);
      throw error;
    }
  }

  /**
   * Scan local models directory
   * @returns {Array} List of local model files
   */
  async scanLocalModels() {
    try {
      const files = await fs.readdir(MODELS_DIR);
      const modelFiles = files.filter(file => file.endsWith('.gguf'));

      const models = [];
      for (const file of modelFiles) {
        const filePath = path.join(MODELS_DIR, file);
        try {
          const stats = await fs.stat(filePath);
          const metadata = this.localMetadata.models[file] || {};

          models.push({
            id: file,
            name: metadata.name || file.replace('.gguf', '').replace(/-/g, ' '),
            filename: file,
            path: filePath,
            size: stats.size,
            isLocal: true,
            quantization: this.extractQuantization(file),
            addedAt: metadata.addedAt || stats.birthtime.toISOString(),
            lastUsed: metadata.lastUsed || null,
            description: metadata.description || '',
            source: metadata.source || 'local',
          });
        } catch (error) {
          console.error(`Error reading model file ${file}:`, error);
        }
      }

      return models;
    } catch (error) {
      console.error('Failed to scan local models:', error);
      return [];
    }
  }

  /**
   * Extract quantization type from filename
   * @param {string} filename - Model filename
   * @returns {string} Quantization type (e.g., "Q4_K_M")
   */
  extractQuantization(filename) {
    const match = filename.match(/Q\d+_[KF]_[MSL]|Q\d+_\d+|Q\d+/i);
    return match ? match[0].toUpperCase() : 'Unknown';
  }

  /**
   * Get full model catalog (local + available for download)
   * @returns {Object} Catalog with local and available models
   */
  async getCatalog() {
    const localModels = await this.scanLocalModels();
    const localFilenames = new Set(localModels.map(m => m.filename));

    // Filter out models that are already downloaded
    const availableModels = this.curatedModels
      .filter(model => !localFilenames.has(model.filename))
      .map(model => ({
        ...model,
        isLocal: false,
      }));

    return {
      local: localModels,
      available: availableModels,
    };
  }

  /**
   * Get model info by filename
   * @param {string} filename - Model filename
   * @returns {Object|null} Model information
   */
  async getModelByFilename(filename) {
    const catalog = await this.getCatalog();

    // Check local models first
    const localModel = catalog.local.find(m => m.filename === filename);
    if (localModel) return localModel;

    // Check available models
    const availableModel = catalog.available.find(m => m.filename === filename);
    return availableModel || null;
  }

  /**
   * Add model metadata
   * @param {string} filename - Model filename
   * @param {Object} metadata - Model metadata
   */
  async addModelMetadata(filename, metadata) {
    this.localMetadata.models[filename] = {
      ...(this.localMetadata.models[filename] || {}),
      ...metadata,
      addedAt: metadata.addedAt || new Date().toISOString(),
    };
    await this.saveMetadata();
  }

  /**
   * Update last used timestamp for a model
   * @param {string} filename - Model filename
   */
  async updateLastUsed(filename) {
    if (this.localMetadata.models[filename]) {
      this.localMetadata.models[filename].lastUsed = new Date().toISOString();
      await this.saveMetadata();
    }
  }

  /**
   * Remove model metadata
   * @param {string} filename - Model filename
   */
  async removeModelMetadata(filename) {
    delete this.localMetadata.models[filename];
    await this.saveMetadata();
  }

  /**
   * Delete a local model file
   * @param {string} filename - Model filename
   */
  async deleteModel(filename) {
    const filePath = path.join(MODELS_DIR, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`Model file not found: ${filename}`);
    }

    // Delete the file
    await fs.unlink(filePath);

    // Remove metadata
    await this.removeModelMetadata(filename);
  }

  /**
   * Check if a model file exists
   * @param {string} filename - Model filename
   * @returns {boolean} True if file exists
   */
  async modelExists(filename) {
    try {
      const filePath = path.join(MODELS_DIR, filename);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get models directory path
   * @returns {string} Models directory path
   */
  getModelsDir() {
    return MODELS_DIR;
  }
}

// Singleton instance
const modelCatalogService = new ModelCatalogService();

// Initialize on startup
modelCatalogService.initialize().catch(err => {
  console.error('Failed to initialize model catalog service:', err);
});

module.exports = modelCatalogService;
