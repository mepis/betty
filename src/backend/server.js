import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { PiSession } from "./pi-session.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

// Database & Auth
import { initializeDatabase, cleanupExpiredSessions } from "./db/database.js";
import { seedBuiltInRoles, seedDefaultAdmin } from "./db/seeds.js";
import * as bcrypt from "bcryptjs";
import {
  extractWsToken,
  checkWsPermission,
  validateWsToken,
} from "./auth/ws-auth.js";

// API Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import roleRoutes from "./routes/roles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Initialize Database
// ============================================================
initializeDatabase();
seedBuiltInRoles();
await seedDefaultAdmin(bcrypt);
console.log("[db] Database initialized and seeded");

// ============================================================
// Express App
// ============================================================
const app = express();
const httpServer = createServer(app);

// Parse JSON bodies
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://100.105.3.99:5173",
  ];
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global error handler for malformed JSON and other middleware errors
app.use((err, req, res, _next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  // Generic fallback for unhandled errors
  console.error("[server] Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// API endpoint to list active sessions
app.get("/api/sessions", (_req, res) => {
  res.json({
    count: activeSessions.size,
    sessions: Array.from(activeSessions.values()).map((data) => ({
      id: data.id,
      userId: data.userId || null,
      alive: data.session?.isAlive(),
    })),
  });
});

// ============================================================
// WebSocket Server
// ============================================================
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

// Store active sessions: ws → { id, session, user }
const activeSessions = new Map();

// Message size limit (1MB)
const MAX_MESSAGE_SIZE = 1024 * 1024;

// Rate limiting: max messages per client per window
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW = 60000;
const clientMessageCounts = new Map();

/**
 * Create and start a new Pi session for a WebSocket client
 */
async function createPiSession(ws, user) {
  const sessionId = uuidv4();
  const session = new PiSession();

  // Forward Pi events to the WebSocket client
  session.on("status", (status) => {
    sendTo(ws, { type: "status", status, sessionId });
  });

  session.on("message", (msg) => {
    sendTo(ws, { type: "message", role: msg.role, content: msg.content });
  });

  session.on("stream", (content) => {
    sendTo(ws, { type: "stream", content });
  });

  session.on("tool-call", (toolCall) => {
    sendTo(ws, { type: "tool-call", ...toolCall });
  });

  session.on("tool-result", (toolResult) => {
    sendTo(ws, { type: "tool-result", ...toolResult });
  });

  session.on("error", (error) => {
    sendTo(ws, { type: "error", message: error });
  });

  // Start the Pi session
  await session.start();

  activeSessions.set(ws, {
    id: sessionId,
    session,
    user,
    userId: user?.id || null,
  });
  return sessionId;
}

/**
 * Safely send JSON to a WebSocket client
 */
function sendTo(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.error(`[ws] Send failed: ${err.message}`);
    }
  }
}

/**
 * Check rate limit for a WebSocket client
 */
function checkRateLimit(ws) {
  const now = Date.now();
  let clientData = clientMessageCounts.get(ws);

  if (!clientData || now - clientData.windowStart > RATE_LIMIT_WINDOW) {
    clientData = { count: 1, windowStart: now };
    clientMessageCounts.set(ws, clientData);
    return true;
  }

  clientData.count++;
  if (clientData.count > RATE_LIMIT_MAX) {
    return false;
  }
  return true;
}

/**
 * Handle incoming WebSocket messages
 */
function handleWsMessage(ws, data) {
  const sessionData = activeSessions.get(ws);
  if (!sessionData) {
    sendTo(ws, {
      type: "error",
      message: "No active session. Send 'new-session' first.",
    });
    return;
  }

  const { session, user } = sessionData;

  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;

    switch (parsed.type) {
      case "prompt":
        if (!parsed.content || !parsed.content.trim()) {
          sendTo(ws, { type: "error", message: "Empty message" });
          return;
        }
        // Check chat:use permission
        if (user && !checkWsPermission(user, "chat", "use")) {
          sendTo(ws, { type: "error", message: "Permission denied: chat:use" });
          return;
        }
        // Echo user message
        sendTo(ws, { type: "message", role: "user", content: parsed.content });
        // Send to Pi
        session.prompt(parsed.content).catch((err) => {
          sendTo(ws, { type: "error", message: err.message });
        });
        break;

      case "stop":
        session.abort().catch((err) => {
          sendTo(ws, { type: "error", message: err.message });
        });
        break;

      case "delete-message":
        if (!parsed.content || !parsed.content.trim()) {
          sendTo(ws, { type: "error", message: "Cannot delete empty message" });
          return;
        }
        // Check sessions:update permission
        if (user && !checkWsPermission(user, "sessions", "update")) {
          sendTo(ws, {
            type: "error",
            message: "Permission denied: sessions:update",
          });
          return;
        }
        const deleted = session.deleteMessage(
          parsed.role,
          parsed.content.trim(),
        );
        if (!deleted) {
          sendTo(ws, {
            type: "error",
            message: "Message not found in context",
          });
        }
        break;

      case "new-session":
        // Check sessions:create permission
        if (user && !checkWsPermission(user, "sessions", "create")) {
          sendTo(ws, {
            type: "error",
            message: "Permission denied: sessions:create",
          });
          return;
        }
        // Clean up existing session
        if (sessionData.session) {
          sessionData.session.stop();
        }
        // Create new Pi session
        createPiSession(ws, user).catch((err) => {
          sendTo(ws, { type: "error", message: err.message });
        });
        break;

      default:
        sendTo(ws, {
          type: "error",
          message: `Unknown command: ${parsed.type}`,
        });
    }
  } catch (err) {
    sendTo(ws, { type: "error", message: `Invalid message: ${err.message}` });
  }
}

