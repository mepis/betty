const authService = require('../services/authService');
const config = require('../config');

/**
 * Auth Middleware
 * Validates API key (Bearer token) or session cookie and attaches user to request
 * Does NOT block requests - just enriches req with user if auth is valid
 */
async function authMiddleware(req, res, next) {
  try {
    // First, try API key authentication (Authorization: Bearer betty_xxx)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Check if it looks like an API key
      if (token.startsWith('betty_')) {
        const result = await authService.validateApiKey(token);

        if (result) {
          req.user = result.user;
          req.authMethod = 'apikey';
          req.apiKeyId = result.keyId;

          // Update last used (fire and forget)
          authService.updateApiKeyLastUsed(result.keyId, req.ip).catch(() => {});

          return next();
        }
      }
    }

    // Fall back to session cookie authentication
    const sessionId = req.cookies[config.auth.cookieName];

    // Debug logging for document uploads
    if (req.path === '/api/documents/upload') {
      console.log('[DEBUG] Upload request - cookies:', req.cookies);
      console.log('[DEBUG] Upload request - sessionId:', sessionId);
    }

    if (sessionId) {
      // Validate session
      const user = await authService.validateSession(sessionId);

      if (user) {
        // Attach user to request
        req.user = user;
        req.authMethod = 'session';
      }

      if (req.path === '/api/documents/upload') {
        console.log('[DEBUG] Upload request - user found:', !!user);
      }
    }

    // Continue regardless of whether user was found
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    // Don't block request on error, just continue without user
    next();
  }
}

module.exports = authMiddleware;
