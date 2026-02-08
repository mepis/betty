const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const requireAuth = require('./middleware/requireAuth');
const requireRole = require('./middleware/requireRole');
const llamaService = require('./services/llamaService');
const embeddingServerService = require('./services/embeddingServerService');
const authService = require('./services/authService');
const mongoService = require('./services/mongoService');

// Check if frontend build exists
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
const hasFrontend = fs.existsSync(frontendPath);

// Check if docs build exists
const docsPath = path.join(__dirname, '..', 'docs', '.vuepress', 'dist');
const hasDocs = fs.existsSync(docsPath);

// Import routes
const authRoute = require('./routes/auth');
const completionsRoute = require('./routes/completions');
const chatRoute = require('./routes/chat');
const embeddingsRoute = require('./routes/embeddings');
const modelsRoute = require('./routes/models');
const modelManagementRoute = require('./routes/modelManagement');
const documentsRoute = require('./routes/documents');
const ragRoute = require('./routes/rag');
const settingsRoute = require('./routes/settings');
const googleDriveRoute = require('./routes/googleDrive');
const promptsRoute = require('./routes/prompts');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: true, // Allow same-origin requests
  credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());
app.use(logger);
app.use(authMiddleware); // Validate session and attach user to req

// Health check endpoint
app.get('/health', (req, res) => {
  const llamaStatus = llamaService.getStatus();
  const embeddingStatus = embeddingServerService.getStatus();
  res.json({
    status: 'ok',
    llamaServer: llamaStatus,
    embeddingServer: embeddingStatus,
    uptime: process.uptime(),
  });
});

// Public API Routes (no auth required)
app.use('/api/auth', authRoute);

// Protected API Routes (auth required)
app.use('/v1/completions', requireAuth, completionsRoute);
app.use('/v1/chat/completions', requireAuth, chatRoute);
app.use('/v1/embeddings', requireAuth, embeddingsRoute);
app.use('/v1/models', requireAuth, modelsRoute);
app.use('/api/models', requireAuth, modelManagementRoute);
app.use('/api/documents', requireAuth, documentsRoute);
app.use('/api/rag', requireAuth, ragRoute);
app.use('/api/settings', requireAuth, settingsRoute);
app.use('/api/prompts', requireAuth, promptsRoute);
app.use('/api/google-drive', googleDriveRoute); // Has its own auth middleware

// Serve documentation at /docs route
if (hasDocs) {
  app.use('/docs', express.static(docsPath));
}

// Serve frontend static files if built
if (hasFrontend) {
  app.use(express.static(frontendPath));
}

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Betty llama.cpp REST API',
    version: '1.0.0',
    endpoints: [
      'POST /v1/completions',
      'POST /v1/chat/completions',
      'POST /v1/embeddings',
      'GET /v1/models',
      'GET /health',
      'GET /api/models/catalog',
      'GET /api/models/active',
      'POST /api/models/download',
      'POST /api/models/switch',
      'DELETE /api/models/:filename',
      'POST /api/shutdown',
    ],
  });
});

// Shutdown endpoint (admin only)
app.post('/api/shutdown', requireAuth, requireRole('admin'), (req, res) => {
  console.log('\nShutdown requested from frontend');
  res.json({ message: 'Server shutting down...' });

  // Delay shutdown slightly to allow response to be sent
  setTimeout(() => {
    shutdown('API request');
  }, 100);
});

// SPA fallback - serve index.html for non-API routes
if (hasFrontend) {
  app.get('*', (req, res, next) => {
    // Skip API routes and docs route
    if (req.path.startsWith('/v1/') || req.path === '/health' || req.path === '/api' || req.path.startsWith('/docs')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      type: 'invalid_request_error',
      code: 'not_found',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handler
let isShuttingDown = false;
const shutdown = async (signal) => {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }
  isShuttingDown = true;

  console.log(`\nReceived ${signal}, shutting down gracefully...`);

  // Stop auth cleanup timer
  authService.stopCleanupTimer();

  // Close Express server and wait for it
  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        console.log('HTTP server closed');
        resolve();
      });
    });
  }

  // Close MongoDB connection
  await mongoService.close();

  // Stop embedding server if running
  await embeddingServerService.stop();

  // Stop llama.cpp server
  await llamaService.stop();

  console.log('All services stopped. Exiting...');
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
let server;

async function startServer() {
  try {
    console.log('Betty llama.cpp REST API');
    console.log('=========================\n');

    // Initialize MongoDB connection
    console.log('Initializing MongoDB...');
    await mongoService.connect();
    await mongoService.initializeIndexes();
    console.log('✓ MongoDB initialized\n');

    // Initialize auth service
    await authService.initialize();

    // Start llama.cpp server
    await llamaService.start();

    // Start embedding server if enabled in settings
    try {
      const settingsCollection = await mongoService.getCollection(config.mongodb.collections.settings);
      const settings = await settingsCollection.findOne({ _id: 'system' });

      if (settings && settings.embeddingModelEnabled && settings.embeddingModelFilename) {
        const modelsDir = path.dirname(config.llama.modelPath);
        const modelPath = path.join(modelsDir, settings.embeddingModelFilename);

        console.log('\nStarting embedding server...');
        await embeddingServerService.start(modelPath);
        console.log(`✓ Embedding server started with model: ${settings.embeddingModelFilename}`);
      }
    } catch (error) {
      console.warn('Warning: Failed to start embedding server:', error.message);
      // Continue without embedding server - will fall back to main server
    }

    // Start Express server with port retry logic
    const maxPortRetries = 10;
    let retryCount = 0;

    const tryPort = (port) => {
      return new Promise((resolve, reject) => {
        server = app.listen(port, config.host)
          .on('listening', () => {
            console.log(`\n✓ API server listening on ${config.host}:${port}`);
            if (port !== config.port) {
              console.log(`  (Port ${config.port} was in use, using ${port} instead)`);
            }
            console.log(`✓ Base URL: http://${config.host}:${port}`);
            console.log(`✓ llama.cpp server: ${llamaService.getBaseUrl()}`);
            if (embeddingServerService.getIsRunning()) {
              console.log(`✓ Embedding server: ${embeddingServerService.getBaseUrl()}`);
            }
            if (hasFrontend) {
              console.log(`✓ Frontend: serving from ${frontendPath}`);
            } else {
              console.log(`✗ Frontend: not built (run 'cd frontend && npm run build')`);
            }
            if (hasDocs) {
              console.log(`✓ Documentation: available at /docs`);
            } else {
              console.log(`✗ Documentation: not built (run 'npm run docs:build')`);
            }
            console.log('\nAvailable endpoints:');
            console.log('  POST   /v1/completions');
            console.log('  POST   /v1/chat/completions');
            console.log('  POST   /v1/embeddings');
            console.log('  GET    /v1/models');
            console.log('  GET    /health');
            console.log('  GET    /api\n');
            resolve(port);
          })
          .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              if (retryCount < maxPortRetries) {
                retryCount++;
                const nextPort = port + 1;
                console.log(`Port ${port} is in use, trying ${nextPort}...`);
                resolve(tryPort(nextPort));
              } else {
                reject(new Error(`Could not find an available port after trying ${config.port} to ${port}`));
              }
            } else {
              reject(err);
            }
          });
      });
    };

    await tryPort(config.port);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
