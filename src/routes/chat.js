const express = require('express');
const axios = require('axios');
const llamaService = require('../services/llamaService');

const router = express.Router();

/**
 * POST /v1/chat/completions
 * Generate chat completions from messages
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      messages,
      max_tokens = 100,
      temperature = 0.8,
      top_p = 0.95,
      top_k = 40,
      repeat_penalty = 1.1,
      stop = [],
      ...otherParams
    } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Missing or invalid field: messages (must be a non-empty array)',
          type: 'invalid_request_error',
          code: 'missing_messages',
        },
      });
    }

    // Prepare request for llama.cpp
    const llamaRequest = {
      messages,
      max_tokens,
      temperature,
      top_p,
      top_k,
      repeat_penalty,
      stop,
      stream: false,
      ...otherParams,
    };

    // Forward request to llama.cpp chat endpoint
    const response = await axios.post(
      `${llamaService.getBaseUrl()}/v1/chat/completions`,
      llamaRequest,
      { timeout: 60000 }
    );

    // llama.cpp returns OpenAI-compatible format, pass through
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
