const express = require('express');
const axios = require('axios');
const llamaService = require('../services/llamaService');

const router = express.Router();

/**
 * POST /v1/completions
 * Generate text completions from a prompt
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      prompt,
      max_tokens = 100,
      temperature = 0.8,
      top_p = 0.95,
      top_k = 40,
      repeat_penalty = 1.1,
      stop = [],
      ...otherParams
    } = req.body;

    // Validate required fields
    if (!prompt) {
      return res.status(400).json({
        error: {
          message: 'Missing required field: prompt',
          type: 'invalid_request_error',
          code: 'missing_prompt',
        },
      });
    }

    // Prepare request for llama.cpp
    const llamaRequest = {
      prompt,
      n_predict: max_tokens,
      temperature,
      top_p,
      top_k,
      repeat_penalty,
      stop,
      stream: false,
      ...otherParams,
    };

    // Forward request to llama.cpp
    const response = await axios.post(
      `${llamaService.getBaseUrl()}/completion`,
      llamaRequest,
      { timeout: 60000 }
    );

    // Return OpenAI-compatible response
    res.json({
      id: `cmpl-${Date.now()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: 'llama',
      choices: [
        {
          text: response.data.content,
          index: 0,
          logprobs: null,
          finish_reason: response.data.stop ? 'stop' : 'length',
        },
      ],
      usage: {
        prompt_tokens: response.data.tokens_evaluated || 0,
        completion_tokens: response.data.tokens_predicted || 0,
        total_tokens: (response.data.tokens_evaluated || 0) + (response.data.tokens_predicted || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