// WebSocket connection handler
wss.on("connection", (ws, request) => {
  console.log("[ws] Client connected");

  // Extract and validate auth token
  const token = extractWsToken(request);
  const user = token ? validateWsToken(token) : null;

  if (user) {
    console.log(
      `[ws] Authenticated user: ${user.username} (${user.role_name || "unknown role"})`,
    );
  } else {
    console.log("[ws] Unauthenticated connection");
  }

  // Grace period: delay Pi session creation
  let graceTimer = setTimeout(async () => {
    graceTimer = null;
    try {
      const sessionId = await createPiSession(ws, user);
      sendTo(ws, { type: "session-started", sessionId });
      if (user) {
        sendTo(ws, {
          type: "auth-ok",
          user: {
            id: user.id,
            username: user.username,
            role: user.role_name,
          },
        });
      }
    } catch (err) {
      sendTo(ws, { type: "status", status: "error" });
      sendTo(ws, { type: "error", message: err.message });
    }
  }, 1000);

  ws.on("message", async (data) => {
    // If grace period is still active, create session immediately
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
      try {
        const sessionId = await createPiSession(ws, user);
        sendTo(ws, { type: "session-started", sessionId });
        if (user) {
          sendTo(ws, {
            type: "auth-ok",
            user: {
              id: user.id,
              username: user.username,
              role: user.role_name,
            },
          });
        }
      } catch (err) {
        sendTo(ws, { type: "status", status: "error" });
        sendTo(ws, { type: "error", message: err.message });
      }
    }

    // Enforce message size limit
    if (data.length > MAX_MESSAGE_SIZE) {
      sendTo(ws, { type: "error", message: "Message too large (max 1MB)" });
      return;
    }

    // Check rate limit
    if (!checkRateLimit(ws)) {
      sendTo(ws, {
        type: "error",
        message: "Rate limit exceeded. Please slow down.",
      });
      return;
    }

    try {
      const text = data.toString();
      handleWsMessage(ws, text);
    } catch (err) {
      sendTo(ws, { type: "error", message: err.message });
    }
  });

  ws.on("close", () => {
    console.log("[ws] Client disconnected");
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    const sessionData = activeSessions.get(ws);
    if (sessionData?.session) {
      sessionData.session.stop();
    }
    activeSessions.delete(ws);
    clientMessageCounts.delete(ws);
  });

  ws.on("error", (err) => {
    console.error("[ws] Error:", err.message);
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    const sessionData = activeSessions.get(ws);
    if (sessionData?.session) {
      sessionData.session.stop();
    }
    activeSessions.delete(ws);
    clientMessageCounts.delete(ws);
  });
});

// ============================================================
// Serve Frontend
// ============================================================
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

// ============================================================
// Start Server
// ============================================================
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[server] Pi Chat running on http://localhost:${PORT}`);
  console.log(`[server] WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log("[server] Default admin: admin / admin123");
});

// Cleanup expired sessions periodically
setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // Every hour

export { app, httpServer, wss };
