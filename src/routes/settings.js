const express = require('express');
const path = require('path');
const mongoService = require('../services/mongoService');
const embeddingServerService = require('../services/embeddingServerService');
const config = require('../config');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// Default settings
const defaultSettings = {
  temperature: 0.7,
  maxTokens: 512,
  topP: 0.95,
  systemPrompt: 'You are a helpful, friendly AI assistant.',
  embeddingModelEnabled: false,
  embeddingModelFilename: null,
};

/**
 * GET /api/settings
 * Get current system settings
 */
router.get('/', async (req, res) => {
  try {
    const collection = await mongoService.getCollection(config.mongodb.collections.settings);

    // Get settings document (there should only be one system-wide settings doc)
    const settings = await collection.findOne({ _id: 'system' });

    if (!settings) {
      // Return defaults if no settings exist yet
      return res.json({ settings: defaultSettings });
    }

    // Return settings without MongoDB _id field
    const { _id, ...settingsData } = settings;
    res.json({ settings: settingsData });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to get settings',
        type: 'server_error',
        code: 'get_settings_failed',
      },
    });
  }
});

/**
 * PUT /api/settings
 * Update system settings (admin only)
 */
router.put('/', requireRole('admin'), async (req, res) => {
  try {
    const { temperature, maxTokens, topP, systemPrompt } = req.body;

    // Validate settings
    const updates = {};

    if (temperature !== undefined) {
      if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
        return res.status(400).json({
          error: {
            message: 'Temperature must be a number between 0 and 2',
            type: 'invalid_request_error',
            code: 'invalid_temperature',
          },
        });
      }
      updates.temperature = temperature;
    }

    if (maxTokens !== undefined) {
      if (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 4096) {
        return res.status(400).json({
          error: {
            message: 'Max tokens must be a number between 1 and 4096',
            type: 'invalid_request_error',
            code: 'invalid_max_tokens',
          },
        });
      }
      updates.maxTokens = maxTokens;
    }

    if (topP !== undefined) {
      if (typeof topP !== 'number' || topP < 0 || topP > 1) {
        return res.status(400).json({
          error: {
            message: 'Top P must be a number between 0 and 1',
            type: 'invalid_request_error',
            code: 'invalid_top_p',
          },
        });
      }
      updates.topP = topP;
    }

    if (systemPrompt !== undefined) {
      if (typeof systemPrompt !== 'string') {
        return res.status(400).json({
          error: {
            message: 'System prompt must be a string',
            type: 'invalid_request_error',
            code: 'invalid_system_prompt',
          },
        });
      }
      updates.systemPrompt = systemPrompt;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: {
          message: 'No valid settings provided',
          type: 'invalid_request_error',
          code: 'no_updates',
        },
      });
    }

    const collection = await mongoService.getCollection(config.mongodb.collections.settings);

    // Upsert settings document
    const result = await collection.findOneAndUpdate(
      { _id: 'system' },
      { $set: updates },
      { upsert: true, returnDocument: 'after' }
    );

    const { _id, ...settingsData } = result;

    res.json({
      message: 'Settings updated successfully',
      settings: settingsData,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to update settings',
        type: 'server_error',
        code: 'update_settings_failed',
      },
    });
  }
});

/**
 * GET /api/settings/embedding/status
 * Get embedding server status
 */
router.get('/embedding/status', async (req, res) => {
  try {
    const status = embeddingServerService.getStatus();
    res.json({ status });
  } catch (error) {
    console.error('Get embedding status error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to get embedding status',
        type: 'server_error',
        code: 'get_embedding_status_failed',
      },
    });
  }
});

/**
 * PUT /api/settings/embedding
 * Update embedding model settings (admin only)
 */
router.put('/embedding', requireRole('admin'), async (req, res) => {
  try {
    const { enabled, modelFilename } = req.body;
    const collection = await mongoService.getCollection(config.mongodb.collections.settings);

    // Get current settings
    const currentSettings = await collection.findOne({ _id: 'system' }) || defaultSettings;
    const wasEnabled = currentSettings.embeddingModelEnabled;
    const previousModel = currentSettings.embeddingModelFilename;

    // Validate
    if (enabled && !modelFilename) {
      return res.status(400).json({
        error: {
          message: 'Model filename is required when enabling embedding server',
          type: 'invalid_request_error',
          code: 'missing_model_filename',
        },
      });
    }

    // Check model file exists if enabling
    if (enabled && modelFilename) {
      const modelsDir = path.dirname(config.llama.modelPath);
      const modelPath = path.join(modelsDir, modelFilename);
      const fs = require('fs').promises;

      try {
        await fs.access(modelPath);
      } catch (error) {
        return res.status(400).json({
          error: {
            message: `Model file not found: ${modelFilename}`,
            type: 'invalid_request_error',
            code: 'model_not_found',
          },
        });
      }
    }

    // Update settings in database
    const updates = {
      embeddingModelEnabled: !!enabled,
      embeddingModelFilename: enabled ? modelFilename : null,
    };

    await collection.findOneAndUpdate(
      { _id: 'system' },
      { $set: updates },
      { upsert: true }
    );

    // Handle embedding server state changes
    const modelsDir = path.dirname(config.llama.modelPath);

    if (enabled && modelFilename) {
      const modelPath = path.join(modelsDir, modelFilename);

      if (!wasEnabled) {
        // Start embedding server
        console.log('Starting embedding server...');
        await embeddingServerService.start(modelPath);
      } else if (previousModel !== modelFilename) {
        // Model changed, restart with new model
        console.log('Restarting embedding server with new model...');
        await embeddingServerService.restart(modelPath);
      }
      // else: already running with same model, no action needed
    } else if (wasEnabled && !enabled) {
      // Stop embedding server
      console.log('Stopping embedding server...');
      await embeddingServerService.stop();
    }

    const status = embeddingServerService.getStatus();

    res.json({
      message: 'Embedding settings updated successfully',
      settings: updates,
      status,
    });
  } catch (error) {
    console.error('Update embedding settings error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to update embedding settings',
        type: 'server_error',
        code: 'update_embedding_settings_failed',
      },
    });
  }
});

module.exports = router;
