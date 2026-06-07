import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DEFAULT_WORKSPACE = process.env.WORKSPACE || process.env.HOME;

// ─── HTTP Server ────────────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);
app.use(express.json());

// Inject env vars into the frontend
const { readFileSync } = await import("node:fs");
const frontendHtml = readFileSync(join(__dirname, "public", "index.html"), "utf8");
const homeDir = process.env.HOME || "/home/" + (process.env.USER || "user");

app.get("/", (req, res) => {
  const modified = frontendHtml.replace(
    '<head>',
    `<head><script>window.__ENV = { HOME: ${JSON.stringify(homeDir)} };</script>`
  );
  res.send(modified);
});

// Serve static files (JS, CSS, etc.)
app.use(express.static(join(__dirname, "public")));

// Workspace state
let currentWorkspace = DEFAULT_WORKSPACE;

// ─── Workspace API ──────────────────────────────────────────────────────────

async function listDirectory(dir) {
  const { readdir, stat } = await import("node:fs/promises");
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const result = {
    path: dir,
    directories: [],
    files: []
  };

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.directories.push(entry.name);
    } else if (entry.isFile()) {
      result.files.push(entry.name);
    }
  }

  // Sort: directories first, then files, both alphabetically
  result.directories.sort();
  result.files.sort();

  return result;
}

app.get("/api/workspace", (req, res) => {
  res.json({ workspace: currentWorkspace });
});

