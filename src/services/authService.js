const argon2 = require('argon2');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const mongoService = require('./mongoService');

/**
 * Authentication Service - Singleton
 * Manages users and sessions with MongoDB storage
 */
class AuthService {
  constructor() {
    this.usersCollection = null;
    this.sessionsCollection = null;
    this.apiKeysCollection = null;
    this.cleanupInterval = null;
  }

  /**
   * Initialize the auth service
   * Connect to MongoDB and get collections
   */
  async initialize() {
    try {
      // Get MongoDB collections
      this.usersCollection = await mongoService.getCollection(config.mongodb.collections.users);
      this.sessionsCollection = await mongoService.getCollection(config.mongodb.collections.sessions);
      this.apiKeysCollection = await mongoService.getCollection(config.mongodb.collections.apikeys);

      // Start cleanup timer
      this.startCleanupTimer();

      console.log('✓ Auth service initialized with MongoDB');
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {string} username - Username (unique)
   * @param {string} email - Email address
   * @param {string} password - Plain text password (will be hashed)
   * @param {string} role - User role ('admin' or 'user')
   * @returns {Object} Created user (without password hash)
   */
  async createUser(username, email, password, role = 'user') {
    // Validate input
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }

    if (password.length < config.auth.passwordMinLength) {
      throw new Error(`Password must be at least ${config.auth.passwordMinLength} characters`);
    }

    // Check if username already exists
    const existingUser = await this.usersCollection.findOne({ username });
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password with argon2
    const passwordHash = await argon2.hash(password, {
      type: config.auth.argon2.type,
      memoryCost: config.auth.argon2.memoryCost,
      timeCost: config.auth.argon2.timeCost,
      parallelism: config.auth.argon2.parallelism,
    });

    // Create user
    const userId = uuidv4();
    const user = {
      id: userId,
      username,
      email,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isActive: true,
      metadata: {
        displayName: username,
      },
    };

    await this.usersCollection.insertOne(user);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Validate user credentials
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Object|null} User object (without password) if valid, null otherwise
   */
  async validateCredentials(username, password) {
    // Find user by username
    const user = await this.usersCollection.findOne({ username });

    if (!user) {
      return null;
    }

    // Check if user is active
    if (!user.isActive) {
      return null;
    }

    // Verify password with argon2
    try {
      const isValid = await argon2.verify(user.passwordHash, password);
      if (!isValid) {
        return null;
      }
    } catch (error) {
      console.error('Password verification error:', error);
      return null;
    }

    // Update last login
    await this.usersCollection.updateOne(
      { id: user.id },
      { $set: { lastLogin: new Date().toISOString() } }
    );

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Create a session for a user
   * @param {string} userId - User ID
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   * @returns {Object} Session object
   */
  async createSession(userId, ipAddress, userAgent) {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.auth.sessionDuration);

    const session = {
      id: sessionId,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActive: now.toISOString(),
      ipAddress,
      userAgent,
    };

    await this.sessionsCollection.insertOne(session);

    return session;
  }

  /**
   * Validate a session
   * @param {string} sessionId - Session ID
   * @returns {Object|null} User object if session is valid, null otherwise
   */
  async validateSession(sessionId) {
    if (!sessionId) {
      return null;
    }

    const session = await this.sessionsCollection.findOne({ id: sessionId });
    if (!session) {
      return null;
    }

    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    if (now > expiresAt) {
      // Session expired - delete it
      await this.sessionsCollection.deleteOne({ id: sessionId });
      return null;
    }

    // Update last active
    await this.sessionsCollection.updateOne(
      { id: sessionId },
      { $set: { lastActive: now.toISOString() } }
    );

    // Get user
    const user = await this.usersCollection.findOne({ id: session.userId });
    if (!user || !user.isActive) {
      return null;
    }

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Destroy a session
   * @param {string} sessionId - Session ID
   */
  async destroySession(sessionId) {
    await this.sessionsCollection.deleteOne({ id: sessionId });
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object|null} User (without password hash) or null
   */
  async getUserById(userId) {
    const user = await this.usersCollection.findOne({ id: userId });
    if (!user) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Clean up expired sessions
   */
  async cleanExpiredSessions() {
    const now = new Date();

    const result = await this.sessionsCollection.deleteMany({
      expiresAt: { $lt: now.toISOString() },
    });

    if (result.deletedCount > 0) {
      console.log(`Cleaned ${result.deletedCount} expired sessions`);
    }
  }

  /**
   * Start automatic session cleanup timer
   */
  startCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredSessions().catch((err) => {
        console.error('Session cleanup error:', err);
      });
      this.cleanExpiredApiKeys().catch((err) => {
        console.error('API key cleanup error:', err);
      });
    }, config.auth.sessionCleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Check if first setup is needed
   * @returns {boolean} True if no users exist
   */
  async isFirstSetup() {
    const userCount = await this.usersCollection.countDocuments();
    return userCount === 0;
  }

  /**
   * Get statistics
   * @returns {Object} Stats
   */
  async getStats() {
    const totalUsers = await this.usersCollection.countDocuments();
    const activeSessions = await this.sessionsCollection.countDocuments();
    const firstSetupComplete = totalUsers > 0;

    return {
      totalUsers,
      activeSessions,
      firstSetupComplete,
    };
  }

  /**
   * Get all users
   * @returns {Array} List of users (without password hashes)
   */
  async getAllUsers() {
    const users = await this.usersCollection.find({}).toArray();
    return users.map(({ passwordHash, ...user }) => user);
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update (email, role, isActive, metadata)
   * @returns {Object} Updated user (without password hash)
   */
  async updateUser(userId, updates) {
    const user = await this.usersCollection.findOne({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Only allow updating specific fields
    const allowedUpdates = {};
    if (updates.email !== undefined) allowedUpdates.email = updates.email;
    if (updates.role !== undefined) allowedUpdates.role = updates.role;
    if (updates.isActive !== undefined) allowedUpdates.isActive = updates.isActive;
    if (updates.metadata !== undefined) {
      allowedUpdates.metadata = { ...user.metadata, ...updates.metadata };
    }

    if (Object.keys(allowedUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    await this.usersCollection.updateOne(
      { id: userId },
      { $set: allowedUpdates }
    );

    const updatedUser = await this.usersCollection.findOne({ id: userId });
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} newPassword - New password (plain text)
   * @returns {boolean} Success
   */
  async updatePassword(userId, newPassword) {
    const user = await this.usersCollection.findOne({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    if (newPassword.length < config.auth.passwordMinLength) {
      throw new Error(`Password must be at least ${config.auth.passwordMinLength} characters`);
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: config.auth.argon2.type,
      memoryCost: config.auth.argon2.memoryCost,
      timeCost: config.auth.argon2.timeCost,
      parallelism: config.auth.argon2.parallelism,
    });

    await this.usersCollection.updateOne(
      { id: userId },
      { $set: { passwordHash } }
    );

    return true;
  }

  /**
   * Delete user
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async deleteUser(userId) {
    const user = await this.usersCollection.findOne({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Delete user's sessions
    await this.sessionsCollection.deleteMany({ userId });

    // Delete user's API keys
    await this.apiKeysCollection.deleteMany({ userId });

    // Delete user
    await this.usersCollection.deleteOne({ id: userId });

    return true;
  }

  // =====================
  // API Key Management
  // =====================

  /**
   * Create a new API key for a user
   * @param {string} userId - User ID
   * @param {string} name - Key name
   * @param {Object} options - { expiresIn, description }
   * @returns {Object} { apiKey, keyData } - Full key (shown once) and stored data
   */
  async createApiKey(userId, name, options = {}) {
    // Validate user exists and is active
    const user = await this.usersCollection.findOne({ id: userId });
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate cryptographically secure random key
    const randomPart = crypto.randomBytes(16).toString('hex'); // 32 hex chars
    const apiKey = `betty_${randomPart}`;
    const keyPrefix = apiKey.substring(0, 14); // "betty_" + first 8 chars

    // Hash the full key for storage
    const keyHash = await argon2.hash(apiKey, {
      type: config.auth.argon2.type,
      memoryCost: config.auth.argon2.memoryCost,
      timeCost: config.auth.argon2.timeCost,
      parallelism: config.auth.argon2.parallelism,
    });

    // Calculate expiration
    let expiresAt = null;
    if (options.expiresIn) {
      expiresAt = new Date(Date.now() + options.expiresIn).toISOString();
    }

    const keyData = {
      id: uuidv4(),
      userId,
      name,
      keyPrefix,
      keyHash,
      createdAt: new Date().toISOString(),
      expiresAt,
      lastUsedAt: null,
      lastUsedIp: null,
      isActive: true,
      metadata: {
        description: options.description || '',
      },
    };

    await this.apiKeysCollection.insertOne(keyData);

    // Return both the plain key (shown once) and the stored data (without hash)
    const { keyHash: _, ...safeKeyData } = keyData;
    return { apiKey, keyData: safeKeyData };
  }

  /**
   * Validate an API key and return the associated user
   * @param {string} apiKey - The full API key
   * @returns {Object|null} { user, keyId } if valid, null otherwise
   */
  async validateApiKey(apiKey) {
    if (!apiKey || !apiKey.startsWith('betty_')) {
      return null;
    }

    const keyPrefix = apiKey.substring(0, 14);

    // Find keys with matching prefix (narrows down candidates)
    const candidates = await this.apiKeysCollection
      .find({ keyPrefix, isActive: true })
      .toArray();

    for (const candidate of candidates) {
      // Check expiration
      if (candidate.expiresAt && new Date(candidate.expiresAt) < new Date()) {
        continue; // Skip expired keys
      }

      // Verify hash
      try {
        const isValid = await argon2.verify(candidate.keyHash, apiKey);
        if (isValid) {
          // Get user
          const user = await this.usersCollection.findOne({ id: candidate.userId });
          if (!user || !user.isActive) {
            return null;
          }

          // Return user without password hash
          const { passwordHash: _, ...userWithoutPassword } = user;
          return { user: userWithoutPassword, keyId: candidate.id };
        }
      } catch (error) {
        // Hash verification failed, continue to next candidate
        continue;
      }
    }

    return null;
  }

  /**
   * Update API key last used timestamp
   * @param {string} keyId - API key ID
   * @param {string} ipAddress - IP address of the request
   */
  async updateApiKeyLastUsed(keyId, ipAddress) {
    await this.apiKeysCollection.updateOne(
      { id: keyId },
      {
        $set: {
          lastUsedAt: new Date().toISOString(),
          lastUsedIp: ipAddress,
        },
      }
    );
  }

  /**
   * List API keys for a user
   * @param {string} userId - User ID
   * @returns {Array} List of API keys (without hashes)
   */
  async listApiKeys(userId) {
    const keys = await this.apiKeysCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return keys.map(({ keyHash, ...key }) => key);
  }

  /**
   * Revoke an API key (soft delete)
   * @param {string} keyId - API key ID
   * @param {string} userId - User ID (for authorization)
   * @returns {boolean} Success
   */
  async revokeApiKey(keyId, userId) {
    const key = await this.apiKeysCollection.findOne({ id: keyId });

    if (!key) {
      throw new Error('API key not found');
    }

    if (key.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.apiKeysCollection.updateOne(
      { id: keyId },
      { $set: { isActive: false } }
    );

    return true;
  }

  /**
   * Delete an API key permanently
   * @param {string} keyId - API key ID
   * @param {string} userId - User ID (for authorization)
   * @returns {boolean} Success
   */
  async deleteApiKey(keyId, userId) {
    const key = await this.apiKeysCollection.findOne({ id: keyId });

    if (!key) {
      throw new Error('API key not found');
    }

    if (key.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.apiKeysCollection.deleteOne({ id: keyId });
    return true;
  }

  /**
   * Clean up expired API keys
   */
  async cleanExpiredApiKeys() {
    const now = new Date().toISOString();
    const result = await this.apiKeysCollection.deleteMany({
      expiresAt: { $ne: null, $lt: now },
    });

    if (result.deletedCount > 0) {
      console.log(`Cleaned ${result.deletedCount} expired API keys`);
    }
  }
}

// Export singleton instance
const authService = new AuthService();
module.exports = authService;
