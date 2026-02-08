const express = require('express');
const axios = require('axios');
const llamaService = require('../services/llamaService');

const router = express.Router();

/**
 * GET /v1/models
 * List available models
 */
router.get('/', async (req, res, next) => {
  try {
    // Forward request to llama.cpp models endpoint
    const response = await axios.get(
      `${llamaService.getBaseUrl()}/v1/models`,
      { timeout: 5000 }
    );

    // llama.cpp returns OpenAI-compatible format, pass through
    res.json(response.data);
  } catch (error) {
    // If endpoint doesn't exist, return a basic model list
    if (error.response?.status === 404) {
      return res.json({
        object: 'list',
        data: [
          {
            id: 'llama',
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'local',
            permission: [],
            root: 'llama',
            parent: null,
          },
        ],
      });
    }
    next(error);
  }
});

/**
 * GET /v1/models/:model
 * Get specific model information
 */
router.get('/:model', async (req, res, next) => {
  try {
    const { model } = req.params;

    // Try to get from llama.cpp
    try {
      const response = await axios.get(
        `${llamaService.getBaseUrl()}/v1/models/${model}`,
        { timeout: 5000 }
      );
      return res.json(response.data);
    } catch (error) {
      // If endpoint doesn't exist, return basic model info
      if (error.response?.status === 404) {
        return res.json({
          id: model,
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'local',
          permission: [],
          root: model,
          parent: null,
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
