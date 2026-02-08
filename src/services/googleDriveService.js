const { OAuth2Client } = require('google-auth-library');
const mongoService = require('./mongoService');
const config = require('../config');

// Lazy load googleapis (it's large)
let googleApi = null;
function getGoogle() {
  if (!googleApi) {
    const { google } = require('googleapis');
    googleApi = google;
  }
  return googleApi;
}

class GoogleDriveService {
  constructor() {
    this.oauth2Client = null;
    this.settingsCollection = null;
    this.initialized = false;
    this.mongoService = mongoService;
  }

  async initialize() {
    // Set up MongoDB connection if not done yet
    if (!this.initialized) {
      await this.mongoService.connect();
      this.settingsCollection = await this.mongoService.getCollection(config.mongodb.collections.settings);
      this.initialized = true;
    }

    // Always check if OAuth2 client needs to be created (credentials may have been added after first init)
    if (!this.oauth2Client) {
      const settings = await this.settingsCollection.findOne({ key: 'googleDrive' });
      const credentials = settings?.credentials || null;
      if (credentials?.clientId && credentials?.clientSecret) {
        this.oauth2Client = new OAuth2Client(
          credentials.clientId,
          credentials.clientSecret,
          credentials.redirectUri || `${this.getBaseUrl()}/api/google-drive/callback`
        );
      }
    }
  }

  getBaseUrl() {
    const port = config.port || 3000;
    const host = config.host === '0.0.0.0' ? 'localhost' : config.host;
    return `http://${host}:${port}`;
  }

  /**
   * Get stored Google API credentials from settings
   */
  async getStoredCredentials() {
    await this.initialize();
    const settings = await this.settingsCollection.findOne({ key: 'googleDrive' });
    return settings?.credentials || null;
  }

