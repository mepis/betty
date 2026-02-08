const express = require('express');
const googleDriveService = require('../services/googleDriveService');
const documentService = require('../services/documentService');
const ragService = require('../services/ragService');
const config = require('../config');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

/**
 * GET /api/google-drive/status
 * Check Google Drive configuration and connection status
 */
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const isConfigured = await googleDriveService.isConfigured();
    const isConnected = await googleDriveService.isUserConnected(req.user.id);

    res.json({
      configured: isConfigured,
      connected: isConnected,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/google-drive/configure
 * Configure Google Drive API credentials (admin only)
 */
router.post('/configure', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { clientId, clientSecret, redirectUri } = req.body;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        error: {
          message: 'Client ID and Client Secret are required',
          type: 'validation_error',
          code: 'missing_credentials',
        },
      });
    }

    await googleDriveService.saveCredentials(clientId, clientSecret, redirectUri);

    res.json({
      success: true,
      message: 'Google Drive credentials configured successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/google-drive/auth-url
 * Get OAuth2 authorization URL
 */
router.get('/auth-url', requireAuth, async (req, res, next) => {
  try {
    const authUrl = await googleDriveService.getAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    if (error.message.includes('not configured')) {
      return res.status(400).json({
        error: {
          message: error.message,
          type: 'configuration_error',
          code: 'not_configured',
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/google-drive/callback
 * OAuth2 callback handler
 */
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      // User denied access or other error
      return res.redirect('/#/documents?google_drive_error=' + encodeURIComponent(error));
    }

    if (!code || !state) {
      return res.redirect('/#/documents?google_drive_error=missing_params');
    }

    await googleDriveService.handleCallback(code, state);

    // Redirect back to documents page with success indicator
    res.redirect('/#/documents?google_drive_connected=true');
  } catch (error) {
    console.error('Google Drive callback error:', error);
    res.redirect('/#/documents?google_drive_error=' + encodeURIComponent(error.message));
  }
});

/**
 * POST /api/google-drive/disconnect
 * Disconnect user from Google Drive
 */
router.post('/disconnect', requireAuth, async (req, res, next) => {
  try {
    await googleDriveService.removeUserTokens(req.user.id);

    res.json({
      success: true,
      message: 'Disconnected from Google Drive',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/google-drive/shared-drives
 * List available shared drives (Team Drives)
 */
router.get('/shared-drives', requireAuth, async (req, res, next) => {
  try {
    const sharedDrives = await googleDriveService.listSharedDrives(req.user.id);
    res.json({ sharedDrives });
  } catch (error) {
    if (error.message.includes('not connected')) {
      return res.status(401).json({
        error: {
          message: error.message,
          type: 'authentication_error',
          code: 'not_connected',
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/google-drive/files
 * List files in a folder
 */
router.get('/files', requireAuth, async (req, res, next) => {
  try {
    const { folderId = 'root', driveId } = req.query;

    const result = await googleDriveService.listFiles(req.user.id, folderId, { driveId });
    const path = await googleDriveService.getFolderPath(req.user.id, folderId, { driveId });

    res.json({
      files: result.files,
      path,
      nextPageToken: result.nextPageToken,
    });
  } catch (error) {
    if (error.message.includes('not connected')) {
      return res.status(401).json({
        error: {
          message: error.message,
          type: 'authentication_error',
          code: 'not_connected',
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/google-drive/import
 * Import files from Google Drive
 */
router.post('/import', requireAuth, async (req, res, next) => {
  try {
    const { files, tags } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        error: {
          message: 'No files selected for import',
          type: 'validation_error',
          code: 'no_files',
        },
      });
    }

     const results = [];
     const errors = [];

     // Process files sequentially to prevent overwhelming the system
     for (const fileInfo of files) {
       try {
         // Download file from Google Drive
         const fileData = await googleDriveService.downloadFile(req.user.id, fileInfo.id);

         // Create a file object compatible with documentService
         const file = {
           originalname: fileData.name,
           stream: fileData.stream,
           size: fileData.size,
         };

         // Build metadata
         const metadata = {
           title: fileInfo.name,
           tags: tags || [],
           source: 'google_drive',
           googleDriveId: fileInfo.id,
         };

         // Upload to document service
         const document = await documentService.uploadDocument(file, metadata);

         // Add to results but don't process immediately if embedding service is not available
         // This avoids timeout issues during file import
         results.push({
           id: document.id,
           filename: document.filename,
           status: 'imported',
           message: 'Document imported successfully. Processing in background.',
         });

         // Process asynchronously in background (don't block the import)
         // Only process if RAG is enabled
         if (config.rag.enabled) {
           setTimeout(() => {
             const processPromise = ragService.processDocument(document.id).catch(err => {
               console.error(`Failed to process document ${document.id}:`, err);
             });
             // Don't await this as it could block the import
           }, 100);
         } else {
           console.log(`RAG is disabled. Skipping processing for ${document.id}`);
         }
       } catch (error) {
         errors.push({
           fileId: fileInfo.id,
           filename: fileInfo.name,
           error: error.message,
         });
       }
     }

    res.json({
      success: true,
      imported: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
