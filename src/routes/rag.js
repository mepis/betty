const express = require('express');
const ragService = require('../services/ragService');

const router = express.Router();

/**
 * POST /api/rag/search
 * Semantic search across documents
 */
router.post('/search', async (req, res) => {
  try {
    const { query, topK, minSimilarity, documentIds } = req.body;

    if (!query) {
      return res.status(400).json({
        error: {
          message: 'Missing required field: query',
          type: 'invalid_request_error',
          code: 'missing_query',
        },
      });
    }

    const results = await ragService.search(query, {
      topK,
      minSimilarity,
      documentIds,
    });

    res.json({
      results,
      query,
      count: results.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to search',
        type: 'server_error',
        code: 'search_failed',
      },
    });
  }
});

/**
 * GET /api/rag/config
 * Get current RAG configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = ragService.getConfig();
    res.json({ config });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to get configuration',
        type: 'server_error',
        code: 'get_config_failed',
      },
    });
  }
});

/**
 * PUT /api/rag/config
 * Update RAG configuration (runtime only)
 */
router.put('/config', (req, res) => {
  try {
    const updates = {
      defaultTopK: req.body.defaultTopK,
      minSimilarity: req.body.minSimilarity,
      chunkSize: req.body.chunkSize,
      chunkOverlap: req.body.chunkOverlap,
    };

    // Remove undefined values
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const config = ragService.updateConfig(updates);

    res.json({
      message: 'Configuration updated successfully',
      config,
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to update configuration',
        type: 'server_error',
        code: 'update_config_failed',
      },
    });
  }
});

/**
 * GET /api/rag/stats
 * Get RAG system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await ragService.getStats();
    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to get statistics',
        type: 'server_error',
        code: 'get_stats_failed',
      },
    });
  }
});

module.exports = router;
