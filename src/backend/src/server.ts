import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { WebSocketHandler } from './websocket/handler.js';
import { authMiddleware } from './auth.js';
import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
import commandsRouter from './routes/commands.js';
import sessionsRouter from './routes/sessions.js';
import sessionStatsRouter from './routes/session-stats.js';

// Load environment
const PORT = parseInt(process.env.PORT || '3001', 10);
const SHARED_SECRET = process.env.SHARED_SECRET || 'dev-secret';
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: NODE_ENV === 'production'
      ? process.env.FRONTEND_ORIGIN || 'http://localhost:3001'
      : 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (no auth required)
app.use('/api/health', healthRouter);

// Auth middleware for REST API routes
app.use('/api', authMiddleware);

// REST API routes
app.use('/api/models', modelsRouter);
app.use('/api/commands', commandsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/sessions', sessionStatsRouter);

// WebSocket handler
const wss = new WebSocketServer({ noServer: true, maxPayload: 10 * 1024 * 1024 });

const wsHandler = new WebSocketHandler(wss, SHARED_SECRET, {
  cwd: process.env.CWD || process.cwd(),
  agentDir: process.env.HOME + '/.pi/agent',
});

// Handle HTTP upgrades for WebSocket
httpServer.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Health check endpoint (detailed)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connections: wsHandler.getActiveConnectionCount(),
  });
});

// Production: Serve static files
if (NODE_ENV === 'production') {
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendDist = path.join(__dirname, '../../frontend/dist');

  app.use(express.static(frontendDist, {
    maxAge: '1y',
    etag: true,
  }));

  // Catch-all route for SPA routing
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Start server
httpServer.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Shared secret: ${SHARED_SECRET ? 'configured' : 'not configured (allowing all auth)'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  httpServer.close(() => {
    wss.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  httpServer.close(() => {
    wss.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });
    process.exit(0);
  });
});

export { app, httpServer };
