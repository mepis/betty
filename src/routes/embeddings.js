const express = require('express');
const axios = require('axios');
const llamaService = require('../services/llamaService');

const router = express.Router();

/**
 * POST /v1/embeddings
 * Generate embeddings for text input
 */
router.post('/', async (req, res, next) => {
  try {
    const { input, model = 'llama', ...otherParams } = req.body;

    // Validate required fields
    if (!input) {
      return res.status(400).json({
        error: {
          message: 'Missing required field: input',
          type: 'invalid_request_error',
          code: 'missing_input',
        },
      });
    }

    // Handle both string and array inputs
    const inputs = Array.isArray(input) ? input : [input];

    // Generate embeddings for each input
    const embeddingsPromises = inputs.map(async (text, index) => {
      const response = await axios.post(
        `${llamaService.getBaseUrl()}/embedding`,
        { content: text, ...otherParams },
        { timeout: 30000 }
      );

      return {
        object: 'embedding',
        embedding: response.data.embedding,
        index,
      };
    });

    const embeddingsResults = await Promise.all(embeddingsPromises);

    // Return OpenAI-compatible response
    res.json({
      object: 'list',
      data: embeddingsResults,
      model,
      usage: {
        prompt_tokens: inputs.reduce((sum, text) => sum + text.split(/\s+/).length, 0),
        total_tokens: inputs.reduce((sum, text) => sum + text.split(/\s+/).length, 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
