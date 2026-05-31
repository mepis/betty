import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer } from "ws";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const PI_BIN = process.env.PI_BIN || "pi";
const PI_MODE = process.env.PI_MODE || "rpc";

// ---------------------------------------------------------------------------
// Express – serve the Vue SPA
// ---------------------------------------------------------------------------
const app = express();
const dist = resolve(__dirname, "../../frontend/dist");

// Serve built frontend
app.use(express.static(dist));

// ---------------------------------------------------------------------------
// REST API – static data endpoints
// ---------------------------------------------------------------------------

// Default commands based on the RPC commands supported by the server
const DEFAULT_COMMANDS = [
  { name: "help", description: "Show help information" },
  { name: "status", description: "Show current status" },
  { name: "clear", description: "Clear the current session" },
  { name: "compact", description: "Compact the conversation history" },
  { name: "export", description: "Export session as HTML" },
  { name: "model", description: "Show or change model" },
  { name: "new", description: "Start a new session" },
  { name: "fork", description: "Fork the current session" },
];

// Default tools based on the RPC commands supported by the server
const DEFAULT_TOOLS = [
  { name: "bash", description: "Execute a bash command" },
  { name: "prompt", description: "Send a chat prompt" },
  { name: "steer", description: "Provide steering feedback" },
  { name: "follow_up", description: "Send a follow-up message" },
  { name: "abort", description: "Abort the current operation" },
  { name: "clone", description: "Clone a session" },
];

// In-memory cache for RPC-sourced data
let cachedVersion = { version: "", name: "", status: "unavailable" };
let cachedCommands = DEFAULT_COMMANDS;
let cachedTools = DEFAULT_TOOLS;
let lastRpcState = null;

// Listen for RPC state updates to cache version/model info
function broadcastWithCache(obj) {
  // Cache version and model info from RPC state
  if (obj.type === "state" && obj.status === "ready") {
    cachedVersion = {
      version: obj.version || "",
      name: obj.name || "",
      status: obj.status || "ready",
    };
    lastRpcState = obj;
  }
  if (obj.type === "model_change" || obj.type === "model_list") {
    cachedVersion.model = obj.model || cachedVersion.model;
  }
  broadcast(obj);
}

// Override broadcast to use cache-aware version
const originalBroadcast = broadcast;

app.get("/api/agent/version", (_req, res) => {
  // Try to get version from RPC if we have recent state
  if (lastRpcState) {
    res.json({
      version: lastRpcState.version || cachedVersion.version || "",
      name: lastRpcState.name || cachedVersion.name || "",
      status: lastRpcState.status || cachedVersion.status || "unavailable",
    });
  } else {
    res.json(cachedVersion);
  }
});

app.get("/api/agent/commands", (_req, res) => {
  res.json(cachedCommands);
});

app.get("/api/agent/tools", (_req, res) => {
  res.json(cachedTools);
});

// Catch-all for SPA routing – serve index.html (MUST be last)
app.get("*", (_req, res) => {
  res.sendFile(resolve(dist, "index.html"));
});

const httpServer = app.listen(PORT, () => {
  console.log(`pi-web listening on http://localhost:${PORT}`);
});

// ---------------------------------------------------------------------------
// WebSocket server – one pi RPC child process shared across all clients
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server: httpServer });

const rpc = spawn(PI_BIN, ["--mode", PI_MODE], {
  stdio: ["pipe", "pipe", "pipe"],
});

rpc.stderr.on("data", (chunk) => {
  console.error(`[pi-rpc stderr] ${chunk.toString().trim()}`);
});

rpc.on("close", (code) => {
  console.error(`[pi-rpc] exited with code ${code}`);
  broadcast({ type: "error", error: `pi RPC process exited with code ${code}` });
  // Attempt to restart the pi RPC process
  setTimeout(() => {
    console.log("[pi-rpc] attempting restart...");
    try {
      const newRpc = spawn(PI_BIN, ["--mode", PI_MODE], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      // Replace the old rpc reference
      Object.assign(rpc, newRpc);
      rpcBuffer = "";
      console.log("[pi-rpc] restarted");
      broadcast({ type: "state", status: "ready", message: "pi RPC restarted" });
    } catch (err) {
      console.error("[pi-rpc] restart failed:", err.message);
    }
  }, 2000);
});

// ---------------------------------------------------------------------------
// JSONL parser – reads complete lines from pi stdout
// ---------------------------------------------------------------------------
let rpcBuffer = "";

rpc.stdout.on("data", (chunk) => {
  rpcBuffer += chunk.toString();
  let newlineIdx;
  while ((newlineIdx = rpcBuffer.indexOf("\n")) !== -1) {
    const line = rpcBuffer.slice(0, newlineIdx).trim();
    rpcBuffer = rpcBuffer.slice(newlineIdx + 1);
    if (!line) continue;
    try {
      const json = JSON.parse(line);
      broadcast(json);
    } catch {
      console.error(`[pi-rpc] unparseable line: ${line.slice(0, 120)}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Send JSONL to pi stdin
// ---------------------------------------------------------------------------
function sendToPi(obj) {
  if (!rpc.stdin.writable) return;
  try {
    rpc.stdin.write(JSON.stringify(obj) + "\n");
  } catch (err) {
    console.error("[pi-rpc] write failed:", err.message);
  }
}

// ---------------------------------------------------------------------------
// Broadcast JSON to all connected WebSocket clients
// ---------------------------------------------------------------------------
function broadcast(obj) {
  const payload = JSON.stringify(obj);
  for (const ws of wss.clients) {
    if (ws.readyState === 1) {
      ws.send(payload);
    }
  }
}

// ---------------------------------------------------------------------------
// Handle WebSocket connections
// ---------------------------------------------------------------------------
wss.on("connection", (ws) => {
  console.log("[ws] client connected");

  // Send current session state on connect
  sendToPi({ type: "get_state" });

  ws.on("message", (raw) => {
    let obj;
    try {
      obj = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
      return;
    }

    // Client commands forwarded to pi RPC
    switch (obj.type) {
      case "prompt":
        sendToPi({
          type: "prompt",
          message: obj.message,
          ...(obj.images && { images: obj.images }),
        });
        break;
      case "steer":
        sendToPi({ type: "steer", message: obj.message });
        break;
      case "follow_up":
        sendToPi({ type: "follow_up", message: obj.message });
        break;
      case "abort":
        sendToPi({ type: "abort" });
        break;
      case "bash":
        sendToPi({ type: "bash", command: obj.command });
        break;
      case "get_state":
        sendToPi({ type: "get_state" });
        break;
      case "get_messages":
        sendToPi({ type: "get_messages" });
        break;
      case "set_model":
        sendToPi({ type: "set_model", model: obj.model });
        break;
      case "cycle_model":
        sendToPi({ type: "cycle_model", direction: obj.direction || "next" });
        break;
      case "compact":
        sendToPi({ type: "compact" });
        break;
      case "new_session":
        sendToPi({ type: "new_session" });
        break;
      case "switch_session":
        sendToPi({ type: "switch_session", id: obj.id });
        break;
      case "fork":
        sendToPi({ type: "fork" });
        break;
      case "clone":
        sendToPi({ type: "clone", id: obj.id });
        break;
      case "export_html":
        sendToPi({ type: "export_html" });
        break;
      default:
        ws.send(JSON.stringify({ type: "error", error: `Unknown command: ${obj.type}` }));
    }
  });

  ws.on("close", () => {
    console.log("[ws] client disconnected");
  });

  ws.on("error", (err) => {
    console.error("[ws] client error:", err.message);
  });
});