app.post("/api/workspace", async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({ error: "Path is required" });
    }

    // Resolve relative paths
    const resolved = !path.startsWith("/") ? join(process.env.HOME, path) : path;

    // Check if directory exists
    const { stat } = await import("node:fs/promises");
    try {
      await stat(resolved);
    } catch {
      return res.status(404).json({ error: "Directory not found" });
    }

    currentWorkspace = resolved;
    console.log(`[workspace] Changed to: ${currentWorkspace}`);

    // Restart agent with new workspace
    try {
      await agent.restart();
      // Notify all clients
      for (const [id, client] of clients) {
        try {
          client.ws.send(JSON.stringify({ type: "agent_status", status: "running" }));
        } catch {}
      }
    } catch (err) {
      console.error(`[workspace] Failed to restart agent: ${err.message}`);
    }

    res.json({ workspace: currentWorkspace });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/directory", async (req, res) => {
  try {
    const dir = req.query.path || currentWorkspace;
    const result = await listDirectory(dir);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WebSocket Server ───────────────────────────────────────────────────────

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

// ─── RPC Agent Manager ──────────────────────────────────────────────────────

class RpcAgent {
  constructor() {
    this.proc = null;
    this.clientId = null;
    this.responseQueue = [];
    this.pendingRequests = new Map();
    this.isRunning = false;
    this.pendingStdout = "";
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  emit(event, ...args) {
    const fns = this.listeners.get(event) || [];
    for (const fn of fns) fn(...args);
  }

  async start() {
    // Build command args
    const args = ["--mode", "rpc", "--no-session"];

    // Check if we need to specify provider/model from settings
    const { spawnSync } = await import("node:child_process");
    const settingsResult = spawnSync("cat", [
      join(process.env.HOME, ".pi", "agent", "settings.json"),
    ], { encoding: "utf8" });

    let provider = null;
    let model = null;
    try {
      const settings = JSON.parse(settingsResult.stdout);
      if (settings.defaultProvider) provider = settings.defaultProvider;
      if (settings.defaultModel) model = settings.defaultModel;
    } catch {
      // Use defaults
    }

    if (provider) args.push("--provider", provider);
    if (model) args.push("--model", model);

    // Check for API key (skip for local providers like ollama)
    const keyEnv = this._getApiKeyForProvider(provider);
    if (keyEnv) {
      args.push("--api-key", keyEnv);
    }

    console.log(`[rpc] Starting pi with: pi ${args.join(" ")}`);
    console.log(`[rpc] Working directory: ${currentWorkspace}`);

    return new Promise((resolve, reject) => {
      this.proc = spawn("pi", args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
        cwd: currentWorkspace,
      });

      this.proc.stdout.on("data", (data) => this._handleStdout(data));
      this.proc.stderr.on("data", (data) => {
        const msg = data.toString();
        this.emit("stderr", msg);
        console.error(`[rpc stderr]`, msg.trim());
      });

      this.proc.on("exit", (code, signal) => {
        console.log(`[rpc] Exited with code ${code}, signal ${signal}`);
        this.isRunning = false;
        this.emit("exit", code, signal);
      });

      this.proc.on("error", (err) => {
        console.error(`[rpc] Error: ${err.message}`);
        this.emit("error", err);
        reject(err);
      });

      // Safety timeout - resolve after a short delay
      setTimeout(() => {
        resolve();
      }, 3000);
    });
  }

  _getApiKeyForProvider(provider) {
    if (!provider) return null;
    const envMap = {
      anthropic: "ANTHROPIC_API_KEY",
      openai: "OPENAI_API_KEY",
      google: "GOOGLE_API_KEY",
      deepseek: "DEEPSEEK_API_KEY",
      xai: "XAI_API_KEY",
      groq: "GROQ_API_KEY",
      cerebras: "CEREBRAS_API_KEY",
      openrouter: "OPENROUTER_API_KEY",
      vertex: "GOOGLE_VERTEX_KEY",
      bedrock: "AWS_ACCESS_KEY_ID",
      mistral: "MISTRAL_API_KEY",
      fireworks: "FIREWORKS_API_KEY",
      together: "TOGETHEI_API_KEY",
      openai: "OPENAI_API_KEY",
    };
    return process.env[envMap[provider] || ""];
  }

  _handleStdout(data) {
    const text = data.toString();
    this.pendingStdout += text;

    let newlineIdx;
    while ((newlineIdx = this.pendingStdout.indexOf("\n")) !== -1) {
      let line = this.pendingStdout.slice(0, newlineIdx);
      this.pendingStdout = this.pendingStdout.slice(newlineIdx + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line);
        this._dispatchEvent(parsed);
      } catch {
        // Skip unparseable lines (startup noise)
      }
    }
  }

  _dispatchEvent(event) {
    // Check if this is a response to a pending request
    if (event.type === "response" && event.id) {
      const resolver = this.pendingRequests.get(event.id);
      if (resolver) {
        this.pendingRequests.delete(event.id);
        resolver.resolve(event);
        return;
      }
    }

    // Extension UI requests need special handling
    if (event.type === "extension_ui_request") {
      this.emit("extension_ui_request", event);
      return;
    }

    // Forward events to clients
    this.emit("event", event);
  }

  async send(command) {
    if (!this.proc || !this.proc.stdin || this.proc.stdin.destroyed) {
      throw new Error("RPC agent not running");
    }
    return new Promise((resolve, reject) => {
      const id = command.id || randomUUID();
      command.id = id;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out`));
      }, 60000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.proc.stdin.write(JSON.stringify(command) + "\n");
    });
  }

  async prompt(message, options = {}) {
    return this.send({
      type: "prompt",
      message,
      streamingBehavior: options.streamingBehavior,
      images: options.images,
    });
  }

  async abort() {
    return this.send({ type: "abort" });
  }

  async getMessages() {
    const resp = await this.send({ type: "get_messages" });
    return resp.data?.messages || [];
  }

  async getState() {
    const resp = await this.send({ type: "get_state" });
    return resp.data;
  }

  async getAvailableModels() {
    const resp = await this.send({ type: "get_available_models" });
    return resp.data?.models || [];
  }

  async setModel(provider, modelId) {
    return this.send({ type: "set_model", provider, modelId });
  }

  async setThinkingLevel(level) {
    return this.send({ type: "set_thinking_level", level });
  }

  async getCommands() {
    const resp = await this.send({ type: "get_commands" });
    return resp.data?.commands || [];
  }

  async getForkMessages() {
    const resp = await this.send({ type: "get_fork_messages" });
    return resp.data?.messages || [];
  }

  async newSession() {
    return this.send({ type: "new_session" });
  }

  async compact(customInstructions) {
    return this.send({ type: "compact", customInstructions });
  }

  async exportHtml() {
    return this.send({ type: "export_html" });
  }

  stop() {
    if (this.proc) {
      // Detach exit/error handlers so killing the process doesn't
      // trigger notifications to clients (e.g. during workspace restart)
      this.proc.removeAllListeners("exit");
      this.proc.removeAllListeners("error");
      this.proc.kill("SIGTERM");
      this.proc = null;
    }
  }

  async restart() {
    console.log(`[rpc] Restarting agent with cwd: ${currentWorkspace}`);
    this.stop();
    this.isRunning = false;
    await this.start();
    this.isRunning = true;
    console.log("[rpc] Agent restarted");
  }
}

// ─── Agent Instance ─────────────────────────────────────────────────────────

const agent = new RpcAgent();

// ─── WebSocket Client Management ────────────────────────────────────────────

const clients = new Map();
let currentSessionId = null;

wss.on("connection", (ws) => {
  const clientId = randomUUID();
  clients.set(clientId, { ws, ready: false });

  // Send initial state
  ws.send(JSON.stringify({ type: "connected", clientId }));

  // If agent is running, notify new client
  if (agent.isRunning) {
    ws.send(JSON.stringify({ type: "agent_status", status: "running" }));
  }

  ws.on("message", async (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    try {
      switch (msg.type) {
        case "prompt":
          await agent.prompt(msg.message, {
            streamingBehavior: msg.streamingBehavior,
            images: msg.images || null,
          });
          ws.send(JSON.stringify({ type: "response", success: true }));
          break;

        case "abort":
          await agent.abort();
          ws.send(JSON.stringify({ type: "response", success: true }));
          break;

        case "get_messages": {
          const messages = await agent.getMessages();
          ws.send(JSON.stringify({ type: "messages", messages }));
          break;
        }

        case "get_state": {
          const state = await agent.getState();
          ws.send(JSON.stringify({ type: "state", state }));
          break;
        }

        case "get_available_models": {
          const models = await agent.getAvailableModels();
          ws.send(JSON.stringify({ type: "models", models }));
          break;
        }

        case "set_model": {
          const resp = await agent.setModel(msg.provider, msg.modelId);
          ws.send(JSON.stringify({ type: "model_set", success: resp.success, data: resp.data }));
          break;
        }

        case "set_thinking_level": {
          const resp = await agent.send({ type: "set_thinking_level", level: msg.level });
          ws.send(JSON.stringify({ type: "thinking_level_set", success: resp.success }));
          break;
        }

        case "get_commands": {
          const commands = await agent.getCommands();
          ws.send(JSON.stringify({ type: "commands", commands }));
          break;
        }

        case "get_fork_messages": {
          const messages = await agent.getForkMessages();
          ws.send(JSON.stringify({ type: "fork_messages", messages }));
          break;
        }

        case "new_session": {
          const resp = await agent.newSession();
          ws.send(JSON.stringify({ type: "session_new", success: resp.success, data: resp.data }));
          break;
        }

        case "compact": {
          const resp = await agent.compact(msg.customInstructions);
          ws.send(JSON.stringify({ type: "compacted", success: resp.success, data: resp.data }));
          break;
        }

        case "export_html": {
          const resp = await agent.exportHtml();
          ws.send(JSON.stringify({ type: "html_exported", success: resp.success, data: resp.data }));
          break;
        }

        case "extension_ui_response": {
          // Forward extension UI responses back to the agent
          await agent.send(msg);
          break;
        }

        default:
          ws.send(JSON.stringify({ type: "error", message: `Unknown command: ${msg.type}` }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", message: err.message }));
    }
  });

  ws.on("close", () => {
    clients.delete(clientId);
  });

  ws.on("error", (err) => {
    console.error(`[ws client ${clientId}] Error:`, err.message);
    clients.delete(clientId);
  });
});

// ─── Agent Event Forwarding ─────────────────────────────────────────────────

agent.on("event", (event) => {
  const data = JSON.stringify(event);
  for (const [id, client] of clients) {
    try {
      client.ws.send(data);
    } catch {
      // Client disconnected
    }
  }
});

agent.on("stderr", (msg) => {
  for (const [id, client] of clients) {
    try {
      client.ws.send(JSON.stringify({ type: "stderr", message: msg }));
    } catch {}
  }
});

agent.on("extension_ui_request", (event) => {
  for (const [id, client] of clients) {
    try {
      client.ws.send(JSON.stringify(event));
    } catch {}
  }
});

agent.on("exit", (code, signal) => {
  for (const [id, client] of clients) {
    try {
      client.ws.send(JSON.stringify({ type: "agent_exit", code, signal }));
    } catch {}
  }
});

agent.on("error", (err) => {
  for (const [id, client] of clients) {
    try {
      client.ws.send(JSON.stringify({ type: "agent_error", message: err.message }));
    } catch {}
  }
});

// ─── Start Everything ───────────────────────────────────────────────────────

async function main() {
  console.log(`[server] Starting Betty web frontend on ${HOST}:${PORT}`);
  console.log(`[server] Open http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT} in your browser`);
  console.log(`[server] Set PORT env var to change the port`);
  console.log(`[server] Set HOST env var to bind to a specific address`);
  console.log();

  try {
    await agent.start();
    agent.isRunning = true;
    console.log("[server] RPC agent started");

    // Notify all clients
    for (const [id, client] of clients) {
      try {
        client.ws.send(JSON.stringify({ type: "agent_status", status: "running" }));
      } catch {}
    }
  } catch (err) {
    console.error("[server] Failed to start RPC agent:", err.message);
    // Still start the HTTP server so clients can see an error page
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`[server] Web interface: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  });

  // Graceful shutdown
  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
}

async function shutdown() {
  console.log("\n[server] Shutting down...");
  agent.stop();
  for (const [, client] of clients) {
    client.ws.close();
  }
  wss.close();
  httpServer.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("[server] Fatal error:", err);
  process.exit(1);
});
