/**
 * Betty — Express API Server (port 3579)
 * Hosts user auth, session CRUD, and SSE streaming routes.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDBClient, closeDBClient } from './db/client.js';
import usersRouter from './routes/users.js';
import sessionsRouter from './routes/sessions.js';
import sseRouter from './routes/sse.js';
import { authenticate } from './middleware/auth.js';
// Load environment variables
dotenv.config();
const PORT = parseInt(process.env.PORT || '3579', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const app = express();
// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '1mb' }));
// Optional authentication — attaches userId to req if token is valid
app.use(authenticate);
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// Health check (public)
app.get('/health', (_req, res) => {
    return res.json({ status: 'ok', env: NODE_ENV });
});
// User routes (register/login are public; /me requires auth via middleware chain)
app.use('/api/users', usersRouter);
// Session CRUD
app.use('/api/sessions', sessionsRouter);
// SSE streaming — require auth via the authenticate middleware above
app.use('/sse', sseRouter);
// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req, res) => {
    return res.status(404).json({ error: 'Not found' });
});
// ---------------------------------------------------------------------------
// Error handler (catches sync + async errors in route handlers)
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
    console.error('[server]', err);
    if (!res.headersSent) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ---------------------------------------------------------------------------
// Server startup — initialize DB client, then listen
// ---------------------------------------------------------------------------
let server = null;
async function start() {
    try {
        await initDBClient();
        console.log('[server] SQLite worker initialized');
        server = app.listen(PORT, () => {
            console.log(`[server] Listening on http://localhost:${PORT}`);
        });
        // Graceful shutdown
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (err) {
        console.error('[server] Failed to start:', err);
        process.exit(1);
    }
}
async function shutdown(signal) {
    console.log(`[server] Received ${signal}, shutting down...`);
    closeDBClient();
    if (server) {
        server.close(() => {
            console.log('[server] Closed');
            process.exit(0);
        });
        // Force exit after 5s if graceful shutdown stalls
        setTimeout(() => process.exit(1), 5000).unref();
    }
    else {
        process.exit(0);
    }
}
start();
//# sourceMappingURL=index.js.map