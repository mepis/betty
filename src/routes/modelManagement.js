const express = require('express');
const path = require('path');
const modelCatalogService = require('../services/modelCatalogService');
const downloadService = require('../services/downloadService');
const llamaService = require('../services/llamaService');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

/**
 * GET /api/models/catalog
 * Get full model catalog (local + available for download)
 */
router.get('/catalog', async (req, res, next) => {
  try {
    const catalog = await modelCatalogService.getCatalog();

    // Mark the active model
    const currentModelPath = llamaService.getCurrentModelPath();
    const currentFilename = path.basename(currentModelPath);

    catalog.local = catalog.local.map(model => ({
      ...model,
      isActive: model.filename === currentFilename,
    }));

    res.json(catalog);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/models/active
 * Get currently loaded model information
 */
router.get('/active', async (req, res, next) => {
  try {
    const currentModelPath = llamaService.getCurrentModelPath();
    const currentFilename = path.basename(currentModelPath);

    const model = await modelCatalogService.getModelByFilename(currentFilename);

    if (!model) {
      return res.status(404).json({
        error: {
          message: 'Active model not found in catalog',
          type: 'model_not_found',
          code: 'model_not_found',
        },
      });
    }

    res.json({
      ...model,
      isActive: true,
      path: currentModelPath,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/models/download
 * Start downloading a model (admin only)
 */
router.post('/download', requireRole('admin'), async (req, res, next) => {
  try {
    const { modelId } = req.body;

    if (!modelId) {
      return res.status(400).json({
        error: {
          message: 'Model ID is required',
          type: 'invalid_request_error',
          code: 'missing_model_id',
        },
      });
    }

    // Get model info from catalog
    const catalog = await modelCatalogService.getCatalog();
    const model = catalog.available.find(m => m.id === modelId);

    if (!model) {
      return res.status(404).json({
        error: {
          message: `Model not found: ${modelId}`,
          type: 'model_not_found',
          code: 'model_not_found',
        },
      });
    }

    // Check if already downloaded
    if (await modelCatalogService.modelExists(model.filename)) {
      return res.status(400).json({
        error: {
          message: 'Model already downloaded',
          type: 'invalid_request_error',
          code: 'model_already_exists',
        },
      });
    }

    // Start download
    const targetPath = path.join(modelCatalogService.getModelsDir(), model.filename);
    const downloadId = await downloadService.startDownload(model.url, targetPath);

    // Get the download instance to attach event handlers
    const download = downloadService.getDownload(downloadId);

    // Add metadata when download completes
    download.on('complete', async () => {
      await modelCatalogService.addModelMetadata(model.filename, {
        name: model.name,
        description: model.description,
        source: model.source,
        quantization: model.quantization,
      });
    });

    res.json({
      downloadId,
      modelId: model.id,
      filename: model.filename,
      status: 'downloading',
      progressUrl: `/api/models/download/${downloadId}/progress`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/models/download/custom
 * Download a model from a custom HuggingFace URL (admin only)
 */
router.post('/download/custom', requireRole('admin'), async (req, res, next) => {
  try {
    const { url, name } = req.body;

    if (!url) {
      return res.status(400).json({
        error: {
          message: 'URL is required',
          type: 'invalid_request_error',
          code: 'missing_url',
        },
      });
    }

    // Validate URL is from HuggingFace
    if (!url.includes('huggingface.co')) {
      return res.status(400).json({
        error: {
          message: 'Only HuggingFace URLs are supported',
          type: 'invalid_request_error',
          code: 'invalid_url',
        },
      });
    }

    // Validate URL points to a GGUF file
    if (!url.endsWith('.gguf')) {
      return res.status(400).json({
        error: {
          message: 'URL must point to a .gguf file',
          type: 'invalid_request_error',
          code: 'invalid_file_type',
        },
      });
    }

    // Extract filename from URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];

    // Check if already downloaded
    if (await modelCatalogService.modelExists(filename)) {
      return res.status(400).json({
        error: {
          message: 'Model already downloaded',
          type: 'invalid_request_error',
          code: 'model_already_exists',
        },
      });
    }

    // Start download
    const targetPath = path.join(modelCatalogService.getModelsDir(), filename);
    const downloadId = await downloadService.startDownload(url, targetPath);

    // Get the download instance to attach event handlers
    const download = downloadService.getDownload(downloadId);

    // Add metadata when download completes
    download.on('complete', async () => {
      await modelCatalogService.addModelMetadata(filename, {
        name: name || filename.replace('.gguf', '').replace(/-/g, ' '),
        description: 'Downloaded from HuggingFace',
        source: 'huggingface',
        url: url,
      });
    });

    res.json({
      downloadId,
      filename,
      status: 'downloading',
      progressUrl: `/api/models/download/${downloadId}/progress`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/models/download/:downloadId/progress
 * Get download progress via Server-Sent Events
 */
router.get('/download/:downloadId/progress', (req, res) => {
  const { downloadId } = req.params;

  const download = downloadService.getDownload(downloadId);

  if (!download) {
    return res.status(404).json({
      error: {
        message: 'Download not found',
        type: 'download_not_found',
        code: 'download_not_found',
      },
    });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial status
  res.write(`data: ${JSON.stringify(download.getStatus())}\n\n`);

  // Listen for progress events
  const onProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const onComplete = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.end();
  };

  const onError = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.end();
  };

  const onCancelled = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.end();
  };

  download.on('progress', onProgress);
  download.on('complete', onComplete);
  download.on('error', onError);
  download.on('cancelled', onCancelled);

  // Clean up event listeners when client disconnects
  req.on('close', () => {
    download.off('progress', onProgress);
    download.off('complete', onComplete);
    download.off('error', onError);
    download.off('cancelled', onCancelled);
  });
});

/**
 * DELETE /api/models/download/:downloadId
 * Cancel a download (admin only)
 */
router.delete('/download/:downloadId', requireRole('admin'), (req, res, next) => {
  try {
    const { downloadId } = req.params;

    const download = downloadService.getDownload(downloadId);

    if (!download) {
      return res.status(404).json({
        error: {
          message: 'Download not found',
          type: 'download_not_found',
          code: 'download_not_found',
        },
      });
    }

    downloadService.cancelDownload(downloadId);

    res.json({
      success: true,
      message: 'Download cancelled',
      downloadId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/models/switch
 * Switch to a different model (admin only)
 */
router.post('/switch', requireRole('admin'), async (req, res, next) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        error: {
          message: 'Model filename is required',
          type: 'invalid_request_error',
          code: 'missing_filename',
        },
      });
    }

    // Check if model exists
    if (!(await modelCatalogService.modelExists(filename))) {
      return res.status(404).json({
        error: {
          message: `Model file not found: ${filename}`,
          type: 'model_not_found',
          code: 'model_not_found',
        },
      });
    }

    // Check if already active
    const currentFilename = path.basename(llamaService.getCurrentModelPath());
    if (currentFilename === filename) {
      return res.status(400).json({
        error: {
          message: 'Model is already active',
          type: 'invalid_request_error',
          code: 'model_already_active',
        },
      });
    }

    // Check if server is already restarting
    if (llamaService.getIsRestarting()) {
      return res.status(503).json({
        error: {
          message: 'Server is currently restarting',
          type: 'server_unavailable',
          code: 'server_restarting',
        },
      });
    }

    // Restart with new model
    const modelPath = path.join(modelCatalogService.getModelsDir(), filename);

    try {
      await llamaService.restart(modelPath);

      // Update last used timestamp
      await modelCatalogService.updateLastUsed(filename);

      res.json({
        success: true,
        message: 'Model switched successfully',
        activeModel: {
          filename,
          path: modelPath,
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          message: `Failed to switch model: ${error.message}`,
          type: 'model_switch_error',
          code: 'model_switch_failed',
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/models/:filename
 * Delete a local model (admin only)
 */
router.delete('/:filename', requireRole('admin'), async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Check if model is currently active
    const currentFilename = path.basename(llamaService.getCurrentModelPath());
    if (currentFilename === filename) {
      return res.status(400).json({
        error: {
          message: 'Cannot delete the currently active model',
          type: 'invalid_request_error',
          code: 'model_in_use',
        },
      });
    }

    // Check if model exists
    if (!(await modelCatalogService.modelExists(filename))) {
      return res.status(404).json({
        error: {
          message: `Model file not found: ${filename}`,
          type: 'model_not_found',
          code: 'model_not_found',
        },
      });
    }

    // Delete the model
    await modelCatalogService.deleteModel(filename);

    res.json({
      success: true,
      message: 'Model deleted successfully',
      filename,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
