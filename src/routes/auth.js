const express = require('express');
const authService = require('../services/authService');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const config = require('../config');

const router = express.Router();

/**
 * GET /api/auth/setup
 * Check if first-time setup is needed
 */
router.get('/setup', async (req, res, next) => {
  try {
    const needsSetup = await authService.isFirstSetup();

    res.json({
      needsSetup,
      message: needsSetup
        ? 'First-time setup required'
        : 'Setup already complete',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/setup
 * Create initial admin user (only works if no users exist)
 */
router.post('/setup', async (req, res, next) => {
  try {
    // Check if setup is needed
    const needsSetup = await authService.isFirstSetup();
    if (!needsSetup) {
      return res.status(400).json({
        error: {
          message: 'Setup already complete',
          type: 'setup_error',
          code: 'setup_already_complete',
        },
      });
    }

    // Validate request body
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: {
          message: 'Username, email, and password are required',
          type: 'validation_error',
          code: 'missing_fields',
        },
      });
    }

    // Create admin user
    const user = await authService.createUser(username, email, password, 'admin');

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate request body
    if (!username || !password) {
      return res.status(400).json({
        error: {
          message: 'Username and password are required',
          type: 'validation_error',
          code: 'missing_credentials',
        },
      });
    }

    // Validate credentials
    const user = await authService.validateCredentials(username, password);

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid credentials',
          type: 'authentication_error',
          code: 'invalid_credentials',
        },
      });
    }

    // Create session
    const session = await authService.createSession(
      user.id,
      req.ip,
      req.get('user-agent') || ''
    );

    // Set cookie
    res.cookie(config.auth.cookieName, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      sameSite: 'lax',
      maxAge: config.auth.sessionDuration,
      path: '/',
    });

    res.json({
      success: true,
      message: 'Login successful',
      user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Destroy session and clear cookie
 */
router.post('/logout', async (req, res, next) => {
  try {
    const sessionId = req.cookies[config.auth.cookieName];

    if (sessionId) {
      await authService.destroySession(sessionId);
    }

    // Clear cookie
    res.clearCookie(config.auth.cookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', requireAuth, (req, res, next) => {
  try {
    res.json({
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/users
 * Get all users (admin only)
 */
router.get('/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/users
 * Create a new user (admin only)
 */
router.post('/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: {
          message: 'Username, email, and password are required',
          type: 'validation_error',
          code: 'missing_fields',
        },
      });
    }

    const user = await authService.createUser(username, email, password, role || 'user');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    if (error.message === 'Username already exists') {
      return res.status(400).json({
        error: {
          message: error.message,
          type: 'validation_error',
          code: 'username_exists',
        },
      });
    }
    next(error);
  }
});

/**
 * PUT /api/auth/users/:userId
 * Update a user (admin only)
 */
router.put('/users/:userId', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const user = await authService.updateUser(userId, updates);

    res.json({
      success: true,
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: {
          message: error.message,
          type: 'not_found_error',
          code: 'user_not_found',
        },
      });
    }
    next(error);
  }
});

/**
 * PUT /api/auth/users/:userId/password
 * Update a user's password (admin only)
 */
router.put('/users/:userId/password', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: {
          message: 'Password is required',
          type: 'validation_error',
          code: 'missing_password',
        },
      });
    }

    await authService.updatePassword(userId, password);

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: {
          message: error.message,
          type: 'not_found_error',
          code: 'user_not_found',
        },
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/auth/users/:userId
 * Delete a user (admin only)
 */
router.delete('/users/:userId', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        error: {
          message: 'Cannot delete your own account',
          type: 'validation_error',
          code: 'self_delete',
        },
      });
    }

    await authService.deleteUser(userId);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: {
          message: error.message,
          type: 'not_found_error',
          code: 'user_not_found',
        },
      });
    }
    next(error);
  }
});

// =====================
// API Key Management
// =====================

/**
 * GET /api/auth/api-keys
 * List current user's API keys
 */
router.get('/api-keys', requireAuth, async (req, res, next) => {
  try {
    const keys = await authService.listApiKeys(req.user.id);
    res.json({ keys });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/api-keys
 * Create a new API key for the current user
 */
router.post('/api-keys', requireAuth, async (req, res, next) => {
  try {
    const { name, expiresIn, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: {
          message: 'Name is required',
          type: 'validation_error',
          code: 'missing_name',
        },
      });
    }

    // Validate expiresIn if provided (milliseconds)
    let parsedExpiresIn = null;
    if (expiresIn !== undefined && expiresIn !== null) {
      parsedExpiresIn = parseInt(expiresIn, 10);
      if (isNaN(parsedExpiresIn) || parsedExpiresIn <= 0) {
        return res.status(400).json({
          error: {
            message: 'expiresIn must be a positive number (milliseconds)',
            type: 'validation_error',
            code: 'invalid_expires_in',
          },
        });
      }
    }

    const result = await authService.createApiKey(req.user.id, name.trim(), {
      expiresIn: parsedExpiresIn,
      description: description || '',
    });

    res.status(201).json({
      success: true,
      message: 'API key created successfully. Store this key securely - it will not be shown again.',
      apiKey: result.apiKey,
      keyData: result.keyData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/auth/api-keys/:keyId
 * Revoke or delete an API key
 */
router.delete('/api-keys/:keyId', requireAuth, async (req, res, next) => {
  try {
    const { keyId } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      await authService.deleteApiKey(keyId, req.user.id);
    } else {
      await authService.revokeApiKey(keyId, req.user.id);
    }

    res.json({
      success: true,
      message: permanent === 'true' ? 'API key deleted' : 'API key revoked',
    });
  } catch (error) {
    if (error.message === 'API key not found') {
      return res.status(404).json({
        error: {
          message: error.message,
          type: 'not_found_error',
          code: 'key_not_found',
        },
      });
    }
    if (error.message === 'Unauthorized') {
      return res.status(403).json({
        error: {
          message: 'You can only delete your own API keys',
          type: 'permission_error',
          code: 'forbidden',
        },
      });
    }
    next(error);
  }
});

module.exports = router;
