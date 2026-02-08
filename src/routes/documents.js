const express = require('express');
const multer = require('multer');
const config = require('../config');
const documentService = require('../services/documentService');
const ragService = require('../services/ragService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: config.rag.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (config.rag.allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} not allowed. Allowed types: ${config.rag.allowedTypes.join(', ')}`));
    }
  },
});

/**
 * POST /api/documents/upload
 * Upload a new document
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          message: 'No file provided',
          type: 'invalid_request_error',
          code: 'missing_file',
        },
      });
    }

    // Extract metadata from request body
    const metadata = {
      title: req.body.title || req.file.originalname,
      tags: req.body.tags
        ? req.body.tags.split(',').map(t => t.trim()).filter(t => t)
        : [],
    };

    // Upload document
    const document = await documentService.uploadDocument(req.file, metadata);

    // Process document asynchronously
    ragService
      .processDocument(document.id)
      .then(() => {
        console.log(`Document ${document.id} processed successfully`);
      })
      .catch((error) => {
        console.error(`Failed to process document ${document.id}:`, error);
      });

    res.status(201).json({ document });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to upload document',
        type: 'server_error',
        code: 'upload_failed',
      },
    });
  }
});

/**
 * POST /api/documents/submit
 * Submit text content as a new document
 */
router.post('/submit', async (req, res) => {
  try {
    const { content, title, tags, format = 'txt' } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        error: {
          message: 'Missing or invalid field: content (must be a non-empty string)',
          type: 'invalid_request_error',
          code: 'missing_content',
        },
      });
    }

    // Validate format
    const allowedFormats = ['txt', 'md'];
    if (!allowedFormats.includes(format)) {
      return res.status(400).json({
        error: {
          message: `Invalid format: ${format}. Allowed formats: ${allowedFormats.join(', ')}`,
          type: 'invalid_request_error',
          code: 'invalid_format',
        },
      });
    }

    // Create a virtual file object
    const filename = `${title || 'document'}.${format}`;
    const file = {
      originalname: filename,
      buffer: Buffer.from(content, 'utf8'),
    };

    // Extract metadata
    const metadata = {
      title: title || filename,
      tags: Array.isArray(tags) ? tags : [],
      source: 'text_submission',
    };

    // Upload document
    const document = await documentService.uploadDocument(file, metadata);

    // Process document asynchronously
    ragService
      .processDocument(document.id)
      .then(() => {
        console.log(`Document ${document.id} processed successfully`);
      })
      .catch((error) => {
        console.error(`Failed to process document ${document.id}:`, error);
      });

    res.status(201).json({ document });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to submit document',
        type: 'server_error',
        code: 'submit_failed',
      },
    });
  }
});

/**
 * GET /api/documents
 * List all documents
 */
router.get('/', async (req, res) => {
  try {
    const filter = {
      type: req.query.type,
      tag: req.query.tag,
      status: req.query.status,
    };

    const documents = await documentService.listDocuments(filter);

    res.json({ documents });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to list documents',
        type: 'server_error',
        code: 'list_failed',
      },
    });
  }
});

/**
 * GET /api/documents/:id
 * Get a specific document
 */
router.get('/:id', async (req, res) => {
  try {
    const document = await documentService.getDocument(req.params.id);
    res.json({ document });
  } catch (error) {
    console.error('Get document error:', error);

    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      error: {
        message: error.message || 'Failed to get document',
        type: 'server_error',
        code: 'get_failed',
      },
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', async (req, res) => {
  try {
    await ragService.deleteDocumentData(req.params.id);

    res.json({
      success: true,
      message: 'Document deleted successfully',
      documentId: req.params.id,
    });
  } catch (error) {
    console.error('Delete document error:', error);

    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      error: {
        message: error.message || 'Failed to delete document',
        type: 'server_error',
        code: 'delete_failed',
      },
    });
  }
});

/**
 * POST /api/documents/:id/reprocess
 * Reprocess a document (re-chunk and re-embed)
 */
router.post('/:id/reprocess', async (req, res) => {
  try {
    const options = {
      chunkSize: req.body.chunkSize,
      overlap: req.body.overlap,
    };

    const result = await ragService.reprocessDocument(req.params.id, options);

    res.json(result);
  } catch (error) {
    console.error('Reprocess document error:', error);

    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      error: {
        message: error.message || 'Failed to reprocess document',
        type: 'server_error',
        code: 'reprocess_failed',
      },
    });
  }
});

/**
 * GET /api/documents/:id/chunks
 * Get chunks for a document
 */
router.get('/:id/chunks', async (req, res) => {
  try {
    const chunkingService = require('../services/chunkingService');
    const chunks = await chunkingService.getChunksByDocument(req.params.id);

    res.json({ chunks, count: chunks.length });
  } catch (error) {
    console.error('Get chunks error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Failed to get chunks',
        type: 'server_error',
        code: 'get_chunks_failed',
      },
    });
  }
});

module.exports = router;
