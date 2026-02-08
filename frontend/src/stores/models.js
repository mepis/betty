import { defineStore } from 'pinia';
import * as api from '../api/llama';

export const useModelsStore = defineStore('models', {
  state: () => ({
    localModels: [],
    availableModels: [],
    activeModel: null,
    downloads: {},
    isLoadingCatalog: false,
    isLoadingActive: false,
    isSwitchingModel: false,
    error: null,
    searchQuery: '',
  }),

  getters: {
    /**
     * Get all models (local + available) for display
     */
    allModels: (state) => {
      const all = [...state.localModels, ...state.availableModels];
      if (!state.searchQuery) return all;

      const query = state.searchQuery.toLowerCase();
      return all.filter(model =>
        model.name.toLowerCase().includes(query) ||
        model.description?.toLowerCase().includes(query) ||
        model.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    },

    /**
     * Get only local models
     */
    localOnly: (state) => state.localModels,

    /**
     * Get only available for download
     */
    availableOnly: (state) => state.availableModels,

    /**
     * Get active downloads
     */
    activeDownloads: (state) => {
      return Object.values(state.downloads).filter(
        dl => dl.status === 'downloading'
      );
    },

    /**
     * Check if any download is in progress
     */
    hasActiveDownloads: (state) => {
      return Object.values(state.downloads).some(
        dl => dl.status === 'downloading'
      );
    },
  },

  actions: {
    /**
     * Fetch model catalog from API
     */
    async fetchCatalog() {
      this.isLoadingCatalog = true;
      this.error = null;

      try {
        const catalog = await api.getModelCatalog();
        this.localModels = catalog.local || [];
        this.availableModels = catalog.available || [];
      } catch (error) {
        this.error = error.message || 'Failed to load model catalog';
        console.error('Failed to fetch catalog:', error);
      } finally {
        this.isLoadingCatalog = false;
      }
    },

    /**
     * Fetch active model info
     */
    async fetchActiveModel() {
      this.isLoadingActive = true;
      this.error = null;

      try {
        this.activeModel = await api.getActiveModel();
      } catch (error) {
        this.error = error.message || 'Failed to load active model';
        console.error('Failed to fetch active model:', error);
      } finally {
        this.isLoadingActive = false;
      }
    },

    /**
     * Start downloading a model
     */
    async downloadModel(modelId) {
      this.error = null;

      try {
        const result = await api.downloadModel(modelId);

        // Store download info
        this.downloads[result.downloadId] = {
          downloadId: result.downloadId,
          modelId: result.modelId,
          filename: result.filename,
          status: 'downloading',
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          speed: 0,
        };

        // Start listening to progress
        this.listenToDownloadProgress(result.downloadId);

        return result.downloadId;
      } catch (error) {
        this.error = error.message || 'Failed to start download';
        throw error;
      }
    },

    /**
     * Download a model from a custom HuggingFace URL
     */
    async downloadCustomModel(url, name) {
      this.error = null;

      try {
        const result = await api.downloadCustomModel(url, name);

        // Store download info
        this.downloads[result.downloadId] = {
          downloadId: result.downloadId,
          filename: result.filename,
          status: 'downloading',
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          speed: 0,
        };

        // Start listening to progress
        this.listenToDownloadProgress(result.downloadId);

        return result.downloadId;
      } catch (error) {
        this.error = error.message || 'Failed to start download';
        throw error;
      }
    },

    /**
     * Listen to download progress via EventSource
     */
    listenToDownloadProgress(downloadId) {
      const eventSource = new EventSource(
        `/api/models/download/${downloadId}/progress`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (this.downloads[downloadId]) {
          this.downloads[downloadId] = {
            ...this.downloads[downloadId],
            ...data,
          };
        }

        // Close connection when download completes or errors
        if (data.status === 'complete' || data.status === 'error' || data.status === 'cancelled') {
          eventSource.close();

          // Refresh catalog if completed successfully
          if (data.status === 'complete') {
            this.fetchCatalog();
          }
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();

        if (this.downloads[downloadId]) {
          this.downloads[downloadId].status = 'error';
          this.downloads[downloadId].error = 'Connection lost';
        }
      };
    },

    /**
     * Cancel a download
     */
    async cancelDownload(downloadId) {
      try {
        await api.cancelDownload(downloadId);

        if (this.downloads[downloadId]) {
          this.downloads[downloadId].status = 'cancelled';
        }
      } catch (error) {
        this.error = error.message || 'Failed to cancel download';
        throw error;
      }
    },

    /**
     * Switch to a different model
     */
    async switchModel(filename) {
      this.isSwitchingModel = true;
      this.error = null;

      try {
        await api.switchModel(filename);

        // Refresh active model and catalog
        await Promise.all([
          this.fetchActiveModel(),
          this.fetchCatalog(),
        ]);

        return true;
      } catch (error) {
        this.error = error.message || 'Failed to switch model';
        throw error;
      } finally {
        this.isSwitchingModel = false;
      }
    },

    /**
     * Delete a local model
     */
    async deleteModel(filename) {
      this.error = null;

      try {
        await api.deleteModel(filename);

        // Refresh catalog
        await this.fetchCatalog();
      } catch (error) {
        this.error = error.message || 'Failed to delete model';
        throw error;
      }
    },

    /**
     * Set search query
     */
    setSearchQuery(query) {
      this.searchQuery = query;
    },

    /**
     * Clear error
     */
    clearError() {
      this.error = null;
    },

    /**
     * Initialize store - fetch initial data
     */
    async initialize() {
      await Promise.all([
        this.fetchCatalog(),
        this.fetchActiveModel(),
      ]);
    },
  },
});