  /**
   * Save Google API credentials to settings
   */
  async saveCredentials(clientId, clientSecret, redirectUri) {
    await this.initialize();

    await this.settingsCollection.updateOne(
      { key: 'googleDrive' },
      {
        $set: {
          key: 'googleDrive',
          credentials: { clientId, clientSecret, redirectUri },
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Reinitialize OAuth2 client with new credentials
    this.oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri || `${this.getBaseUrl()}/api/google-drive/callback`
    );

    return true;
  }

  /**
   * Get stored OAuth tokens for a user
   */
  async getUserTokens(userId) {
    await this.initialize();
    const settings = await this.settingsCollection.findOne({ key: `googleDriveTokens:${userId}` });
    return settings?.tokens || null;
  }

  /**
   * Save OAuth tokens for a user
   */
  async saveUserTokens(userId, tokens) {
    await this.initialize();

    await this.settingsCollection.updateOne(
      { key: `googleDriveTokens:${userId}` },
      {
        $set: {
          key: `googleDriveTokens:${userId}`,
          tokens,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return true;
  }

  /**
   * Remove OAuth tokens for a user (disconnect)
   */
  async removeUserTokens(userId) {
    await this.initialize();
    await this.settingsCollection.deleteOne({ key: `googleDriveTokens:${userId}` });
    return true;
  }

  /**
   * Check if Google Drive is configured
   */
  async isConfigured() {
    const credentials = await this.getStoredCredentials();
    return !!(credentials?.clientId && credentials?.clientSecret);
  }

  /**
   * Check if a user is connected to Google Drive
   */
  async isUserConnected(userId) {
    const tokens = await this.getUserTokens(userId);
    return !!tokens?.access_token;
  }

  /**
   * Generate OAuth2 authorization URL
   */
  async getAuthUrl(userId) {
    await this.initialize();

    if (!this.oauth2Client) {
      throw new Error('Google Drive not configured. Please set up API credentials first.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ];

    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async handleCallback(code, state) {
    await this.initialize();

    if (!this.oauth2Client) {
      throw new Error('Google Drive not configured');
    }

    const { tokens } = await this.oauth2Client.getToken(code);

    // Decode state to get userId
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Save tokens for user
    await this.saveUserTokens(userId, tokens);

    return { success: true, userId };
  }

   /**
    * Get authenticated Drive client for a user
    */
   async getDriveClient(userId) {
     await this.initialize();

     if (!this.oauth2Client) {
       throw new Error('Google Drive not configured');
     }

     const tokens = await this.getUserTokens(userId);
     if (!tokens) {
       throw new Error('User not connected to Google Drive');
     }

     // Create a new OAuth2 client with user's tokens
     const credentials = await this.getStoredCredentials();
     const userClient = new OAuth2Client(
       credentials.clientId,
       credentials.clientSecret,
       credentials.redirectUri
     );
     userClient.setCredentials(tokens);

     // Handle token refresh
     userClient.on('tokens', async (newTokens) => {
       const updatedTokens = { ...tokens, ...newTokens };
       await this.saveUserTokens(userId, updatedTokens);
     });

     return getGoogle().drive({ version: 'v3', auth: userClient });
   }

   /**
    * Check if embedding server is available for processing
    * @returns {boolean} True if embedding server is available
    */
   isEmbeddingServerAvailable() {
     // Simple check to determine if embeddings are ready to process
     // This can be expanded to include actual health checks
     return true; // For now, assume it's available and let error handling in the pipeline catch issues
   }

  /**
   * List shared drives (Team Drives) available to the user
   */
  async listSharedDrives(userId) {
    const drive = await this.getDriveClient(userId);

    const response = await drive.drives.list({
      pageSize: 100,
      fields: 'drives(id, name, kind)',
    });

    return response.data.drives || [];
  }

  /**
   * List files in a folder
   * @param {string} userId - User ID
   * @param {string} folderId - Folder ID (use 'root' for My Drive root)
   * @param {object} options - Options including driveId for shared drives
   */
  async listFiles(userId, folderId = 'root', options = {}) {
    const drive = await this.getDriveClient(userId);

    const allowedMimeTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.google-apps.folder',
    ];

    // Build query
    let query = `'${folderId}' in parents and trashed = false`;

    // Filter by supported file types (include folders for navigation)
    const mimeTypeQuery = allowedMimeTypes
      .map(type => `mimeType = '${type}'`)
      .join(' or ');
    query += ` and (${mimeTypeQuery})`;

    const params = {
      q: query,
      pageSize: 100,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, parents)',
      orderBy: 'folder,name',
    };

    // For shared drives, include additional parameters
    if (options.driveId) {
      params.driveId = options.driveId;
      params.includeItemsFromAllDrives = true;
      params.supportsAllDrives = true;
      params.corpora = 'drive';
    } else {
      params.includeItemsFromAllDrives = true;
      params.supportsAllDrives = true;
    }

    const response = await drive.files.list(params);

    // Transform files to include type info
    const files = (response.data.files || []).map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      size: file.size ? parseInt(file.size) : 0,
      modifiedTime: file.modifiedTime,
      type: this.getFileType(file.mimeType, file.name),
    }));

    return {
      files,
      nextPageToken: response.data.nextPageToken,
    };
  }

  /**
   * Get file type from mime type or extension
   */
  getFileType(mimeType, filename) {
    if (mimeType === 'application/vnd.google-apps.folder') return 'folder';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType === 'text/plain') return 'txt';
    if (mimeType === 'text/markdown') return 'md';

    // Fallback to extension
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['pdf', 'txt', 'md'].includes(ext)) return ext;

    return 'unknown';
  }

   /**
    * Download a file from Google Drive
    * @param {string} userId - User ID
    * @param {string} fileId - Google Drive file ID
    * @returns {ReadableStream} File content as stream
    */
   async downloadFile(userId, fileId) {
     const drive = await this.getDriveClient(userId);

     // Get file metadata first
     const metadata = await drive.files.get({
       fileId,
       fields: 'id, name, mimeType, size',
       supportsAllDrives: true,
     });

     const file = metadata.data;

     // Check file size limit (10MB)
     if (file.size && parseInt(file.size) > config.rag.maxFileSize) {
       throw new Error(`File too large. Maximum size is ${config.rag.maxFileSize / 1024 / 1024}MB`);
     }

     // Download file content as stream to avoid keeping entire buffer in memory
     const response = await drive.files.get(
       { fileId, alt: 'media', supportsAllDrives: true },
       { responseType: 'stream' }
     );

     return {
       stream: response.data,
       name: file.name,
       mimeType: file.mimeType,
       size: file.size,
     };
   }

  /**
   * Get folder path (breadcrumbs)
   */
  async getFolderPath(userId, folderId, options = {}) {
    if (folderId === 'root') {
      return [{ id: 'root', name: 'My Drive' }];
    }

    const drive = await this.getDriveClient(userId);
    const path = [];
    let currentId = folderId;

    while (currentId && currentId !== 'root' && typeof currentId === 'string') {
      try {
        const response = await drive.files.get({
          fileId: currentId,
          fields: 'id, name, parents',
          supportsAllDrives: true,
        });

        path.unshift({ id: response.data.id, name: response.data.name });
        currentId = response.data.parents?.[0];
      } catch (error) {
        break;
      }
    }

    // Add root
    if (options.driveId) {
      // For shared drives, get the drive name
      try {
        const driveResponse = await drive.drives.get({
          driveId: options.driveId,
          fields: 'id, name',
        });
        path.unshift({ id: options.driveId, name: driveResponse.data.name, isSharedDrive: true });
      } catch (error) {
        path.unshift({ id: options.driveId, name: 'Shared Drive', isSharedDrive: true });
      }
    } else {
      path.unshift({ id: 'root', name: 'My Drive' });
    }

    return path;
  }
}

// Singleton instance
const googleDriveService = new GoogleDriveService();

module.exports = googleDriveService;
