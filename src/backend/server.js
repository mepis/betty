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

// Serve Vue 3 frontend (built with Vite)
const { readFileSync, existsSync } = await import("node:fs");
const homeDir = process.env.HOME || "/home/" + (process.env.USER || "user");
const frontendDist = join(__dirname, "..", "frontend", "dist");

// Check if we have a built frontend or fall back to dev mode
const hasBuiltFrontend = existsSync(frontendDist);

if (hasBuiltFrontend) {
  // Production: serve from dist/
  const frontendHtml = readFileSync(join(frontendDist, "index.html"), "utf8");

  app.get("/", (req, res) => {
    const modified = frontendHtml.replace(
      '<head>',
      `<head><script>window.__ENV = { HOME: ${JSON.stringify(homeDir)} };</script>`
    );
    res.send(modified);
  });

  app.use(express.static(frontendDist));
} else {
  // Dev mode: serve from public/ (fallback)
  const fallbackHtml = readFileSync(join(__dirname, "..", "frontend", "public", "index.html"), "utf8");

  app.get("/", (req, res) => {
    const modified = fallbackHtml.replace(
      '<head>',
      `<head><script>window.__ENV = { HOME: ${JSON.stringify(homeDir)} };</script>`
    );
    res.send(modified);
  });

  app.use(express.static(join(__dirname, "..", "frontend", "public")));
}

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

        // ─── Benchmark Commands ─────────────────────────────────────────────
        case "benchmark_start": {
          const resp = await benchmark.start();
          ws.send(JSON.stringify({ type: "benchmark_start_response", ...resp }));
          break;
        }

        case "benchmark_stop": {
          const resp = benchmark.stop();
          ws.send(JSON.stringify({ type: "benchmark_stop_response", ...resp }));
          break;
        }

        case "benchmark_get_config": {
          if (!benchmark.config) {
            await benchmark.loadConfig();
          }
          ws.send(JSON.stringify({ type: "benchmark_config", config: benchmark.config }));
          break;
        }

        case "benchmark_get_results": {
          const results = await benchmark.getResults();
          ws.send(JSON.stringify({ type: "benchmark_results", results }));
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

// ─── Benchmark Manager ──────────────────────────────────────────────────────

class BenchmarkManager {
  constructor() {
    this.proc = null;
    this.isRunning = false;
    this.config = null;
    this.results = [];
    this.listeners = new Map();
    this.benchmarkDir = join(__dirname, '..', 'benchmark');
    // Live metrics state
    this.currentTestRun = 0;
    this.liveResults = [];
    this.benchmarkStatus = 'idle';
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  emit(event, ...args) {
    const fns = this.listeners.get(event) || [];
    for (const fn of fns) fn(...args);
  }

  async loadConfig() {
    const { readFileSync } = await import('node:fs');
    try {
      const configPath = join(this.benchmarkDir, 'configs.json');
      this.config = JSON.parse(readFileSync(configPath, 'utf8'));
      return this.config;
    } catch (err) {
      console.error(`[benchmark] Failed to load config: ${err.message}`);
      return null;
    }
  }

  async start() {
    if (this.isRunning) {
      return { success: false, reason: 'Benchmark is already running' };
    }

    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config) {
      return { success: false, reason: 'Failed to load benchmark config' };
    }

    const { spawn } = await import('node:child_process');

    console.log('[benchmark] Starting benchmark script...');
    this.benchmarkStatus = 'building';
    this.currentTestRun = 0;
    this.liveResults = [];
    this.emit('status', 'building');

    this.proc = spawn('node', ['index.js'], {
      cwd: this.benchmarkDir,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.isRunning = true;

    this.proc.stdout.on('data', (data) => {
      const text = data.toString();
      this.emit('stdout', text);
      console.log(`[benchmark stdout] ${text.trim()}`);
      this.parseLogOutput(text);
    });

    this.proc.stderr.on('data', (data) => {
      const text = data.toString();
      this.emit('stderr', text);
      console.error(`[benchmark stderr] ${text.trim()}`);
    });

    this.proc.on('close', (code) => {
      this.isRunning = false;
      this.proc = null;
      console.log(`[benchmark] Exited with code ${code}`);
      if (code === 0) {
        this.benchmarkStatus = 'idle';
        this.emit('status', 'idle', { testRun: this.currentTestRun, liveResults: this.liveResults, finished: true });
      } else {
        this.benchmarkStatus = 'error';
        this.emit('status', 'error', { error: `Process exited with code ${code}`, testRun: this.currentTestRun, liveResults: this.liveResults, finished: true });
      }
      this.emit('exit', code);
    });

    this.proc.on('error', (err) => {
      this.isRunning = false;
      this.proc = null;
      console.error(`[benchmark] Error: ${err.message}`);
      this.benchmarkStatus = 'error';
      this.emit('status', 'error', { error: err.message, testRun: this.currentTestRun, liveResults: this.liveResults, finished: true });
      this.emit('error', err.message);
    });

    return { success: true };
  }

  // Parse benchmark log output for live metrics (matches api-server.js format)
  parseLogOutput(text) {
    // Parse "========== Test Run #N =========="
    const runMatch = text.match(/Test Run #(\d+)/);
    if (runMatch) {
      this.currentTestRun = parseInt(runMatch[1], 10);
      this.benchmarkStatus = 'testing';
      this.emit('status', 'testing', { testRun: this.currentTestRun, liveResults: this.liveResults });
    }

    // Parse "Avg gen tokens/sec:    XXX"
    const genMatch = text.match(/Avg gen tokens\/sec:\s+([\d.]+)/);
    const promptMatch = text.match(/Avg prompt tokens\/sec:\s+([\d.]+)/);
    const totalGenMatch = text.match(/Total tokens:\s+([\d.]+)\s*\(gen\)/);
    const totalPromptMatch = text.match(/Total tokens:\s+[\d.]+\s*\(gen\) \/ ([\d.]+)/);
    const totalTimeMatch = text.match(/Total time \(all msgs\):\s+([\d.]+)\s*ms/);
    const memMatch = text.match(/Avg Mem Used \(GB\):\s+([\d.]+)/);

    if (genMatch && promptMatch) {
      const runId = this.currentTestRun;
      const existingIdx = this.liveResults.findIndex((r) => r.testRunId === runId);

      const result = {
        testRunId: runId,
        avgGenTokensPerSec: parseFloat(genMatch[1]),
        avgPromptTokensPerSec: parseFloat(promptMatch[1]),
        totalGenTokens: totalGenMatch ? parseFloat(totalGenMatch[1]) : null,
        totalPromptTokens: totalPromptMatch ? parseFloat(totalPromptMatch[1]) : null,
        totalTimeMs: totalTimeMatch ? parseFloat(totalTimeMatch[1]) : null,
        avgMemUsed: memMatch ? parseFloat(memMatch[1]) : null,
      };

      if (existingIdx >= 0) {
        this.liveResults[existingIdx] = result;
      } else {
        this.liveResults.push(result);
      }

      this.emit('results', { liveResults: this.liveResults });
    }
  }

  stop() {
    if (!this.proc) return { success: false, reason: 'Benchmark is not running' };

    console.log('[benchmark] Stopping benchmark...');
    this.benchmarkStatus = 'stopped';
    this.emit('status', 'stopped', { testRun: this.currentTestRun, liveResults: this.liveResults });
    this.proc.kill('SIGTERM');

    // Force kill after 5 seconds
    setTimeout(() => {
      if (this.proc) {
        this.proc.kill('SIGKILL');
      }
    }, 5000);

    return { success: true };
  }

  getStatus() {
    return {
      running: this.isRunning,
      config: this.config,
    };
  }

  async getResults() {
    const { readFileSync } = await import('node:fs');
    try {
      const resultsPath = join(this.benchmarkDir, 'results.md');
      return readFileSync(resultsPath, 'utf8');
    } catch (err) {
      return '# No results yet\n\nStart the benchmark to generate results.';
    }
  }
}

const benchmark = new BenchmarkManager();

// ─── API Routes ─────────────────────────────────────────────────────────────

app.get('/api/benchmark/config', async (req, res) => {
  if (!benchmark.config) {
    await benchmark.loadConfig();
  }
  res.json(benchmark.config);
});

app.post('/api/benchmark/start', async (req, res) => {
  const result = await benchmark.start();
  res.json(result);
});

app.post('/api/benchmark/stop', (req, res) => {
  const result = benchmark.stop();
  res.json(result);
});

app.get('/api/benchmark/status', async (req, res) => {
  res.json(benchmark.getStatus());
});

app.get('/api/benchmark/results', async (req, res) => {
  const results = await benchmark.getResults();
  res.json({ results });
});

// ─── Benchmark REST API (for benchmark frontend) ────────────────────────────

const BENCHMARK_DIR = join(__dirname, '..', 'benchmark');
const CONFIGS_FILE = join(BENCHMARK_DIR, 'configs.json');
const RESULTS_FILE = join(BENCHMARK_DIR, 'results.md');
const REPORTS_DIR = join(BENCHMARK_DIR, 'reports');

// Ensure reports directory exists
const { mkdirSync: _mkdirSync, writeFileSync: _writeFileSync, readdirSync: _readdirSync, unlinkSync: _unlinkSync, statSync: _statSync } = await import('node:fs');
if (!existsSync(REPORTS_DIR)) {
  _mkdirSync(REPORTS_DIR, { recursive: true });
}

// In-memory state for REST API
let benchmarkSSEClients = new Set();
let sseHeartbeats = new Map();

// Config endpoints
app.get('/api/configs', (req, res) => {
  try {
    const configs = JSON.parse(readFileSync(CONFIGS_FILE, 'utf8'));
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/configs', (req, res) => {
  try {
    const configs = req.body;
    _writeFileSync(CONFIGS_FILE, JSON.stringify(configs, null, 2));
    res.json({ success: true, message: 'Config saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: benchmark.benchmarkStatus,
    testRun: benchmark.currentTestRun,
    liveResults: benchmark.liveResults,
    processAlive: benchmark.proc ? true : false,
  });
});

// SSE stream endpoint
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = { res };
  benchmarkSSEClients.add(client);

  // Send initial status
  sendSSE(client, 'status', {
    status: benchmark.benchmarkStatus,
    testRun: benchmark.currentTestRun,
    liveResults: benchmark.liveResults,
  });

  // Send heartbeat
  const heartbeat = setInterval(() => {
    sendSSE(client, 'heartbeat', { ts: Date.now() });
  }, 15000);

  sseHeartbeats.set(client, heartbeat);

  req.on('close', () => {
    benchmarkSSEClients.delete(client);
    clearInterval(heartbeat);
    sseHeartbeats.delete(client);
  });
});

function sendSSE(client, event, data) {
  if (!benchmarkSSEClients.has(client)) return;
  try {
    client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {}
}

// Run endpoint
app.post('/api/run', async (req, res) => {
  if (benchmark.isRunning) {
    return res.status(409).json({
      success: false,
      error: 'Benchmark is already running',
    });
  }

  try {
    const result = await benchmark.start();
    if (result.success) {
      res.json({ success: true, message: 'Benchmark started' });
    } else {
      res.status(500).json({ success: false, error: result.reason });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stop endpoint
app.post('/api/stop', (req, res) => {
  const result = benchmark.stop();
  res.json(result);
});

// Results endpoint
app.get('/api/results', (req, res) => {
  try {
    const content = existsSync(RESULTS_FILE) ? readFileSync(RESULTS_FILE, 'utf8') : '';
    res.json({ success: true, data: content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reports endpoints
app.get('/api/reports', (req, res) => {
  try {
    const files = existsSync(REPORTS_DIR)
      ? _readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json'))
      : [];
    const reports = files.map(file => {
      const stats = _statSync(join(REPORTS_DIR, file));
      const name = file.replace(/\.json$/, '');
      return {
        name,
        filename: file,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    }).sort((a, b) => b.modified - a.modified);
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/report/:name', (req, res) => {
  try {
    const filePath = join(REPORTS_DIR, `${req.params.name}.json`);
    if (!existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/report', (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ success: false, error: 'name and data required' });
    }
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = join(REPORTS_DIR, `${safeName}.json`);
    _writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, message: 'Report saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/report/:name', (req, res) => {
  try {
    const filePath = join(REPORTS_DIR, `${req.params.name}.json`);
    if (!existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    _unlinkSync(filePath);
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save current results as report
app.post('/api/save-report', (req, res) => {
  try {
    const { name } = req.body;
    const safeName = name || `benchmark-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}`;
    const mdContent = existsSync(RESULTS_FILE) ? readFileSync(RESULTS_FILE, 'utf8') : '';
    const configs = existsSync(CONFIGS_FILE) ? JSON.parse(readFileSync(CONFIGS_FILE, 'utf8')) : {};

    const report = {
      name: safeName,
      savedAt: new Date().toISOString(),
      mdContent,
      liveResults: benchmark.liveResults,
      configs,
    };

    const filePath = join(REPORTS_DIR, `${safeName}.json`);
    _writeFileSync(filePath, JSON.stringify(report, null, 2));
    res.json({ success: true, message: `Report saved as ${safeName}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Wire benchmark events to SSE clients ───────────────────────────────────

benchmark.on('stdout', (text) => {
  // Forward to SSE clients
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: log\ndata: ${JSON.stringify({ type: 'stdout', text, status: benchmark.benchmarkStatus, testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults })}\n\n`);
    } catch {}
  }
  // Also forward to WebSocket clients
  const wsData = JSON.stringify({ type: 'benchmark_stdout', message: text });
  for (const [id, client] of clients) {
    try { client.ws.send(wsData); } catch {}
  }
});

benchmark.on('stderr', (text) => {
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: log\ndata: ${JSON.stringify({ type: 'stderr', text, status: benchmark.benchmarkStatus, testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults })}\n\n`);
    } catch {}
  }
  const wsData = JSON.stringify({ type: 'benchmark_stderr', message: text });
  for (const [id, client] of clients) {
    try { client.ws.send(wsData); } catch {}
  }
});

benchmark.on('status', (status, extra) => {
  const payload = { status, testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults, ...extra };
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: status\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch {}
  }
  const wsData = JSON.stringify({ type: 'benchmark_status', status, testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults });
  for (const [id, client] of clients) {
    try { client.ws.send(wsData); } catch {}
  }
});

benchmark.on('exit', (code) => {
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: status\ndata: ${JSON.stringify({ status: 'idle', testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults, finished: true, code })}\n\n`);
    } catch {}
  }
  const wsData = JSON.stringify({ type: 'benchmark_exit', code });
  for (const [id, client] of clients) {
    try { client.ws.send(wsData); } catch {}
  }
});

benchmark.on('error', (message) => {
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: status\ndata: ${JSON.stringify({ status: 'error', error: message, finished: true, testRun: benchmark.currentTestRun, liveResults: benchmark.liveResults })}\n\n`);
    } catch {}
  }
  const wsData = JSON.stringify({ type: 'benchmark_error', message });
  for (const [id, client] of clients) {
    try { client.ws.send(wsData); } catch {}
  }
});

benchmark.on('results', ({ liveResults }) => {
  for (const client of benchmarkSSEClients) {
    try {
      client.res.write(`event: results\ndata: ${JSON.stringify({ liveResults, status: benchmark.benchmarkStatus, testRun: benchmark.currentTestRun })}\n\n`);
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
