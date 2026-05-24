import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { PiSession } from "./pi-session.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

// Store active sessions: ws → PiSession
const sessions = new Map();

// Message size limit (1MB)
const MAX_MESSAGE_SIZE = 1024 * 1024;

// Rate limiting: max messages per client per window
const RATE_LIMIT_MAX = 60; // max 60 messages
const RATE_LIMIT_WINDOW = 60000; // per 60 seconds
const clientMessageCounts = new Map(); // ws → { count, windowStart }

/**
 * Create and start a new Pi session for a WebSocket client
 */
function createPiSession(ws) {
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

  // Start the Pi subprocess
  session.start().catch((err) => {
    sendTo(ws, { type: "status", status: "error" });
    sendTo(ws, { type: "error", message: err.message });
  });

  sessions.set(ws, { id: sessionId, session });
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
 * @returns {boolean} true if within rate limit, false if exceeded
 */
function checkRateLimit(ws) {
  const now = Date.now();
  let clientData = clientMessageCounts.get(ws);

  if (!clientData || now - clientData.windowStart > RATE_LIMIT_WINDOW) {
    // Reset window
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
  const sessionData = sessions.get(ws);
  if (!sessionData) {
    sendTo(ws, { type: "error", message: "No active session. Send 'new-session' first." });
    return;
  }

  const { session } = sessionData;

  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;

    switch (parsed.type) {
      case "prompt":
        if (!parsed.content || !parsed.content.trim()) {
          sendTo(ws, { type: "error", message: "Empty message" });
          return;
        }
        // Echo user message
        sendTo(ws, { type: "message", role: "user", content: parsed.content });
        // Send to Pi
        if (!session.prompt(parsed.content)) {
          sendTo(ws, { type: "error", message: "Failed to send prompt to Pi" });
        }
        break;

      case "stop":
        if (!session.abort()) {
          sendTo(ws, { type: "error", message: "Failed to stop Pi response" });
        }
        break;

      case "new-session":
        // Clean up existing session
        if (sessionData.session) {
          sessionData.session.stop();
        }
        // Create new Pi session
        createPiSession(ws);
        break;

      default:
        sendTo(ws, { type: "error", message: `Unknown command: ${parsed.type}` });
    }
  } catch (err) {
    sendTo(ws, { type: "error", message: `Invalid message: ${err.message}` });
  }
}

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("[ws] Client connected");

  // Grace period: delay Pi session creation to avoid spawning for transient connections
  let graceTimer = setTimeout(() => {
    graceTimer = null;
    const sessionId = createPiSession(ws);
    sendTo(ws, { type: "session-started", sessionId });
  }, 1000);

  ws.on("message", (data) => {
    // If grace period is still active, create session immediately
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
      const sessionId = createPiSession(ws);
      sendTo(ws, { type: "session-started", sessionId });
    }
    // Enforce message size limit
    if (data.length > MAX_MESSAGE_SIZE) {
      sendTo(ws, { type: "error", message: "Message too large (max 1MB)" });
      return;
    }
    // Check rate limit
    if (!checkRateLimit(ws)) {
      sendTo(ws, { type: "error", message: "Rate limit exceeded. Please slow down." });
      return;
    }
    try {
      // data is a Buffer — convert to string then parse
      const text = data.toString();
      handleWsMessage(ws, text);
    } catch (err) {
      sendTo(ws, { type: "error", message: err.message });
    }
  });

  ws.on("close", () => {
    console.log("[ws] Client disconnected");
    // Clear grace timer if still pending
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    const sessionData = sessions.get(ws);
    if (sessionData?.session) {
      sessionData.session.stop();
    }
    sessions.delete(ws);
    // Clean up rate limiter
    clientMessageCounts.delete(ws);
  });

  ws.on("error", (err) => {
    console.error("[ws] Error:", err.message);
    // Clear grace timer if still pending
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    const sessionData = sessions.get(ws);
    if (sessionData?.session) {
      sessionData.session.stop();
    }
    sessions.delete(ws);
    // Clean up rate limiter
    clientMessageCounts.delete(ws);
  });
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API endpoint to list active sessions
app.get("/api/sessions", (_req, res) => {
  res.json({
    count: sessions.size,
    sessions: Array.from(sessions.keys()).map((ws) => {
      const data = sessions.get(ws);
      return { id: data.id, alive: data.session?.isAlive() };
    }),
  });
});

// Serve frontend during production
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist));

// All other routes serve the frontend (SPA fallback)
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[server] Pi Chat running on http://localhost:${PORT}`);
  console.log(`[server] WebSocket endpoint: ws://localhost:${PORT}/ws`);
});

export { app, httpServer, wss };
