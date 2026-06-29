import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import { spawn, execSync } from "child_process";
import { Transform, Readable } from "stream";
import os from "os";
import { join, dirname, basename, isAbsolute, resolve, relative } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { authenticate, authorize, optionalAuth } from "./auth/middleware.js";
import { authRouter } from "./auth/routes.js";
import { ensureUsersFile, hasUsers, getUserCount, addUser } from "./auth/user-store.js";
import bcrypt from "bcrypt";
import { create as tarCreate, t as tarT, x as tarX } from "tar";
import multer from "multer";
import db from "./db/db.js";
import { getConfigs, saveConfigs, getConfig, listReports, getReport, saveReportData, deleteReport, listProfiles, getProfile, saveProfile, deleteProfile, listServiceProfiles, getServiceProfile, saveServiceProfile, deleteServiceProfile, listChatTemplates, getChatTemplate, saveChatTemplate, deleteChatTemplate, getSetting, saveSetting } from "./db/data-layer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve relative config paths to absolute (relative to benchmark dir)
function resolveConfigPath(p) {
  if (!p) return "";
  if (p.startsWith("~/")) {
    p = os.homedir() + p.slice(1);
  }
  return isAbsolute(p) ? p : resolve(__dirname, p);
}

const app = express();

// Express 4 has no res.flush() — use socket flush as a fallback
function safeFlush(res) {
  if (typeof res.flush === "function") {
    res.flush();
  } else if (res.socket && typeof res.socket.write === "function") {
    res.socket.write("");
  }
}
const PORT = parseInt(process.env.API_PORT, 10) || 3456;
const API_HOST = process.env.API_HOST || '0.0.0.0';
const BENCHMARK_DIR = __dirname;
const FRONTEND_DIR = join(BENCHMARK_DIR, "..", "frontend", "dist");
const BETTY_DIR = join(os.homedir(), ".betty");
const CONFIGS_FILE = join(BETTY_DIR, "configs.json");
const RESULTS_FILE = join(BENCHMARK_DIR, "results.md");
const REPORTS_DIR = join(BETTY_DIR, "reports");
const PROFILES_DIR = join(BETTY_DIR, "profiles");
const SERVICE_PROFILES_DIR = join(BETTY_DIR, "service-profiles");
const MODELS_DIR = join(BETTY_DIR, "models");
const CHAT_TEMPLATES_DIR = join(BETTY_DIR, "chat_templates");

// Allowed CORS origins (comma-separated or * for all)
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

//--- Authentication configuration ---
const AUTH_ENABLED = process.env.BETTY_AUTH_ENABLED !== "false";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Make JWT_EXPIRES_IN available to auth routes module
process.env.JWT_EXPIRES_IN = JWT_EXPIRES_IN;
// JWT_SECRET will be initialized by initJwtSecret() after db.init()

async function initJwtSecret() {
  // Try to load from database first
  try {
    const persisted = await getSetting("jwt-secret");
    if (persisted && persisted.length >= 32) {
      console.log(`[auth] Loaded JWT secret from database`);
      return persisted;
    }
  } catch (err) {
    console.error(`[auth] Failed to load JWT secret from DB: ${err.message}`);
  }

  // Try to load from file as fallback
  const secretFile = join(BETTY_DIR, "jwt-secret");
  try {
    if (fs.existsSync(secretFile)) {
      const persisted = fs.readFileSync(secretFile, "utf-8").trim();
      if (persisted.length >= 32) {
        // Persist to database
        await saveSetting("jwt-secret", persisted);
        console.log(`[auth] Loaded JWT secret from file and persisted to database`);
        return persisted;
      }
    }
  } catch (err) {
    console.error(`[auth] Failed to load JWT secret from file: ${err.message}`);
  }

  // Generate new secret
  const newSecret = crypto.randomBytes(48).toString("hex");
  await saveSetting("jwt-secret", newSecret);
  // Also persist to file for backward compatibility
  try {
    fs.writeFileSync(secretFile, newSecret);
  } catch (err) {
    console.error(`[auth] Failed to persist JWT secret to file: ${err.message}`);
  }
  console.log(`[auth] Generated and persisted new JWT secret`);
  return newSecret;
}

async function initAuth() {
  if (!AUTH_ENABLED) return;
  try {
    await ensureUsersFile();
    if (!(await hasUsers())) {
      const adminPassword = process.env.ADMIN_PASSWORD || "admin";
      const passwordHash = bcrypt.hashSync(adminPassword, 10);
      await addUser({ username: "admin", passwordHash, role: "admin" });
      console.log(`[auth] Created default admin user (password: ${adminPassword})`);
      console.log(`[auth] WARNING: Change the default password immediately!`);
    } else {
      console.log(`[auth] Authentication enabled, ${await getUserCount()} user(s) configured`);
    }
  } catch (err) {
    console.error(`[auth] Failed to initialize auth: ${err.message}`);
  }
}

// Ensure required directories exist on startup
function ensureDirectory(dir, label) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[startup] Created directory: ${dir}`);
  }
}

ensureDirectory(BETTY_DIR, "~/.betty");
ensureDirectory(REPORTS_DIR, "~/.betty/reports");
ensureDirectory(PROFILES_DIR, "profiles");
ensureDirectory(SERVICE_PROFILES_DIR, "service-profiles");
ensureDirectory(MODELS_DIR, "~/.betty/models");
ensureDirectory(CHAT_TEMPLATES_DIR, "~/.betty/chat_templates");
ensureDirectory(join(BENCHMARK_DIR, "llama_cache"), "llama_cache");

//--- Git update check ---
let gitUpdateCache = { hasUpdate: false, localCommit: null, remoteCommit: null, lastChecked: null };
let gitUpdateTimer = null;

function checkGitUpdate() {
  try {
    const localCommit = execSync('git rev-parse HEAD', { cwd: BENCHMARK_DIR, encoding: 'utf8' }).trim();
    const remoteCommit = execSync('git rev-parse origin/HEAD', { cwd: BENCHMARK_DIR, encoding: 'utf8' }).trim();
    const hasUpdate = localCommit !== remoteCommit;
    gitUpdateCache = { hasUpdate, localCommit: localCommit.slice(0, 7), remoteCommit: remoteCommit.slice(0, 7), lastChecked: new Date().toISOString() };
  } catch (err) {
    // If git commands fail (not a git repo, no origin, etc.), keep current cache
    console.log('[git-update] Failed to check for updates:', err.message);
  }
}

function startGitUpdatePolling() {
  checkGitUpdate(); // initial check
  gitUpdateTimer = setInterval(checkGitUpdate, 60 * 60 * 1000);
}

startGitUpdatePolling();

// Default config template
const DEFAULT_CONFIGS = {
  export_configs: {
    GGML_CUDA_ENABLE_UNIFIED_MEMORY: "1",
    CUDA_SCALE_LAUNCH_QUEUES: "4x",
    LLAMA_CACHE: "",
    GGML_CUDA_P2P: "on",
    LLAMA_ARG_FIT: true,
  },
  max_sys_mem: 93,
  llama_port: 11434,
  llama_host: "localhost",
  model: "",
  llama_cache: "llama_cache",
  gpu_selection: {
    enabled: true,
    gpus: [0],
  },
  split_params: {
    layer_split: {
      enabled: false,
      value: "layer",
    },
    tensor_split: {
      enabled: false,
      value: "16,12,12",
    },
    primary_gpu: {
      enabled: false,
      value: 0,
    },
  },
  spec_params: {
    spec_type: {
      enabled: false,
      value: "draft-mtp",
    },
    spec_draft_n_max: {
      enabled: false,
      value: 3,
    },
  },
  build_cores: 1,
  skip_build: false,
  build_make_params: {
    enable_ccache: true,
    enable_lto: true,
    enable_cuda: true,
    enable_cuda_fa: true,
    enable_cuda_graphs: true,
    enable_cuda_nccl: true,
    enable_cuda_per_max_batch_size: true,
    peer_batch_size: "512",
    enable_cuda_peer_copy: true,
    enable_cuda_custom_arch: true,
    enable_cuda_fa_all_quants: true,
    cuda_all_quants: true,
    enable_cuda_fp16: true,
    cuda_fp16: true,
    enable_cuda_scheduled_max_copies: true,
    cuda_max_scheduled_copies: 14,
    enable_cuda_compression_level: false,
    cuda_compression_level: 0,
    enable_ggml_cuda_force_mmq: false,
    enable_ggml_native: false,
  },
  cuda_configs: {
    cuda_version: "12.6",
    cudacxx: "/usr/local/cuda/bin/nvcc",
  },
  model_configs: {
    temp: 0.6,
    top_p: 0.95,
    min_p: 0,
    top_k: 20,
  },
  server_params: {
    cont_batching: true,
    flash_attn: {
      enabled: true,
      value: 1,
    },
    reasoning: {
      enabled: true,
      value: 1,
    },
    profiling: true,
    presence_penalty: {
      enabled: true,
      value: 0,
    },
    reasoning_budget: {
      enabled: true,
      value: 2048,
    },
    reasoning_budget_message: {
      enabled: true,
      value: "Proceed to final answer.",
    },
    rope_scaling: {
      enabled: true,
      value: "yarn",
    },
    jinja: false,
    chat_template_file: "",
    mmproj: {
      enabled: false,
      value: "",
    },
    parallel: {
      enabled: true,
      value: 1,
    },
    n_predict: {
      enabled: false,
      value: 512,
    },
    n_keep: {
      enabled: false,
      value: 0,
    },
    stream: {
      enabled: true,
      value: false,
    },
    cache_prompt: {
      enabled: true,
      value: true,
    },
    gpu_layers: {
      enabled: true,
      value: 999,
    },
    cpu_moe: {
      enabled: false,
    },
    n_cpu_moe: {
      enabled: false,
      value: 4,
    },
  },
  benchmark_messages: [
    "Develop a design doc for a self-hosted tetris clone web-based game..",
    "Audit the design doc.",
    "Recommend optimizations.",
    "Create a social-media marketing campaign for it.",
  ],
  test_params: {
    context_length: 32768,
    context_length_multiplier: 2,
    context_length_max: 262144,
    gpu_layer_offload: 999,
    gpu_layer_offload_step: 0,
    gpu_layer_off_max: 999,
    batch_size: 128,
    batch_size_step: 128,
    batch_size_max: 16384,
    u_batch_size: 64,
    u_batch_size_step: 64,
    u_batch_size_max: 4096,
    cache_ram: 4096,
    cache_ram_step: 1024,
    cache_ram_max: 4096,
  },
};

// Deep-merge helper: adds missing keys from `defaults` into `target` (mutates target)
function deepMerge(target, defaults) {
  let updated = false;
  for (const key of Object.keys(defaults)) {
    if (!(key in target)) {
      target[key] = JSON.parse(JSON.stringify(defaults[key]));
      updated = true;
    } else if (
      typeof defaults[key] === "object" &&
      defaults[key] !== null &&
      !Array.isArray(defaults[key]) &&
      typeof target[key] === "object" &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      if (deepMerge(target[key], defaults[key])) updated = true;
    }
  }
  return updated;
}

// Sync: ensure configs.json has all default keys; add missing ones automatically
async function syncConfigDefaults() {
  try {
    let current = await getConfigs();
    if (!current) {
      current = { ...DEFAULT_CONFIGS };
    }
    deepMerge(current, DEFAULT_CONFIGS);
    await saveConfigs(current);
  } catch (err) {
    console.error(`[config] Failed to sync defaults: ${err.message}`);
  }
}

// Initialize configs on startup
await db.init();

// Initialize JWT secret (with DB persistence)
const dbJwtSecret = await initJwtSecret();
if (dbJwtSecret && !process.env.JWT_SECRET) {
  process.env.JWT_SECRET = dbJwtSecret;
}

// Initialize auth users
await initAuth();

await syncConfigDefaults();

// In-memory state
let benchmarkProcess = null;
let benchmarkStatus = "idle"; // idle | building | testing | error | stopped
let currentTestRun = 0;
let liveResults = [];
let streamingClients = new Set();
let benchmarkMessages = [];
let currentTestRunMessages = [];
let currentReportName = null;
let buildProcess = null;
let buildStatus = "idle"; // idle | building | success | error

//--- Crash protection: keep server alive on uncaught errors ---
process.on("uncaughtException", (err) => {
  console.error("\n[api-server] Uncaught exception:", err.message);
  if (err.stack) console.error(err.stack);
});

process.on("unhandledRejection", (reason) => {
  console.error("\n[api-server] Unhandled rejection:", reason);
});

// CORS configuration
// Note: credentials=true is incompatible with origin='*' per the CORS spec.
// When origin is '*', set credentials to false. When explicit origins are
// configured, credentials can be enabled for those trusted origins.
const corsWildcard = CORS_ORIGIN === '*';
app.use(cors({
  origin: corsWildcard ? true : CORS_ORIGIN.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Transfer-Encoding', 'Cache-Control', 'Connection', 'Retry-After'],
  credentials: !corsWildcard,
}));

app.use(express.json({ limit: "10mb" }));

// Serve frontend static files if the build output exists
if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
  console.log(`Frontend served from: ${FRONTEND_DIR}`);
} else {
  console.warn(`WARNING: Frontend build directory not found: ${FRONTEND_DIR}`);
  console.warn(`  Run "npm run build:frontend" or "npm run start" to build the frontend.`);
  console.warn(`  The API will still work, but the frontend UI will not be available.`);
}

//--- Authentication routes (always public) ---
app.use("/api/auth", authRouter);

//--- Authentication middleware ---
// Apply auth to all /api/* routes except auth routes, health, docs, and pi/skills
if (AUTH_ENABLED) {
  app.use("/api", (req, res, next) => {
    // Exempt: login/register (public auth routes), health, docs, library
    // Note: req.path is relative to the mount point (/api), so use paths without /api prefix
    const exempt = [
      "/auth/login",
      "/auth/register",
      "/health",
      "/docs",
      "/library",
    ];
    // Library export/import require auth — do not exempt them
    if (req.path === "/library/export" || req.path === "/library/import") {
      authenticate(req, res, next);
      return;
    }
    if (exempt.some((p) => req.path === p || req.path.startsWith(p + "/"))) return next();
    authenticate(req, res, next);
  });
}

//--- Config endpoints ---
app.get("/api/configs", async (_req, res) => {
  try {
    const configs = await getConfigs();
    res.json({ success: true, data: configs || {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/configs", authorize("admin"), async (_req, res) => {
  try {
    const configs = _req.body;
    await saveConfigs(configs);
    res.json({ success: true, message: "Config saved" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Benchmark messages endpoint ---
app.get("/api/messages", (_req, res) => {
  try {
    res.json({
      success: true,
      data: benchmarkMessages.map((bm) => ({
        testRunId: bm.testRunId,
        messages: bm.messages,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Profile endpoints ---
app.get("/api/profiles", async (_req, res) => {
  try {
    const profiles = await listProfiles();
    res.json({ success: true, data: profiles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/profile/:name", async (req, res) => {
  try {
    const profile = await getProfile(req.params.name);
    if (!profile) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/profile", authorize("admin", "operator"), async (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ success: false, error: "name and data required" });
    }
    await saveProfile(name, data);
    res.json({ success: true, message: "Profile saved" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/profile/:name", authorize("admin"), async (req, res) => {
  try {
    const deleted = await deleteProfile(req.params.name);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }
    res.json({ success: true, message: "Profile deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/profile/:name/load", authorize("admin", "operator"), async (req, res) => {
  try {
    const profile = await getProfile(req.params.name);
    if (!profile) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }
    // Write the profile's config to the database
    await saveConfigs(profile);
    res.json({ success: true, message: `Profile "${req.params.name}" loaded`, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Service Profile endpoints ---
app.get("/api/service-profiles", async (_req, res) => {
  try {
    const profiles = await listServiceProfiles();
    res.json({ success: true, data: profiles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/service-profile/:name", async (req, res) => {
  try {
    const profile = await getServiceProfile(req.params.name);
    if (!profile) {
      return res.status(404).json({ success: false, error: "Service profile not found" });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/service-profile", authorize("admin", "operator"), async (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ success: false, error: "name and data required" });
    }

    // Sanitize name
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");

    // Filter out env vars with empty keys
    if (data.envVars) {
      const filtered = {};
      for (const [k, v] of Object.entries(data.envVars)) {
        if (k && k.trim()) {
          filtered[k] = v;
        }
      }
      data.envVars = filtered;
    }

    await saveServiceProfile(safeName, data);
    res.json({ success: true, message: "Service profile saved" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/service-profile/:name", authorize("admin"), async (req, res) => {
  try {
    const deleted = await deleteServiceProfile(req.params.name);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Service profile not found" });
    }
    res.json({ success: true, message: "Service profile deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/service-profile/:name/load", authorize("admin", "operator"), async (req, res) => {
  const notSupported = requireSystemd(res);
  if (notSupported) return;
  try {
    const profile = await getServiceProfile(req.params.name);
    const { execStart, envVars, restart, restartSec } = profile;

    if (!execStart) {
      return res.status(400).json({ success: false, error: "Profile missing execStart" });
    }

    const serviceUser = process.env.USER || "jon";
    const serviceName = "llama.service";
    const serviceFile = join("/home", serviceUser, ".config", "systemd", "user", serviceName);
    const envFile = join("/home", serviceUser, ".config", "systemd", "user", "llama-benchmark.env");

    // Read existing service file to preserve other sections
    if (!fs.existsSync(serviceFile)) {
      return res.status(404).json({ success: false, error: "Service file not found. Install a service first." });
    }

    const serviceContent = fs.readFileSync(serviceFile, "utf8");

    // Update ExecStart
    let updatedService = serviceContent.replace(
      /^ExecStart=.+$/m,
      `ExecStart=${execStart}`
    );

    // Update Restart
    if (restart) {
      updatedService = updatedService.replace(
        /^Restart=.+$/m,
        `Restart=${restart}`
      );
    }

    // Update RestartSec
    if (restartSec !== undefined && restartSec !== null) {
      updatedService = updatedService.replace(
        /^RestartSec=.+$/m,
        `RestartSec=${restartSec}`
      );
    }

    // Write updated service file
    try {
      execSync(`cat > ${serviceFile} << 'SVCEOF'\n${updatedService}SVCEOF`);
    } catch (err) {
      console.error(`Failed to write service file: ${err.message}`);
      return res.status(500).json({ success: false, error: `Failed to write service file: ${err.message}` });
    }

    // Write environment file
    try {
      const envContent = Object.entries(envVars || {})
        .filter(([k, _]) => k && k.trim())
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n") + "\n";
      execSync(`cat > ${envFile} << 'ENVEOF'\n${envContent}ENVEOF`);
    } catch (err) {
      console.error(`Failed to write env file: ${err.message}`);
      return res.status(500).json({ success: false, error: `Failed to write env file: ${err.message}` });
    }

    // Reload systemd daemon
    try {
      execSync("systemctl --user daemon-reload");
    } catch (err) {
      console.error(`Failed to reload systemd: ${err.message}`);
      return res.status(500).json({ success: false, error: `daemon-reload failed: ${err.message}` });
    }

    // Restart the service (unless restart=false query param)
    const shouldRestart = req.query.restart !== "false";
    if (shouldRestart) {
      try {
        execSync("systemctl --user restart llama.service");
      } catch (err) {
        console.error(`Failed to restart service: ${err.message}`);
        return res.status(500).json({ success: false, error: `restart failed: ${err.message}` });
      }
    }

    res.json({
      success: true,
      message: shouldRestart
        ? "Service profile loaded, reloaded, and restarted"
        : "Service profile loaded and daemon-reloaded",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Status endpoint ---
app.get("/api/status", (_req, res) => {
  res.json({
    success: true,
    status: benchmarkStatus,
    testRun: currentTestRun,
    liveResults: liveResults,
    processAlive: benchmarkProcess ? !benchmarkProcess.killed : false,
    buildStatus,
  });
});

//--- Current launch command endpoint ---
app.get("/api/launch-command", async (_req, res) => {
  try {
    const configs = await getConfigs();
    const launchCmd = getLaunchCommand(configs || {}, {});
    res.json({ success: true, data: launchCmd });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- SSE stream endpoint ---
app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Retry-After", "3");
  res.flushHeaders();

  const client = { res };
  streamingClients.add(client);

  // Send initial status
  sendToClient(client, "status", {
    status: benchmarkStatus,
    testRun: currentTestRun,
    liveResults: liveResults,
    processAlive: benchmarkProcess ? !benchmarkProcess.killed : false,
  });

  // Send heartbeat
  const heartbeat = setInterval(() => {
    sendToClient(client, "heartbeat", { ts: Date.now() });
  }, 15000);

  req.on("close", () => {
    streamingClients.delete(client);
    clearInterval(heartbeat);
  });
});

function sendToClient(client, event, data) {
  if (!streamingClients.has(client)) return;
  try {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    client.res.write(msg);
    safeFlush(client.res);
  } catch (err) {
    // Client likely disconnected — remove from set to prevent further writes
    streamingClients.delete(client);
    console.error(`[sse] Error sending to client: ${err.message}`);
  }
}

function broadcast(event, data) {
  for (const client of streamingClients) {
    sendToClient(client, event, data);
  }
}

//--- Run benchmark endpoint ---
app.post("/api/run", authorize("admin", "operator"), async (req, res) => {
  if (benchmarkStatus !== "idle" && benchmarkStatus !== "error" && benchmarkStatus !== "stopped") {
    return res.status(409).json({
      success: false,
      error: `Benchmark is already ${benchmarkStatus}`,
    });
  }

  try {
    // Read current configs
    const configs = await getConfigs();
    const skipBuild = req.body.skipBuild ?? configs?.skip_build;

    benchmarkStatus = "building";
    currentTestRun = 0;
    liveResults = [];
    benchmarkMessages = [];
    currentTestRunMessages = [];

    // Wipe results file
    fs.writeFileSync(RESULTS_FILE, "");

    // Start the benchmark process
    benchmarkProcess = spawn("node", ["index.js"], {
      cwd: BENCHMARK_DIR,
      env: {
        ...process.env,
        ...req.body.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";

    benchmarkProcess.stdout.on("data", (data) => {
      const text = data.toString();
      stdoutBuffer += text;
      broadcast("log", {
        type: "stdout",
        text,
        status: benchmarkStatus,
        testRun: currentTestRun,
        liveResults: liveResults,
      });
      processStdoutChunk(text);
    });

    benchmarkProcess.stderr.on("data", (data) => {
      const text = data.toString();
      stderrBuffer += text;
      broadcast("log", {
        type: "stderr",
        text,
        status: benchmarkStatus,
        testRun: currentTestRun,
        liveResults: liveResults,
      });
      processStderrChunk(text);
    });

    benchmarkProcess.on("close", (code) => {
      benchmarkProcess = null;
      // Flush any remaining buffered lines from the process output
      if (stdoutLineBuffer.trim()) {
        parseLogOutput(stdoutLineBuffer);
        stdoutLineBuffer = "";
      }
      if (stderrLineBuffer.trim()) {
        parseLogOutput(stderrLineBuffer);
        stderrLineBuffer = "";
      }
      // Flush any remaining summary block
      if (inSummaryBlock) {
        flushSummary();
      }
      if (code === 0) {
        benchmarkStatus = "idle";
        broadcast("status", {
          status: "idle",
          testRun: currentTestRun,
          liveResults: liveResults,
          processAlive: false,
          finished: true,
        });
      } else {
        benchmarkStatus = "error";
        broadcast("status", {
          status: "error",
          error: `Process exited with code ${code}`,
          testRun: currentTestRun,
          liveResults: liveResults,
          processAlive: false,
          finished: true,
        });
      }
    });

    benchmarkProcess.on("error", (err) => {
      benchmarkProcess = null;
      benchmarkStatus = "error";
      broadcast("status", {
        status: "error",
        error: err.message,
        testRun: currentTestRun,
        liveResults: liveResults,
        processAlive: false,
        finished: true,
      });
    });

    res.json({ success: true, message: "Benchmark started" });
  } catch (err) {
    benchmarkStatus = "idle";
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Line buffer for parsing complete lines from stream data ---
let stdoutLineBuffer = "";
let stderrLineBuffer = "";

//--- Summary block buffer for multi-line result parsing ---
let summaryBuffer = {};
let inSummaryBlock = false;

//--- Parse benchmark JSON messages (structured data from benchmark process) ---
function parseBenchmarkJSON(line) {
  if (!line.startsWith('BENCHMARK_JSON:')) return false;
  try {
    const jsonStr = line.slice('BENCHMARK_JSON:'.length);
    const data = JSON.parse(jsonStr);

    switch (data.type) {
      case 'message-start':
        broadcast('message-start', {
          testRunId: data.testRunId,
          messageIndex: data.messageIndex,
          prompt: data.prompt,
        });
        break;

      case 'message-complete':
        currentTestRunMessages.push({
          messageIndex: data.messageIndex,
          prompt: data.prompt,
          response: data.response,
          promptTokens: data.promptTokens,
          generatedTokens: data.generatedTokens,
          totalTimeMs: data.totalTimeMs,
        });
        broadcast('message-complete', {
          testRunId: data.testRunId,
          messageIndex: data.messageIndex,
          prompt: data.prompt,
          response: data.response,
          promptTokens: data.promptTokens,
          generatedTokens: data.generatedTokens,
          totalTimeMs: data.totalTimeMs,
        });
        break;

      case 'test-run-complete':
        // Flush any pending summary for this test run before broadcasting
        if (inSummaryBlock) flushSummary();
        benchmarkMessages.push({
          testRunId: data.testRunId,
          messages: [...currentTestRunMessages],
        });
        currentTestRunMessages = [];
        broadcast('test-run-complete', {
          testRunId: data.testRunId,
          messages: benchmarkMessages.map((bm) => ({
            testRunId: bm.testRunId,
            messages: bm.messages,
          })),
          processAlive: benchmarkProcess ? !benchmarkProcess.killed : false,
        });
        break;
    }

    return true;
  } catch (e) {
    // Not a valid BENCHMARK_JSON line, ignore
    return false;
  }
}

//--- Flush accumulated summary data into liveResults ---
function flushSummary() {
  if (!inSummaryBlock || (summaryBuffer.avgGenTokensPerSec === undefined && summaryBuffer.avgPromptTokensPerSec === undefined)) {
    inSummaryBlock = false;
    summaryBuffer = {};
    return;
  }

  const runId = summaryBuffer.testRunId || currentTestRun;
  const existingIdx = liveResults.findIndex((r) => r.testRunId === runId);

  const result = {
    testRunId: runId,
    avgGenTokensPerSec: summaryBuffer.avgGenTokensPerSec,
    avgPromptTokensPerSec: summaryBuffer.avgPromptTokensPerSec,
    totalGenTokens: summaryBuffer.totalGenTokens,
    totalPromptTokens: summaryBuffer.totalPromptTokens,
    totalTimeMs: summaryBuffer.totalTimeMs,
    avgMemUsed: summaryBuffer.avgMemUsed,
    avgMemTotal: summaryBuffer.avgMemTotal,
  };

  if (existingIdx >= 0) {
    liveResults[existingIdx] = result;
  } else {
    liveResults.push(result);
  }

  broadcast("results", { liveResults });

  // Save/update report after each test run completes
  saveReport().catch((err) => {
    console.error(`[api-server] saveReport failed: ${err.message}`);
  });

  inSummaryBlock = false;
  summaryBuffer = {};
}

//--- Parse log output for live results (called with complete lines) ---
function parseLogOutput(text) {
  // Check for structured benchmark JSON first
  if (parseBenchmarkJSON(text)) {
    // Flush any pending summary before returning
    if (inSummaryBlock) flushSummary();
    return;
  }

  // Parse "========== Test Run #N =========="
  const runMatch = text.match(/Test Run #(\d+)/);
  if (runMatch) {
    currentTestRun = parseInt(runMatch[1], 10);
    benchmarkStatus = "testing";
    broadcast("status", {
      status: "testing",
      testRun: currentTestRun,
      liveResults: liveResults,
      processAlive: true,
    });
  }

  // Parse "=== Test Run #N Summary ===" — marks start of summary block
  if (text.includes("Summary ===") && text.includes("Test Run")) {
    inSummaryBlock = true;
    summaryBuffer = { testRunId: currentTestRun };
    return;
  }

  // Parse individual summary lines (accumulated across the block)
  if (inSummaryBlock) {
    const genMatch = text.match(/Avg gen tokens\/sec:\s+([\d.]+)/);
    const promptMatch = text.match(/Avg prompt tokens\/sec:\s+([\d.]+)/);
    const totalGenMatch = text.match(/Total tokens:\s+([\d.]+)\s*\(gen\)/);
    const totalPromptMatch = text.match(/Total tokens:\s+[\d.]+\s*\(gen\) \/ ([\d.]+)/);
    const totalTimeMatch = text.match(/Total time \(all msgs\):\s+([\d.]+)\s*ms/);
    const memMatch = text.match(/Avg Mem Used \(GB\):\s+([\d.]+) \/ ([\d.]+)/);

    if (genMatch) summaryBuffer.avgGenTokensPerSec = parseFloat(genMatch[1]);
    if (promptMatch) summaryBuffer.avgPromptTokensPerSec = parseFloat(promptMatch[1]);
    if (totalGenMatch) summaryBuffer.totalGenTokens = parseFloat(totalGenMatch[1]);
    if (totalPromptMatch) summaryBuffer.totalPromptTokens = parseFloat(totalPromptMatch[1]);
    if (totalTimeMatch) summaryBuffer.totalTimeMs = parseFloat(totalTimeMatch[1]);
    if (memMatch) {
      summaryBuffer.avgMemUsed = parseFloat(memMatch[1]);
      summaryBuffer.avgMemTotal = parseFloat(memMatch[2]);
    }

    // Flush when we hit the last summary line (memory line or end of block)
    if (memMatch || text.trim() === "" || text.startsWith("BENCHMARK_JSON")) {
      flushSummary();
    }
  }
}

//--- Process a chunk of raw stdout/stderr data, splitting into complete lines ---
function processStdoutChunk(text) {
  stdoutLineBuffer += text;
  const lines = stdoutLineBuffer.split("\n");
  // Keep the last element as a potential partial line
  stdoutLineBuffer = lines.pop() || "";
  for (const line of lines) {
    if (line.trim()) {
      parseLogOutput(line);
    }
  }
}

function processStderrChunk(text) {
  stderrLineBuffer += text;
  const lines = stderrLineBuffer.split("\n");
  // Keep the last element as a potential partial line
  stderrLineBuffer = lines.pop() || "";
  for (const line of lines) {
    if (line.trim()) {
      parseLogOutput(line);
    }
  }
}

//--- Stop benchmark endpoint ---
app.post("/api/stop", authorize("admin", "operator"), (_req, res) => {
  if (!benchmarkProcess) {
    return res.json({ success: true, message: "No benchmark running" });
  }

  try {
    benchmarkProcess.kill("SIGTERM");
    setTimeout(() => {
      if (benchmarkProcess && !benchmarkProcess.killed) {
        benchmarkProcess.kill("SIGKILL");
      }
    }, 5000);
    benchmarkStatus = "stopped";
    res.json({ success: true, message: "Benchmark stopping..." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Reports endpoints ---
app.get("/api/reports", async (_req, res) => {
  try {
    const reports = await listReports();
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/report/:name", async (req, res) => {
  try {
    const report = await getReport(req.params.name);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/report", authorize("admin", "operator"), async (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ success: false, error: "name and data required" });
    }
    await saveReportData(name, data);
    res.json({ success: true, message: "Report saved" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/report/:name", authorize("admin"), async (req, res) => {
  try {
    const deleted = await deleteReport(req.params.name);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    res.json({ success: true, message: "Report deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Auto-save report after each test run completes ---
async function saveReport() {
  if (!currentReportName) {
    // Generate report name on first save
    try {
      const configs = await getConfigs();
      const modelBasename = configs?.model ? configs.model.replace(/\.[^.]+$/, "") : "unknown";
      const today = new Date().toISOString().slice(0, 10);
      currentReportName = `${today}-${modelBasename}`;
    } catch {
      currentReportName = `benchmark-${Date.now()}`;
    }
  }

  try {
    const configs = await getConfigs();
    const mdContent = fs.existsSync(RESULTS_FILE) ? fs.readFileSync(RESULTS_FILE, "utf8") : "";
    const configsPerRun = extractConfigsPerRun(liveResults, configs);

    const report = {
      name: currentReportName,
      savedAt: new Date().toISOString(),
      mdContent,
      liveResults: liveResults,
      configsPerRun: configsPerRun,
      configs: configs,
    };

    await saveReportData(currentReportName, report);
    console.log(`Report saved: ${currentReportName}`);
  } catch (err) {
    console.error(`Failed to save report: ${err.message}`);
  }
}

//--- Helper: reconstruct cmake build command from configs ---
function getBuildCommand(configs, testRunConfig) {
  const bp = configs.build_make_params || {};
  const cf = testRunConfig?.cmakeFlags || {};
  const buildCores = configs.build_cores || 1;

  const flags = [];
  if (bp.enable_ccache) flags.push("-DGGML_CCACHE=1");
  if (bp.enable_lto) flags.push("-DGGML_LTO=1");
  if (bp.enable_cuda) flags.push("-DGGML_CUDA=1");
  if (bp.enable_cuda_fa) flags.push("-DGGML_CUDA_FA=1");
  if (bp.enable_cuda_graphs) flags.push("-DGGML_CUDA_GRAPHS=1");
  if (bp.enable_cuda_nccl) flags.push("-DGGML_CUDA_NCCL=1");
  if (bp.enable_cuda_per_max_batch_size) flags.push(`-DGGML_CUDA_PEER_MAX_BATCH_SIZE=${bp.peer_batch_size}`);
  if (bp.enable_cuda_peer_copy) flags.push("-DGGML_CUDA_PEER_COPY=1");
  if (bp.enable_cuda_custom_arch) flags.push('-DCMAKE_CUDA_ARCHITECTURES="86-real;120-real"');
  if (bp.enable_cuda_fa_all_quants) flags.push(`-DGGML_CUDA_FA_ALL_QUANTS=${bp.cuda_all_quants}`);
  if (bp.enable_cuda_fp16) flags.push(`-DGGML_CUDA_FP16=${bp.cuda_fp16}`);
  if (bp.enable_cuda_scheduled_max_copies) flags.push(`-DGGML_SCHED_MAX_COPIES=${bp.cuda_max_scheduled_copies}`);
  if (bp.enable_cuda_compression_level) flags.push(`-DGGML_CUDA_COMPRESSION_LEVEL=${bp.cuda_compression_level}`);
  if (bp.enable_ggml_cuda_force_mmq) flags.push("-DGGML_CUDA_FORCE_MMQ=on");
  if (bp.enable_ggml_native) flags.push("-DGGML_NATIVE=on");

  const cmakeCmd = `cmake -B build -DCMAKE_BUILD_TYPE=Release ${flags.join(" ")}`;
  const makeCmd = `cmake --build build --config Release -j ${buildCores} --clean-first`;

  // Build env exports
  const ec = configs.export_configs || {};
  const cudaVer = configs.cuda_configs?.cuda_version || "12.6";
  const envLines = [
    `export GGML_CUDA_ENABLE_UNIFIED_MEMORY=${ec.GGML_CUDA_ENABLE_UNIFIED_MEMORY || "1"}`,
    `export CUDA_SCALE_LAUNCH_QUEUES=${ec.CUDA_SCALE_LAUNCH_QUEUES || "4x"}`,
    `export LLAMA_CACHE=${resolveConfigPath(ec.LLAMA_CACHE || configs.llama_cache || "")}`,
    `export CUDACXX=${configs.cuda_configs?.cudacxx || "/usr/local/cuda/bin/nvcc"}`,
    `export GGML_CUDA_P2P=${ec.GGML_CUDA_P2P || "on"}`,
    `export PATH=/usr/local/cuda-${cudaVer}/bin:$PATH`,
    `export LLAMA_ARG_FIT=${ec.LLAMA_ARG_FIT ? "on" : "off"}`,
    ...(ec.LLAMA_ARG_FIT && ec.LLAMA_ARG_FIT_TARGET !== undefined && ec.LLAMA_ARG_FIT_TARGET !== null
      ? [`export LLAMA_ARG_FIT_TARGET=${ec.LLAMA_ARG_FIT_TARGET}`]
      : []),
    ...(ec.LLAMA_ARG_FIT && ec.LLAMA_ARG_FIT_CTX !== undefined && ec.LLAMA_ARG_FIT_CTX !== null
      ? [`export LLAMA_ARG_FIT_CTX=${ec.LLAMA_ARG_FIT_CTX}`]
      : []),
  ];

  return {
    env: envLines,
    cmake: cmakeCmd,
    make: makeCmd,
    full: envLines.join(" && ") + ` && cd llama.cpp && ${cmakeCmd} && ${makeCmd}`,
  };
}

//--- Helper: reconstruct llama-server launch command from configs ---
function getLaunchCommand(configs, testRunConfig) {
  const sp = configs.server_params || {};
  const sps = configs.split_params || {};
  const mc = configs.model_configs || {};
  const gs = configs.gpu_selection || { enabled: false, gpus: [0] };
  const sp2 = configs.spec_params || {};

  const server = testRunConfig?.serverParameters || {};
  const test = testRunConfig?.testParameters || {};
  const split = testRunConfig?.splitParameters || {};
  const env = testRunConfig?.environment || {};

  const tp = configs.test_params || {};
  const contextLength = test.contextLength || tp.context_length || 0;
  const gpuLayerOffload = test.gpuLayerOffload || tp.gpu_layer_offload || 0;
  const batchSize = test.batchSize || tp.batch_size || 0;
  const uBatchSize = test.uBatchSize || tp.u_batch_size || 0;
  const cacheRam = test.cacheRam || tp.cache_ram || 0;
  // Ensure batchSize >= uBatchSize (ubatch can never exceed batch)
  const effectiveBatchSize = Math.max(batchSize, uBatchSize);

  const primaryGpu = gs.enabled ? gs.gpus[0] : 0;

  const modelPath = server.model || `${MODELS_DIR}/${configs.model}`;
  const port = server.port || configs.llama_port || 11434;
  const host = server.host || configs.llama_host || "localhost";

  const parts = [
    `./llama-server`,
    `-m ${modelPath}`,
    `--port ${port} --host ${host}`,
    `-c ${contextLength} -ngl ${gpuLayerOffload}`,
    `--temp ${mc.temp} --top-p ${mc.top_p} --min-p ${mc.min_p} --top-k ${mc.top_k}`,
    `--batch-size ${effectiveBatchSize} --ubatch-size ${uBatchSize}`,
    `--cache-ram ${cacheRam}`,
  ];

  if (sp.cont_batching) parts.push("--cont-batching");
  if (sp.flash_attn?.enabled) parts.push(`--flash-attn ${sp.flash_attn.value}`);
  if (sp.reasoning?.enabled) parts.push(`--reasoning ${sp.reasoning.value}`);
  if (sp.profiling) parts.push("-e");
  if (sp.presence_penalty?.enabled) parts.push(`--presence-penalty ${sp.presence_penalty.value}`);
  if (sp.reasoning_budget?.enabled) parts.push(`--reasoning-budget ${sp.reasoning_budget.value}`);
  if (sp.reasoning_budget_message?.enabled) parts.push(`--reasoning-budget-message "${sp.reasoning_budget_message.value}"`);
  if (sp.rope_scaling?.enabled) parts.push(`--rope-scaling ${sp.rope_scaling.value}`);
  if (sp.jinja) parts.push("--jinja");
  if (sp.chat_template_file) parts.push(`--chat-template-file "${resolveConfigPath(sp.chat_template_file)}"`);
  if (sp.mmproj?.enabled && sp.mmproj.value) parts.push(`--mmproj "${resolveConfigPath(sp.mmproj.value)}"`);
  if (sp.parallel?.enabled) parts.push(`--parallel ${sp.parallel.value}`);
  if (sps.layer_split?.enabled) parts.push(`--split-mode ${sps.layer_split.value}`);
  if (sps.tensor_split?.enabled) parts.push(`--tensor-split ${sps.tensor_split.value}`);
  if (sps.primary_gpu?.enabled) parts.push(`--main-gpu ${primaryGpu}`);
  if (sp2.spec_type?.enabled) parts.push(`--spec-type ${sp2.spec_type.value}`);
  if (sp2.spec_draft_n_max?.enabled) parts.push(`--spec-draft-n-max ${sp2.spec_draft_n_max.value}`);
  if (sp.cpu_moe?.enabled) parts.push("--cpu-moe");
  if (sp.n_cpu_moe?.enabled) parts.push(`--n-cpu-moe ${sp.n_cpu_moe.value}`);

  // Build env exports
  const ec = configs.export_configs || {};
  const cudaVer = configs.cuda_configs?.cuda_version || "12.6";
  const envLines = [
    `GGML_CUDA_ENABLE_UNIFIED_MEMORY=${env.GGML_CUDA_ENABLE_UNIFIED_MEMORY || ec.GGML_CUDA_ENABLE_UNIFIED_MEMORY || "1"}`,
    `CUDA_SCALE_LAUNCH_QUEUES=${env.CUDA_SCALE_LAUNCH_QUEUES || ec.CUDA_SCALE_LAUNCH_QUEUES || "4x"}`,
    `LLAMA_CACHE=${resolveConfigPath(env.LLAMA_CACHE || ec.LLAMA_CACHE || configs.llama_cache || "")}`,
    `CUDACXX=${env.CUDACXX || configs.cuda_configs?.cudacxx || "/usr/local/cuda/bin/nvcc"}`,
    `GGML_CUDA_P2P=${env.GGML_CUDA_P2P || ec.GGML_CUDA_P2P || "on"}`,
    `PATH=/usr/local/cuda-${cudaVer}/bin:$PATH`,
    `LLAMA_ARG_FIT=${(env.LLAMA_ARG_FIT ?? ec.LLAMA_ARG_FIT ?? true) ? "on" : "off"}`,
    ...((env.LLAMA_ARG_FIT ?? ec.LLAMA_ARG_FIT ?? true) && (env.LLAMA_ARG_FIT_TARGET ?? ec.LLAMA_ARG_FIT_TARGET) !== undefined && (env.LLAMA_ARG_FIT_TARGET ?? ec.LLAMA_ARG_FIT_TARGET) !== null
      ? [`LLAMA_ARG_FIT_TARGET=${env.LLAMA_ARG_FIT_TARGET ?? ec.LLAMA_ARG_FIT_TARGET}`]
      : []),
    ...((env.LLAMA_ARG_FIT ?? ec.LLAMA_ARG_FIT ?? true) && (env.LLAMA_ARG_FIT_CTX ?? ec.LLAMA_ARG_FIT_CTX) !== undefined && (env.LLAMA_ARG_FIT_CTX ?? ec.LLAMA_ARG_FIT_CTX) !== null
      ? [`LLAMA_ARG_FIT_CTX=${env.LLAMA_ARG_FIT_CTX ?? ec.LLAMA_ARG_FIT_CTX}`]
      : []),
  ];

  return {
    env: envLines,
    command: parts.join(" "),
    full: envLines.join(" && ") + ` && cd llama.cpp/build/bin && ${parts.join(" ")}`,
  };
}

//--- Helper: extract detailed test run configs from liveResults ---
function extractConfigsPerRun(liveResults, configs) {
  if (!liveResults || !configs) return [];
  return liveResults.map((r) => {
    const tp = configs.test_params || {};
    const mc = configs.model_configs || {};
    const sp = configs.server_params || {};
    const sps = configs.split_params || {};
    const gs = configs.gpu_selection || { enabled: false, gpus: [0] };

    // Calculate config values based on test run progression
    const contextLength = Math.min(
      tp.context_length * Math.pow(tp.context_length_multiplier || 2, r.testRunId - 1),
      tp.context_length_max || 262144,
    );
    const gpuLayerOffload = Math.min(
      tp.gpu_layer_offload + (tp.gpu_layer_offload_step || 0) * (r.testRunId - 1),
      tp.gpu_layer_off_max || 999,
    );
    const batchSize = Math.min(
      tp.batch_size + (tp.batch_size_step || 128) * (r.testRunId - 1),
      tp.batch_size_max || 16384,
    );
    const uBatchSize = Math.min(
      tp.u_batch_size + (tp.u_batch_size_step || 64) * (r.testRunId - 1),
      tp.u_batch_size_max || 4096,
    );
    // Ensure batchSize >= uBatchSize (ubatch can never exceed batch)
    const effectiveBatchSize = Math.max(batchSize, uBatchSize);
    const cacheRam = Math.min(
      tp.cache_ram + (tp.cache_ram_step || 1024) * (r.testRunId - 1),
      tp.cache_ram_max || 4096,
    );

    return {
      testRunId: r.testRunId,
      testParameters: {
        contextLength,
        batchSize: effectiveBatchSize,
        uBatchSize,
        cacheRam,
        gpuLayerOffload,
      },
      modelParameters: {
        temperature: mc.temp,
        topP: mc.top_p,
        minP: mc.min_p,
        topK: mc.top_k,
      },
      serverParameters: {
        model: `${MODELS_DIR}/${configs.model || ""}`,
        host: configs.llama_host || "localhost",
        port: configs.llama_port || 11434,
        flashAttn: sp.flash_attn?.enabled ? sp.flash_attn.value : null,
        reasoning: sp.reasoning?.enabled ? sp.reasoning.value : null,
        ropeScaling: sp.rope_scaling?.enabled ? sp.rope_scaling.value : null,
        parallel: sp.parallel?.enabled ? sp.parallel.value : null,
        contBatching: sp.cont_batching ? true : null,
        gpuLayers: sp.gpu_layers?.enabled ? sp.gpu_layers.value : null,
      },
      splitParameters: {
        layerSplit: sps.layer_split?.enabled ? sps.layer_split.value : null,
        tensorSplit: sps.tensor_split?.enabled ? sps.tensor_split.value : null,
        primaryGpu: sps.primary_gpu?.enabled ? (gs.enabled ? gs.gpus[0] : sps.primary_gpu.value) : null,
        gpuSelection: gs.enabled ? gs.gpus : [0],
      },
      environment: {
        GGML_CUDA_ENABLE_UNIFIED_MEMORY: configs.export_configs?.GGML_CUDA_ENABLE_UNIFIED_MEMORY || "1",
        CUDA_SCALE_LAUNCH_QUEUES: configs.export_configs?.CUDA_SCALE_LAUNCH_QUEUES || "4x",
        LLAMA_CACHE: resolveConfigPath(configs.export_configs?.LLAMA_CACHE || configs.llama_cache || ""),
        GGML_CUDA_P2P: configs.export_configs?.GGML_CUDA_P2P || "on",
        LLAMA_ARG_FIT: configs.export_configs?.LLAMA_ARG_FIT ?? true,
        ...(configs.export_configs?.LLAMA_ARG_FIT && configs.export_configs?.LLAMA_ARG_FIT_TARGET !== undefined && configs.export_configs?.LLAMA_ARG_FIT_TARGET !== null
          ? { LLAMA_ARG_FIT_TARGET: configs.export_configs?.LLAMA_ARG_FIT_TARGET }
          : {}),
        ...(configs.export_configs?.LLAMA_ARG_FIT && configs.export_configs?.LLAMA_ARG_FIT_CTX !== undefined && configs.export_configs?.LLAMA_ARG_FIT_CTX !== null
          ? { LLAMA_ARG_FIT_CTX: configs.export_configs?.LLAMA_ARG_FIT_CTX }
          : {}),
        CUDACXX: configs.cuda_configs?.cudacxx || "",
      },
      cmakeFlags: {
        GGML_CUDA: configs.build_make_params?.enable_cuda ? "1" : "",
        GGML_CUDA_GRAPHS: configs.build_make_params?.enable_cuda_graphs ? "1" : "",
        GGML_CUDA_FA: configs.build_make_params?.enable_cuda_fa ? "1" : "",
        GGML_CUDA_FP16: configs.build_make_params?.enable_cuda_fp16 ? "true" : "",
        GGML_CUDA_PEER_MAX_BATCH_SIZE: configs.build_make_params?.enable_cuda_per_max_batch_size ? configs.build_make_params.peer_batch_size : "",
        GGML_SCHED_MAX_COPIES: configs.build_make_params?.enable_cuda_scheduled_max_copies ? configs.build_make_params.cuda_max_scheduled_copies : "",
        GGML_CUDA_COMPRESSION_LEVEL: configs.build_make_params?.enable_cuda_compression_level ? configs.build_make_params.cuda_compression_level : "",
        GGML_LTO: configs.build_make_params?.enable_lto ? "1" : "",
        GGML_CCACHE: configs.build_make_params?.enable_ccache ? "1" : "",
      },
    };
  });
}

//--- Save current results as report ---
app.post("/api/save-report", authorize("admin", "operator"), async (req, res) => {
  try {
    const { name } = req.body;

    // Read configs first to get the model name
    const configs = await getConfigs();
    const modelBasename = configs?.model ? configs.model.replace(/\.[^.]+$/, "") : "unknown";
    const today = new Date().toISOString().slice(0, 10);
    const defaultName = `${today}-${modelBasename}`;

    const safeName = name || defaultName;

    // Read the current results.md
    const mdContent = fs.existsSync(RESULTS_FILE) ? fs.readFileSync(RESULTS_FILE, "utf8") : "";

    // Extract detailed configs per test run
    const configsPerRun = extractConfigsPerRun(liveResults, configs);

    const report = {
      name: safeName,
      savedAt: new Date().toISOString(),
      mdContent,
      liveResults: liveResults,
      configsPerRun: configsPerRun,
      configs: configs,
    };

    await saveReportData(safeName, report);
    res.json({ success: true, message: `Report saved as ${safeName}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Get detailed configs for a specific test run in a report ---
app.get("/api/report/:name/configs/:testRunId", async (req, res) => {
  try {
    const report = await getReport(req.params.name);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    const configsPerRun = report.configsPerRun || [];
    const config = configsPerRun.find((c) => c.testRunId === parseInt(req.params.testRunId, 10));
    if (!config) {
      return res.status(404).json({ success: false, error: "Test run config not found" });
    }
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Get build and launch commands for a specific test run in a report ---
app.get("/api/report/:name/commands/:testRunId", async (req, res) => {
  try {
    const report = await getReport(req.params.name);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    const configsPerRun = report.configsPerRun || [];
    const config = configsPerRun.find((c) => c.testRunId === parseInt(req.params.testRunId, 10));
    // Fall back to generating from top-level configs if per-run data is missing (older reports)
    const buildCmd = getBuildCommand(report.configs, config || {});
    const launchCmd = getLaunchCommand(report.configs, config || {});
    res.json({ success: true, data: { build: buildCmd, launch: launchCmd, hasPerRunConfig: !!config } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Get current results.md ---
app.get("/api/results", (_req, res) => {
  try {
    const content = fs.existsSync(RESULTS_FILE) ? fs.readFileSync(RESULTS_FILE, "utf8") : "";
    res.json({ success: true, data: content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Recursively find model files in a directory ---
function findModelFiles(dir, baseDir = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findModelFiles(fullPath, baseDir));
    } else if (entry.isFile() && (entry.name.endsWith('.gguf') || entry.name.endsWith('.bin') || entry.name.endsWith('.safetensors'))) {
      // Return path relative to the base directory with file stats
      const relPath = relative(baseDir, fullPath);
      try {
        const stat = fs.statSync(fullPath);
        results.push({ path: relPath, size: stat.size, mtime: stat.mtimeMs });
      } catch {
        results.push({ path: relPath, size: 0, mtime: 0 });
      }
    }
  }
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

//--- Return the models directory path ---
app.get("/api/models-dir", (_req, res) => {
  res.json({ success: true, data: MODELS_DIR });
});

//--- List models in a directory ---
app.get("/api/models", (_req, res) => {
  try {
    const dir = _req.query.directory || MODELS_DIR;
    const resolvedDir = resolveConfigPath(dir);
    const files = findModelFiles(resolvedDir);
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Delete a local model file ---
app.delete("/api/model/:path(*)", authorize("admin", "operator"), (req, res) => {
  try {
    const relPath = decodeURIComponent(req.params.path);
    const fullPath = join(MODELS_DIR, relPath);
    // Security: ensure the resolved path is within MODELS_DIR
    const resolvedPath = resolve(fullPath);
    if (!resolvedPath.startsWith(resolve(MODELS_DIR))) {
      return res.status(400).json({ success: false, error: "Invalid path" });
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    if (!fs.statSync(fullPath).isFile()) {
      return res.status(400).json({ success: false, error: "Not a file" });
    }
    fs.unlinkSync(fullPath);
    res.json({ success: true, message: `Deleted ${relPath}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Systemd service control (Linux only) ---
function requireSystemd(res) {
  if (process.platform !== 'linux') {
    return res.status(501).json({
      success: false,
      error: `Systemd service control is not available on ${process.platform}. This feature requires Linux.`,
    });
  }
  if (!commandExists('systemctl')) {
    return res.status(501).json({
      success: false,
      error: 'systemctl is not installed. This feature requires systemd.',
    });
  }
  return null; // OK to proceed
}

function commandExists(cmd) {
  try { execSync(`command -v ${cmd}`, { encoding: 'utf8' }); return true; }
  catch { return false; }
}

app.post("/api/service/start", authorize("admin"), (_req, res) => {
  const notSupported = requireSystemd(res);
  if (notSupported) return;
  try {
    execSync("systemctl --user start llama.service");
    res.json({ success: true, message: "llama.service started" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/service/stop", authorize("admin"), (_req, res) => {
  const notSupported = requireSystemd(res);
  if (notSupported) return;
  try {
    execSync("systemctl --user stop llama.service");
    res.json({ success: true, message: "llama.service stopped" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/service/status", (_req, res) => {
  const notSupported = requireSystemd(res);
  if (notSupported) return;
  try {
    const output = execSync("systemctl --user is-active llama.service").toString().trim();
    res.json({ success: true, active: output === "active" });
  } catch {
    res.json({ success: true, active: false });
  }
});

//--- Read current systemd service configuration ---
app.get("/api/service/config", (_req, res) => {
  const notSupported = requireSystemd(res);
  if (notSupported) return;
  try {
    const serviceUser = process.env.USER || "jon";
    const serviceName = "llama.service";
    const serviceFile = join("/home", serviceUser, ".config", "systemd", "user", serviceName);
    const envFile = join("/home", serviceUser, ".config", "systemd", "user", "llama-benchmark.env");

    // Check if service file exists
    if (!fs.existsSync(serviceFile)) {
      return res.json({ success: true, exists: false });
    }

    // Read and parse service file
    const serviceContent = fs.readFileSync(serviceFile, "utf8");

    // Extract ExecStart line
    const execStartMatch = serviceContent.match(/^ExecStart=(.+)$/m);
    const execStart = execStartMatch ? execStartMatch[1] : "";

    // Extract Description line
    const descMatch = serviceContent.match(/^Description=(.+)$/m);
    const description = descMatch ? descMatch[1] : "";

    // Extract Restart policy
    const restartMatch = serviceContent.match(/^Restart=(.+)$/m);
    const restart = restartMatch ? restartMatch[1] : "on-failure";

    // Extract RestartSec
    const restartSecMatch = serviceContent.match(/^RestartSec=(.+)$/m);
    const restartSec = restartSecMatch ? parseInt(restartSecMatch[1], 10) : 5;

    // Parse environment file into key-value pairs
    let envVars = {};
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, "utf8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx);
            const value = trimmed.substring(eqIdx + 1);
            envVars[key] = value;
          }
        }
      }
    }

    res.json({
      success: true,
      exists: true,
      description,
      execStart,
      restart,
      restartSec,
      envVars,
      serviceFile,
      envFile,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Update systemd service configuration ---
app.post("/api/service/update", authorize("admin"), (req, res) => {
  const notSupported = requireSystemd(res);
  if (notSupported) return;
  try {
    const { execStart, envVars, restart, restartSec } = req.body;

    if (!execStart) {
      return res.status(400).json({ success: false, error: "execStart is required" });
    }

    const serviceUser = process.env.USER || "jon";
    const serviceName = "llama.service";
    const serviceFile = join("/home", serviceUser, ".config", "systemd", "user", serviceName);
    const envFile = join("/home", serviceUser, ".config", "systemd", "user", "llama-benchmark.env");

    // Read existing service file to preserve other sections
    if (!fs.existsSync(serviceFile)) {
      return res.status(404).json({ success: false, error: "Service file not found. Install a service first." });
    }

    const serviceContent = fs.readFileSync(serviceFile, "utf8");

    // Update ExecStart
    let updatedService = serviceContent.replace(
      /^ExecStart=.+$/m,
      `ExecStart=${execStart}`
    );

    // Update Restart
    if (restart) {
      updatedService = updatedService.replace(
        /^Restart=.+$/m,
        `Restart=${restart}`
      );
    }

    // Update RestartSec
    if (restartSec !== undefined && restartSec !== null) {
      updatedService = updatedService.replace(
        /^RestartSec=.+$/m,
        `RestartSec=${restartSec}`
      );
    }

    // Write updated service file
    try {
      execSync(`cat > ${serviceFile} << 'SVCEOF'\n${updatedService}SVCEOF`);
    } catch (err) {
      console.error(`Failed to write service file: ${err.message}`);
      return res.status(500).json({ success: false, error: `Failed to write service file: ${err.message}` });
    }

    // Write environment file
    try {
      const envContent = Object.entries(envVars || {})
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n") + "\n";
      execSync(`cat > ${envFile} << 'ENVEOF'\n${envContent}ENVEOF`);
    } catch (err) {
      console.error(`Failed to write env file: ${err.message}`);
      return res.status(500).json({ success: false, error: `Failed to write env file: ${err.message}` });
    }

    // Reload systemd daemon
    try {
      execSync("systemctl --user daemon-reload");
    } catch (err) {
      console.error(`Failed to reload systemd: ${err.message}`);
      return res.status(500).json({ success: false, error: `daemon-reload failed: ${err.message}` });
    }

    // Restart the service
    try {
      execSync("systemctl --user restart llama.service");
    } catch (err) {
      console.error(`Failed to restart service: ${err.message}`);
      return res.status(500).json({ success: false, error: `restart failed: ${err.message}` });
    }

    res.json({
      success: true,
      message: "Service updated, reloaded, and restarted",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Install a systemd service from a report's launch command ---
app.post("/api/service/install", authorize("admin"), async (req, res) => {
  const notSupported = requireSystemd(res);
  if (notSupported) return;
  try {
    const { reportName, testRunId } = req.body;
    if (!reportName || !testRunId) {
      return res.status(400).json({ success: false, error: "reportName and testRunId are required" });
    }

    // Get the report from the database
    const report = await getReport(reportName);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    const configsPerRun = report.configsPerRun || [];
    const config = configsPerRun.find((c) => c.testRunId === parseInt(testRunId, 10));
    const launchCmd = getLaunchCommand(report.configs, config || {});

    // Get the model path for the service
    const modelPath = launchCmd.command.match(/-m ([^\s]+)/)?.[1] || "";
    const port = (config?.serverParameters?.port || report.configs?.llama_port || 11434);
    const host = (config?.serverParameters?.host || report.configs?.llama_host || "localhost");

    // Get the llama-server executable path
    const llamaServerPath = join(BENCHMARK_DIR, "llama.cpp", "build", "bin", "llama-server");
    const serviceUser = process.env.USER || "jon";

    // Build environment file content
    const envContent = launchCmd.env.join("\n") + "\n";
    const envFile = join("/home", serviceUser, ".config", "systemd", "user", "llama-benchmark.env");

    // Build service file content — use the shared llama.service name
    const serviceName = "llama.service";
    const serviceFile = join("/home", serviceUser, ".config", "systemd", "user", serviceName);

    // Strip the "./llama-server" prefix from launchCmd.command to avoid duplication
    // (llamaServerPath already provides the full binary path)
    const commandArgs = launchCmd.command.replace(/^\.\/llama-server\s*/, "");

    const serviceContent = `[Unit]
Description=Llama.cpp Benchmark Service - ${reportName} (Run #${testRunId})
After=network.target

[Service]
Type=simple
User=${serviceUser}
EnvironmentFile=${envFile}
ExecStart=${llamaServerPath} ${commandArgs}
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=llama-benchmark

[Install]
WantedBy=default.target
`;

    // Stop the existing service (if running) before overwriting its files
    try {
      execSync(`systemctl --user stop ${serviceName}`);
    } catch {
      // Service may not be running — that's fine
    }

    // Ensure systemd user directory exists
    const systemdDir = join("/home", serviceUser, ".config", "systemd", "user");
    try {
      execSync(`mkdir -p ${systemdDir}`);
    } catch {
      // Directory might already exist or we might not have permission
    }

    // Write environment file
    try {
      execSync(`cat > ${envFile} << 'ENVEOF'
${envContent}ENVEOF`);
    } catch (err) {
      console.error(`Failed to write env file: ${err.message}`);
      return res.status(500).json({ success: false, error: `Failed to write env file: ${err.message}` });
    }

    // Write service file
    try {
      execSync(`cat > ${serviceFile} << 'SVCEOF'
${serviceContent}SVCEOF`);
    } catch (err) {
      console.error(`Failed to write service file: ${err.message}`);
      return res.status(500).json({ success: false, error: `Failed to write service file: ${err.message}` });
    }

    // Helper to clean up written files on failure
    const cleanup = () => {
      try { fs.unlinkSync(envFile); } catch {}
      try { fs.unlinkSync(serviceFile); } catch {}
    };

    // Reload systemd daemon
    try {
      execSync(`systemctl --user daemon-reload`);
    } catch (err) {
      console.error(`Failed to reload systemd: ${err.message}`);
      cleanup();
      return res.status(500).json({ success: false, error: `daemon-reload failed: ${err.message}` });
    }

    // Enable the service
    try {
      execSync(`systemctl --user enable ${serviceName}`);
    } catch (err) {
      console.error(`Failed to enable service: ${err.message}`);
      cleanup();
      return res.status(500).json({ success: false, error: `enable failed: ${err.message}` });
    }

    // Start the service
    try {
      execSync(`systemctl --user start ${serviceName}`);
    } catch (err) {
      console.error(`Failed to start service: ${err.message}`);
      // Disable and remove the service files so the user isn't left with a broken service
      try { execSync(`systemctl --user disable ${serviceName}`); } catch {}
      cleanup();
      return res.status(500).json({ success: false, error: `start failed: ${err.message}` });
    }

    res.json({
      success: true,
      message: `Service ${serviceName} installed and started`,
      serviceName,
      envFile,
      serviceFile,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Kill processes on llama_port ---
app.post("/api/kill-port", authorize("admin"), async (req, res) => {
  try {
    const configs = await getConfigs();
    const port = configs?.llama_port || 11434;

    // Find PIDs using the port
    const pids = execSync(`lsof -ti :${port}`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);

    if (pids.length === 0) {
      return res.json({ success: true, message: `No processes found on port ${port}` });
    }

    // Kill each PID
    const killed = [];
    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid}`);
        killed.push(pid);
      } catch (err) {
        console.error(`Failed to kill PID ${pid}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Killed ${killed.length} process(es) on port ${port}`,
      killed,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- System status endpoint ---
app.get("/api/system-status", async (_req, res) => {
  try {
    const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
    const lines = meminfo.split("\n");
    let totalKB = 0;
    let availableKB = 0;
    let buffersKB = 0;
    let cachedKB = 0;
    let sReclaimableKB = 0;

    for (const line of lines) {
      const match = line.match(/^(\w+)\s*:\s*(\d+)\s*kB/);
      if (match) {
        const key = match[1];
        const value = parseInt(match[2], 10);
        if (key === "MemTotal") totalKB = value;
        else if (key === "MemAvailable") availableKB = value;
        else if (key === "Buffers") buffersKB = value;
        else if (key === "Cached") cachedKB = value;
        else if (key === "SReclaimable") sReclaimableKB = value;
      }
    }

    const totalGB = totalKB / (1024 * 1024);
    const availableGB = availableKB / (1024 * 1024);
    // Used = total - available (available already accounts for buffers/cache)
    const usedGB = totalGB - availableGB;

    // CPU usage from /proc/stat
    let cpuUsage = 0;
    let cpuCores = [];
    try {
      const statData = fs.readFileSync('/proc/stat', 'utf8').split('\n');
      const cpuLine = statData[0];
      const [, user1, nice1, system1, idle1, iowait1, irq1, softirq1, steal1] = cpuLine.split(/\s+/);
      const total1 = parseInt(user1, 10) + parseInt(nice1, 10) + parseInt(system1, 10) + parseInt(idle1, 10) + parseInt(iowait1, 10) + parseInt(irq1, 10) + parseInt(softirq1, 10) + parseInt(steal1, 10);
      const idleTotal1 = parseInt(idle1, 10) + parseInt(iowait1, 10);

      // Per-core snapshots
      const core1 = {};
      statData.forEach((line) => {
        const coreMatch = line.match(/^(cpu\d+)\s+(.+)/);
        if (coreMatch) {
          const [, name, values] = coreMatch;
          const nums = values.split(/\s+/).map(Number);
          core1[name] = nums;
        }
      });

      // Short delay to measure delta
      await new Promise(resolve => setTimeout(resolve, 500));

      const statData2 = fs.readFileSync('/proc/stat', 'utf8').split('\n');
      const cpuLine2 = statData2[0];
      const [, user2, nice2, system2, idle2, iowait2, irq2, softirq2, steal2] = cpuLine2.split(/\s+/);
      const total2 = parseInt(user2, 10) + parseInt(nice2, 10) + parseInt(system2, 10) + parseInt(idle2, 10) + parseInt(iowait2, 10) + parseInt(irq2, 10) + parseInt(softirq2, 10) + parseInt(steal2, 10);
      const idleTotal2 = parseInt(idle2, 10) + parseInt(iowait2, 10);

      const totalDelta = total2 - total1;
      const idleDelta = idleTotal2 - idleTotal1;
      if (totalDelta > 0) {
        cpuUsage = Math.round(((totalDelta - idleDelta) / totalDelta) * 100);
      }

      // Per-core snapshots after delay
      const core2 = {};
      statData2.forEach((line) => {
        const coreMatch = line.match(/^(cpu\d+)\s+(.+)/);
        if (coreMatch) {
          const [, name, values] = coreMatch;
          const nums = values.split(/\s+/).map(Number);
          core2[name] = nums;
        }
      });

      // Calculate per-core usage
      const coreNames = Object.keys(core1).sort((a, b) => {
        const numA = parseInt(a.slice(3), 10);
        const numB = parseInt(b.slice(3), 10);
        return numA - numB;
      });

      for (const name of coreNames) {
        const t1 = core1[name].reduce((s, v) => s + v, 0);
        const i1 = core1[name][3] + core1[name][4]; // idle + iowait
        const t2 = core2[name].reduce((s, v) => s + v, 0);
        const i2 = core2[name][3] + core2[name][4];
        const td = t2 - t1;
        const id = i2 - i1;
        const pct = td > 0 ? Math.round(((td - id) / td) * 100) : 0;
        cpuCores.push({ name, usage: pct });
      }
    } catch {
      // Silently fail if /proc/stat is unavailable
    }

    // GPU stats via nvidia-smi
    let gpuStats = [];
    try {
      const output = execSync(
        'nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits',
        { encoding: 'utf8' }
      );
      output.trim().split('\n').forEach(line => {
        const parts = line.split(',').map(s => s.trim());
        const memoryUsedMB = parseInt(parts[3]);
        const memoryTotalMB = parseInt(parts[4]);
        gpuStats.push({
          index: parseInt(parts[0]),
          name: parts[1],
          utilization: parseInt(parts[2]),
          memoryUsedMB,
          memoryTotalMB,
          temperature: parseInt(parts[5]),
          memoryUsedPercent: memoryTotalMB > 0 ? Math.round((memoryUsedMB / memoryTotalMB) * 100) : 0,
        });
      });
    } catch {
      // nvidia-smi not available — keep gpuStats as []
    }

    res.json({
      success: true,
      data: {
        totalGB: Math.round(totalGB * 100) / 100,
        usedGB: Math.round(usedGB * 100) / 100,
        availableGB: Math.round(availableGB * 100) / 100,
        totalMB: Math.round(totalKB / 1024),
        usedMB: Math.round((usedGB * 1024)),
        percentUsed: totalKB > 0 ? Math.round((usedGB / totalGB) * 100) : 0,
        cpuUsage,
        cpuCores,
        gpuStats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

//--- HuggingFace Model Search & Download ---
// Track active HF downloads
let hfDownloads = new Map(); // modelId -> { status, progress, total, downloaded, error }

// Search HuggingFace models (uses the free Inference API, no auth needed)
app.get("/api/hf/search", async (req, res) => {
  try {
    const { q, limit = 20, sort = "downloads", direction = -1, filter } = req.query;

    if (!q || !q.trim()) {
      return res.json({ success: true, data: [] });
    }

    let searchUrl = `https://huggingface.co/api/models?search=${encodeURIComponent(q.trim())}&limit=${limit}&sort=${sort}&direction=${direction}`;
    if (filter) {
      searchUrl += `&filter=${encodeURIComponent(filter)}`;
    }

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "betty-benchmark/1.0",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `HuggingFace API error: ${response.status} ${response.statusText}`,
      });
    }

    const models = await response.json();
    res.json({ success: true, data: models });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get model details (tags, pipeline_tag, etc.)
app.get("/api/hf/model/:id", async (req, res) => {
  try {
    const modelId = req.params.id;
    const response = await fetch(`https://huggingface.co/api/models/${modelId}`, {
      headers: { "User-Agent": "betty-benchmark/1.0" },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `HuggingFace API error: ${response.status}`,
      });
    }

    const model = await response.json();
    res.json({ success: true, data: model });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List available files for a model
app.get("/api/hf/model/:id/files", async (req, res) => {
  try {
    const modelId = req.params.id;
    const response = await fetch(`https://huggingface.co/api/models/${modelId}/tree/main`, {
      headers: { "User-Agent": "betty-benchmark/1.0" },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `HuggingFace API error: ${response.status}`,
      });
    }

    const files = await response.json();
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download a model file from HuggingFace with progress streaming
app.post("/api/hf/download", authorize("admin", "operator"), async (req, res) => {
  try {
    const { modelId, filename, targetDir } = req.body;

    if (!modelId) {
      return res.status(400).json({ success: false, error: "modelId is required" });
    }

    // Set up SSE response for progress updates
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const downloadDir = targetDir || MODELS_DIR;
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Determine the file path
    const safeModelId = modelId.replace(/[\/]/g, "_");
    const modelSubDir = join(downloadDir, safeModelId);
    if (!fs.existsSync(modelSubDir)) {
      fs.mkdirSync(modelSubDir, { recursive: true });
    }

    // If no specific file, default to the first .gguf file found
    let downloadUrl;
    if (filename) {
      downloadUrl = `https://huggingface.co/${modelId}/resolve/main/${filename}`;
    } else {
      // Find the first .gguf file
      const filesResponse = await fetch(`https://huggingface.co/api/models/${modelId}/tree/main`, {
        headers: { "User-Agent": "betty-benchmark/1.0" },
      });
      if (filesResponse.ok) {
        const files = await filesResponse.json();
        const ggufFile = files.find(f => f.path && f.path.endsWith('.gguf'));
        if (ggufFile) {
          filename = ggufFile.path;
          downloadUrl = `https://huggingface.co/${modelId}/resolve/main/${filename}`;
        } else {
          // Fall back to first file that looks like a model
          const firstFile = files.find(f => f.path && !f.path.endsWith('/'));
          if (firstFile) {
            filename = firstFile.path;
            downloadUrl = `https://huggingface.co/${modelId}/resolve/main/${filename}`;
          }
        }
      }
    }

    if (!downloadUrl) {
      return res.status(400).json({ success: false, error: "Could not determine file to download" });
    }

    const filePath = join(modelSubDir, filename.split("/").pop());

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      res.write(`event: hf-download\ndata: PROGRESS:100\n\n`);
      res.write(`event: hf-download\ndata: STATUS:Download complete\n\n`);
      res.write(`event: hf-download\ndata: FILE:${filePath}\n\n`);
      safeFlush(res);
      res.end();
      return;
    }

    // Create an AbortController for this download so it can be cancelled
    const abortController = new AbortController();
    hfDownloads.set(modelId, {
      status: "downloading",
      progress: 0,
      total: totalSize,
      downloaded: 0,
      filename: filename,
      filePath: filePath,
      abortController,
    });

    // Stream the download
    const downloadResponse = await fetch(downloadUrl, {
      headers: { "User-Agent": "betty-benchmark/1.0" },
      signal: abortController.signal,
    });

    if (!downloadResponse.ok) {
      res.write(`event: hf-download\ndata: STATUS:Download failed\n\n`);
      res.write(`event: hf-download\ndata: ERROR: HTTP ${downloadResponse.status}\n\n`);
      safeFlush(res);
      res.end();
      return;
    }

    const total = downloadResponse.headers.get("content-length");
    const totalSize = total ? parseInt(total, 10) : 0;

    // Use a Transform stream to track progress while piping to file.
    // This avoids the Node.js anti-pattern of attaching both a 'data' listener
    // and pipe() to the same stream, which causes a race condition where data
    // may be lost or the file stream may not receive the data properly.
    let downloaded = 0;
    let bodyStream = null;
    let fileStream = null;
    const progressTransform = new Transform({
      transform(chunk, encoding, callback) {
        const current = hfDownloads.get(modelId);
        if (current && current.status !== "downloading") return callback(null, chunk);
        downloaded += chunk.length;
        const progress = totalSize > 0 ? Math.round((downloaded / totalSize) * 100) : Math.min(99, Math.round((downloaded / (1024 * 1024 * 100)) * 100));

        hfDownloads.set(modelId, {
          status: "downloading",
          progress,
          total: totalSize,
          downloaded,
          filename,
          filePath,
          abortController,
          bodyStream: { get: () => bodyStream },
          fileStream: { get: () => fileStream },
        });

        // Combine progress and downloaded bytes into a single event to avoid
        // the frontend receiving separate PROGRESS and DOWNLOADED events that
        // would reset the progress bar to 0% when DOWNLOADED fires.
        res.write(`event: hf-download\ndata: PROGRESS:${progress}:${downloaded}\n\n`);
        safeFlush(res);

        // Pass the chunk through unchanged
        callback(null, chunk);
      },
    });

    fileStream = fs.createWriteStream(filePath);

    // Store stream references for cancellation
    hfDownloads.set(modelId, {
      status: "downloading",
      progress: 0,
      total: totalSize,
      downloaded: 0,
      filename,
      filePath,
      abortController,
      bodyStream: { get: () => bodyStream },
      fileStream: { get: () => fileStream },
    });

    await new Promise((resolve, reject) => {
      bodyStream = Readable.fromWeb(downloadResponse.body);
      bodyStream.on("error", (err) => {
        const current = hfDownloads.get(modelId);
        if (current && current.status !== "downloading") return;
        reject(err);
      });
      bodyStream.pipe(progressTransform).pipe(fileStream);
      fileStream.on("finish", () => {
        const current = hfDownloads.get(modelId);
        if (current && current.status !== "downloading") return;
        fileStream.close(() => {
          hfDownloads.set(modelId, {
            status: "complete",
            progress: 100,
            total: totalSize,
            downloaded,
            filename,
            filePath,
          });
          res.write(`event: hf-download\ndata: PROGRESS:100\n\n`);
          res.write(`event: hf-download\ndata: STATUS:Download complete\n\n`);
          res.write(`event: hf-download\ndata: FILE:${filePath}\n\n`);
          safeFlush(res);
          res.end();
          resolve();
        });
      });
      fileStream.on("error", (err) => {
        const current = hfDownloads.get(modelId);
        if (current && current.status !== "downloading") return;
        hfDownloads.set(modelId, {
          status: "error",
          progress: 0,
          total: 0,
          downloaded: 0,
          error: err.message,
        });
        res.write(`event: hf-download\ndata: STATUS:Download failed\n\n`);
        res.write(`event: hf-download\ndata: ERROR: ${err.message}\n\n`);
        safeFlush(res);
        res.end();
        reject(err);
      });
    });
  } catch (err) {
    try {
      // Check if this was a cancellation
      const current = hfDownloads.get(modelId);
      if (current && current.status === "cancelled") {
        res.write(`event: hf-download\ndata: STATUS:Cancelled\n\n`);
      } else {
        res.write(`event: hf-download\ndata: STATUS:Download failed\n\n`);
        res.write(`event: hf-download\ndata: ERROR: ${err.message}\n\n`);
      }
      safeFlush(res);
      res.end();
    } catch {}
  }
});

// Get download progress
app.get("/api/hf/download/:modelId", (req, res) => {
  const modelId = req.params.modelId;
  const download = hfDownloads.get(modelId);
  if (download) {
    res.json({ success: true, data: download });
  } else {
    res.json({ success: true, data: null });
  }
});

// List active (in-progress) downloads
app.get("/api/hf/active-downloads", (req, res) => {
  const active = [];
  for (const [modelId, download] of hfDownloads) {
    if (download.status === "downloading") {
      active.push({ modelId, ...download });
    }
  }
  res.json({ success: true, data: active });
});

// Cancel an active download
app.delete("/api/hf/download/active/:modelId", authorize("admin", "operator"), (req, res) => {
  const modelId = req.params.modelId;
  const download = hfDownloads.get(modelId);
  if (!download || download.status !== "downloading") {
    hfDownloads.delete(modelId);
    return res.json({ success: true, message: "Download not active" });
  }
  // Mark as cancelled to prevent further processing
  // This flag is checked in the Transform stream and error handlers
  hfDownloads.set(modelId, { ...download, status: "cancelled" });
  // Abort the fetch request to stop the download
  if (download.abortController) {
    download.abortController.abort();
  }
  // Destroy the body stream if it exists (handles streaming phase)
  const bodyStream = download.bodyStream?.get?.();
  if (bodyStream) {
    bodyStream.destroy();
  }
  // Destroy the file stream if it exists
  const fileStream = download.fileStream?.get?.();
  if (fileStream) {
    fileStream.destroy();
  }
  // Delete partial file
  try {
    if (download.filePath && fs.existsSync(download.filePath)) {
      fs.rmSync(download.filePath, { force: true });
    }
  } catch (err) {
    console.error(`Failed to delete partial file for ${modelId}:`, err.message);
  }
  res.json({ success: true, message: `Cancelled download for ${modelId}` });
});

// List downloaded HF models
app.get("/api/hf/downloads", (req, res) => {
  try {
    const entries = [];
    if (fs.existsSync(MODELS_DIR)) {
      const dirs = fs.readdirSync(MODELS_DIR).filter(d => {
        const dirPath = join(MODELS_DIR, d);
        return fs.statSync(dirPath).isDirectory();
      });
      for (const dir of dirs) {
        const files = fs.readdirSync(join(MODELS_DIR, dir))
          .filter(f => f.endsWith(".gguf"))
          .map(f => {
            const stat = fs.statSync(join(MODELS_DIR, dir, f));
            return { name: f, size: stat.size, modified: stat.mtime };
          });
        entries.push({ modelId: dir, files });
      }
    }
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a downloaded HF model
app.delete("/api/hf/download/:modelId", authorize("admin", "operator"), (req, res) => {
  try {
    const modelId = req.params.modelId;
    const modelDir = join(MODELS_DIR, modelId);
    if (fs.existsSync(modelDir)) {
      fs.rmSync(modelDir, { recursive: true });
      hfDownloads.delete(modelId);
      res.json({ success: true, message: `Deleted ${modelId}` });
    } else {
      res.status(404).json({ success: false, error: "Model not found" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Chat Templates API ---

// List chat template files
app.get("/api/chat-templates", async (_req, res) => {
  try {
    const templates = await listChatTemplates();
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download a chat template via wget with SSE progress
app.post("/api/chat-templates/download", authorize("admin", "operator"), (req, res) => {
  try {
    const { url, filename } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    // Validate URL format and protocol
    let parsedUrl;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      return res.status(400).json({ success: false, error: "Invalid URL format" });
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ success: false, error: "Only HTTP and HTTPS URLs are allowed" });
    }

    // Determine target filename
    let targetFilename = filename || basename(parsedUrl.pathname);
    // Sanitize filename
    targetFilename = targetFilename.replace(/[^a-zA-Z0-9._\-]/g, '_');

    if (!targetFilename) {
      return res.status(400).json({ success: false, error: "Could not determine filename from URL" });
    }

    const targetPath = join(CHAT_TEMPLATES_DIR, targetFilename);

    // Set up SSE response for progress updates
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Check if file already exists
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      res.write(`event: chat-template\ndata: EXISTS:${targetFilename}\n\n`);
      res.write(`event: chat-template\ndata: SIZE:${stat.size}\n\n`);
      safeFlush(res);
      res.end();
      return;
    }

    const wget = spawn("wget", ["--no-clobber", "-O", targetPath, url.trim()]);

    wget.stderr.on("data", (data) => {
      const text = data.toString();
      // Parse wget progress: look for percentage pattern like "34%"
      const match = text.match(/(\d+)%/);
      if (match) {
        const progress = parseInt(match[1], 10);
        // Try to get downloaded bytes from wget output
        const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s([KMGT]?B)/);
        let downloaded = 0;
        if (sizeMatch) {
          const val = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2];
          if (unit === 'KB') downloaded = val * 1024;
          else if (unit === 'MB') downloaded = val * 1024 * 1024;
          else if (unit === 'GB') downloaded = val * 1024 * 1024 * 1024;
          else downloaded = val;
        }
        res.write(`event: chat-template\ndata: PROGRESS:${progress}:${downloaded}\n\n`);
        safeFlush(res);
      }
    });

    wget.on("close", async (code) => {
      if (code === 0 && fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        // Store the downloaded template in the database
        try {
          const content = fs.readFileSync(targetPath, "utf-8");
          await saveChatTemplate(targetFilename, content, stat.size);
        } catch (dbErr) {
          console.error(`[chat-template] Failed to store template in DB: ${dbErr.message}`);
        }
        res.write(`event: chat-template\ndata: FILE:${targetFilename}\n\n`);
        res.write(`event: chat-template\ndata: SIZE:${stat.size}\n\n`);
        safeFlush(res);
      } else {
        // Clean up partial file on failure
        if (fs.existsSync(targetPath)) {
          try { fs.unlinkSync(targetPath); } catch {}
        }
        res.write(`event: chat-template\ndata: ERROR:Download failed with code ${code}\n\n`);
        safeFlush(res);
      }
      res.end();
    });

    wget.on("error", (err) => {
      if (fs.existsSync(targetPath)) {
        try { fs.unlinkSync(targetPath); } catch {}
      }
      res.write(`event: chat-template\ndata: ERROR:${err.message}\n\n`);
      safeFlush(res);
      res.end();
    });
  } catch (err) {
    if (res.headersSent) {
      res.write(`event: chat-template\ndata: ERROR:${err.message}\n\n`);
      safeFlush(res);
      res.end();
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// Delete a chat template file
app.delete("/api/chat-templates/:filename", authorize("admin", "operator"), async (req, res) => {
  try {
    const safeFilename = req.params.filename.replace(/[^a-zA-Z0-9._\-]/g, '_');
    const deleted = await deleteChatTemplate(safeFilename);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }
    res.json({ success: true, message: `Deleted ${safeFilename}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- mmproj Model API ---

// List mmproj model files
app.get("/api/mmproj-models", (_req, res) => {
  try {
    if (!fs.existsSync(MODELS_DIR)) {
      return res.json({ success: true, data: [] });
    }
    const files = findModelFiles(MODELS_DIR)
      .filter(f => f.path.toLowerCase().includes('mmproj'))
      .map(f => ({
        filename: f.path,
        size: f.size,
        modified: f.mtime,
      }))
      .sort((a, b) => b.modified - a.modified);
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download an mmproj file via wget with SSE progress
app.post("/api/mmproj/download", authorize("admin", "operator"), (req, res) => {
  try {
    const { url, filename } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    // Validate URL format and protocol
    let parsedUrl;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      return res.status(400).json({ success: false, error: "Invalid URL format" });
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ success: false, error: "Only HTTP and HTTPS URLs are allowed" });
    }

    // Determine target filename
    let targetFilename = filename || basename(parsedUrl.pathname);
    // Sanitize filename
    targetFilename = targetFilename.replace(/[^a-zA-Z0-9._\-]/g, '_');

    if (!targetFilename) {
      return res.status(400).json({ success: false, error: "Could not determine filename from URL" });
    }

    const targetPath = join(MODELS_DIR, targetFilename);

    // Set up SSE response for progress updates
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Check if file already exists
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      res.write(`event: mmproj\ndata: EXISTS:${targetFilename}\n\n`);
      res.write(`event: mmproj\ndata: SIZE:${stat.size}\n\n`);
      safeFlush(res);
      res.end();
      return;
    }

    const wget = spawn("wget", ["--no-clobber", "-O", targetPath, url.trim()]);

    wget.stderr.on("data", (data) => {
      const text = data.toString();
      // Parse wget progress: look for percentage pattern like "34%"
      const match = text.match(/(\d+)%/);
      if (match) {
        const progress = parseInt(match[1], 10);
        // Try to get downloaded bytes from wget output
        const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s([KMGT]?B)/);
        let downloaded = 0;
        if (sizeMatch) {
          const val = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2];
          if (unit === 'KB') downloaded = val * 1024;
          else if (unit === 'MB') downloaded = val * 1024 * 1024;
          else if (unit === 'GB') downloaded = val * 1024 * 1024 * 1024;
          else downloaded = val;
        }
        res.write(`event: mmproj\ndata: PROGRESS:${progress}:${downloaded}\n\n`);
        safeFlush(res);
      }
    });

    wget.on("close", (code) => {
      if (code === 0 && fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        res.write(`event: mmproj\ndata: FILE:${targetFilename}\n\n`);
        res.write(`event: mmproj\ndata: SIZE:${stat.size}\n\n`);
        safeFlush(res);
      } else {
        // Clean up partial file on failure
        if (fs.existsSync(targetPath)) {
          try { fs.unlinkSync(targetPath); } catch {}
        }
        res.write(`event: mmproj\ndata: ERROR:Download failed with code ${code}\n\n`);
        safeFlush(res);
      }
      res.end();
    });

    wget.on("error", (err) => {
      if (fs.existsSync(targetPath)) {
        try { fs.unlinkSync(targetPath); } catch {}
      }
      res.write(`event: mmproj\ndata: ERROR:${err.message}\n\n`);
      safeFlush(res);
      res.end();
    });
  } catch (err) {
    if (res.headersSent) {
      res.write(`event: mmproj\ndata: ERROR:${err.message}\n\n`);
      safeFlush(res);
      res.end();
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// Delete an mmproj file
app.delete("/api/mmproj/:filename", authorize("admin", "operator"), (req, res) => {
  try {
    const safeFilename = req.params.filename.replace(/[^a-zA-Z0-9._\-\/]/g, '_');
    // Prevent directory traversal
    const cleanPath = safeFilename.replace(/\.\./g, '');
    const filePath = join(MODELS_DIR, cleanPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "mmproj file not found" });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true, message: `Deleted ${cleanPath}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Delete llama.cpp build directory ---
app.delete("/api/build/delete", authorize("admin"), (req, res) => {
  try {
    const buildDir = join(BENCHMARK_DIR, "llama.cpp", "build");
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
      res.json({ success: true, message: "Build directory deleted" });
    } else {
      res.json({ success: true, message: "Build directory does not exist" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Delete llama.cpp repository ---
app.delete("/api/build/llama/delete", authorize("admin"), (req, res) => {
  try {
    const llamaDir = join(BENCHMARK_DIR, "llama.cpp");
    if (fs.existsSync(llamaDir)) {
      fs.rmSync(llamaDir, { recursive: true, force: true });
      res.json({ success: true, message: "llama.cpp repository deleted" });
    } else {
      res.json({ success: true, message: "llama.cpp repository does not exist" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Build llama.cpp endpoint ---
app.post("/api/build", authorize("admin"), async (req, res) => {
  if (buildStatus !== "idle") {
    return res.status(409).json({
      success: false,
      error: `Build is already ${buildStatus}`,
    });
  }

  try {
    buildStatus = "building";

    // Set up SSE response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Read configs to get build cores
    const configs = await getConfigs();
    const buildCores = configs?.build_cores || 1;

    const buildProcess = spawn("node", ["index.js", "--build-only"], {
      cwd: BENCHMARK_DIR,
      env: {
        ...process.env,
        GGML_CUDA_ENABLE_UNIFIED_MEMORY: configs?.export_configs?.GGML_CUDA_ENABLE_UNIFIED_MEMORY || "1",
        CUDA_SCALE_LAUNCH_QUEUES: configs?.export_configs?.CUDA_SCALE_LAUNCH_QUEUES || "4x",
        LLAMA_CACHE: resolveConfigPath(configs?.export_configs?.LLAMA_CACHE || configs?.llama_cache || ""),
        GGML_CUDA_P2P: configs?.export_configs?.GGML_CUDA_P2P || "on",
        LLAMA_ARG_FIT: configs?.export_configs?.LLAMA_ARG_FIT ?? true,
        ...(configs.export_configs?.LLAMA_ARG_FIT && configs.export_configs?.LLAMA_ARG_FIT_TARGET !== undefined && configs.export_configs?.LLAMA_ARG_FIT_TARGET !== null
          ? { LLAMA_ARG_FIT_TARGET: configs.export_configs?.LLAMA_ARG_FIT_TARGET }
          : {}),
        ...(configs.export_configs?.LLAMA_ARG_FIT && configs.export_configs?.LLAMA_ARG_FIT_CTX !== undefined && configs.export_configs?.LLAMA_ARG_FIT_CTX !== null
          ? { LLAMA_ARG_FIT_CTX: configs.export_configs?.LLAMA_ARG_FIT_CTX }
          : {}),
        CUDACXX: configs.cuda_configs?.cudacxx || "/usr/local/cuda/bin/nvcc",
        PATH: `/usr/local/cuda-${configs.cuda_configs?.cuda_version || "12.6"}/bin${process.env.PATH ? ":" + process.env.PATH : ""}`,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";

    let progressInterval = setInterval(() => {
      progressInterval++;
      const pct = Math.min(90, 10 + Math.floor(progressInterval / 2));
      res.write(`event: build-log\ndata: PROGRESS:${pct}\n\n`);
      safeFlush(res);
    }, 3000);

    buildProcess.stdout.on("data", (data) => {
      const text = data.toString();
      stdoutBuffer += text;
      text.split("\n").filter(Boolean).forEach(line => {
        res.write(`event: build-log\ndata: ${line}\n\n`);
      });
      safeFlush(res);
    });

    buildProcess.stderr.on("data", (data) => {
      const text = data.toString();
      stderrBuffer += text;
      text.split("\n").filter(Boolean).forEach(line => {
        res.write(`event: build-log\ndata: ${line}\n\n`);
      });
      safeFlush(res);
    });

    await new Promise((resolve, reject) => {
      buildProcess.on("close", (code) => {
        clearInterval(progressInterval);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with exit code ${code}`));
        }
      });

      buildProcess.on("error", (err) => {
        clearInterval(progressInterval);
        reject(err);
      });
    });

    // Send final progress and completion (only on success)
    res.write(`event: build-log\ndata: PROGRESS:100\n\n`);
    res.write(`event: build-log\ndata: STATUS:Build complete!\n\n`);
    safeFlush(res);
    res.end();
    buildStatus = "success";
  } catch (err) {
    res.write(`event: build-log\ndata: STATUS:Build failed\n\n`);
    res.write(`event: build-log\ndata: ERROR: ${err.message}\n\n`);
    safeFlush(res);
    res.end();
    buildStatus = "error";
  } finally {
    // Reset after a delay so the UI can show the result
    setTimeout(() => {
      buildStatus = "idle";
    }, 10000);
  }
});

//--- Clone repository endpoint ---
app.post("/api/clone", authorize("admin"), async (req, res) => {
  try {
    const { url, branch, dir } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: "Repository URL is required" });
    }

    if (!dir) {
      return res.status(400).json({ success: false, error: "Target directory is required" });
    }

    // Check if directory already exists
    const targetPath = join(BENCHMARK_DIR, dir);
    if (fs.existsSync(targetPath)) {
      // Check if it's a git repo
      const gitDir = join(targetPath, ".git");
      if (fs.existsSync(gitDir)) {
        return res.status(409).json({ success: false, error: `Directory "${dir}" already exists and appears to be a git repository` });
      }
      return res.status(409).json({ success: false, error: `Directory "${dir}" already exists` });
    }

    // Set up SSE response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Build git clone command
    const cloneArgs = ["clone", url, dir];
    if (branch) {
      cloneArgs.splice(1, 0, "-b", branch);
    }
    // Use depth=1 for faster cloning (shallow clone)
    cloneArgs.splice(1, 0, "--depth", "1");

    const gitProcess = spawn("git", cloneArgs, {
      cwd: BENCHMARK_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";

    // Send progress updates
    let progressInterval = setInterval(() => {
      progressInterval++;
      const pct = Math.min(80, 10 + Math.floor(progressInterval / 2));
      res.write(`event: clone-log\ndata: PROGRESS:${pct}\n\n`);
      safeFlush(res);
    }, 3000);

    gitProcess.stdout.on("data", (data) => {
      const text = data.toString();
      stdoutBuffer += text;
      // Stream each line
      text.split("\n").filter(Boolean).forEach(line => {
        res.write(`event: clone-log\ndata: ${line}\n\n`);
      });
      safeFlush(res);
    });

    gitProcess.stderr.on("data", (data) => {
      const text = data.toString();
      stderrBuffer += text;
      text.split("\n").filter(Boolean).forEach(line => {
        res.write(`event: clone-log\ndata: ${line}\n\n`);
      });
      safeFlush(res);
    });

    const cloneResult = await new Promise((resolve, reject) => {
      gitProcess.on("close", (code) => {
        clearInterval(progressInterval);
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject(new Error(`Git clone failed with exit code ${code}`));
        }
      });

      gitProcess.on("error", (err) => {
        clearInterval(progressInterval);
        reject(err);
      });
    });

    // Send final progress and completion
    res.write(`event: clone-log\ndata: PROGRESS:100\n\n`);
    res.write(`event: clone-log\ndata: STATUS:Clone complete!\n\n`);
    safeFlush(res);
    res.end();

  } catch (err) {
    res.write(`event: clone-log\ndata: STATUS:Clone failed\n\n`);
    res.write(`event: clone-log\ndata: ERROR: ${err.message}\n\n`);
    safeFlush(res);
    res.end();
  }
});

//--- Git update check endpoint ---
app.get("/api/git/update-status", (_req, res) => {
  res.json({ success: true, data: gitUpdateCache });
});

//--- Git update (pull + restart service) endpoint ---
app.post("/api/git/update", authorize("admin"), async (_req, res) => {
  try {
    // Check if the service exists and is enabled
    let isServiceEnabled;
    try {
      const enabledOutput = execSync("systemctl --user is-enabled llama.service", { encoding: "utf8" }).trim();
      isServiceEnabled = enabledOutput === "enabled";
    } catch {
      // Service doesn't exist or is disabled
      return res.json({
        success: false,
        error: "Service 'llama.service' does not exist or is not enabled. Enable it first with 'systemctl --user enable llama.service'.",
      });
    }

    // Check if we're in the correct repo directory
    const gitDir = join(BENCHMARK_DIR, ".git");
    if (!fs.existsSync(gitDir)) {
      return res.json({
        success: false,
        error: "Not a git repository. Please initialize or clone the repository first.",
      });
    }

    // Pull latest changes
    try {
      execSync("git pull", { cwd: BENCHMARK_DIR, encoding: "utf8" });
    } catch (err) {
      return res.json({
        success: false,
        error: `Git pull failed: ${err.message}`,
      });
    }

    // Reload systemd and restart the service
    try {
      execSync("systemctl --user daemon-reload");
      execSync("systemctl --user restart llama.service");
    } catch (err) {
      return res.json({
        success: false,
        error: `Service restart failed: ${err.message}`,
      });
    }

    // Refresh the git update cache
    checkGitUpdate();

    res.json({ success: true, message: "Updated and restarted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Run update script endpoint ---
app.post("/api/update", authorize("admin"), (_req, res) => {
  try {
    const scriptPath = join(__dirname, '..', '..', 'scripts', 'update.sh');
    const output = execSync(`/bin/bash ${scriptPath}`, { encoding: 'utf8' });
    res.json({ success: true, message: 'Update complete', output: output.trim() });
  } catch (err) {
    res.json({ success: false, error: err.message || err.stderr?.toString() || 'Update failed' });
  }
});

//--- Journalctl logs endpoint (llama.service) ---
app.get('/api/logs', (_req, res) => {
  try {
    const logs = execSync('journalctl --user -r -u llama.service -n 1000 --no-pager', { encoding: 'utf8' });
    res.json({ success: true, data: logs });
  } catch (err) {
    res.json({ success: true, data: `Error fetching logs: ${err.message}` });
  }
});

//--- Journalctl logs endpoint (betty.service) ---
app.get('/api/logs/betty', (_req, res) => {
  try {
    const logs = execSync('journalctl --user -r -u betty.service -n 1000 --no-pager', { encoding: 'utf8' });
    res.json({ success: true, data: logs });
  } catch (err) {
    res.json({ success: true, data: `Error fetching logs: ${err.message}` });
  }
});

//--- Docs endpoints ---
const DOCS_DIR = join(__dirname, '..', '..', 'docs');

function resolveDocRef(content, filename) {
  // Replace [[filename]] with link to the doc
  return content.replace(/\[\[([\w-]+)\]\]/g, (_match, ref) => {
    const refFile = ref.endsWith('.md') ? ref : `${ref}.md`;
    return `[${ref}](${refFile})`;
  });
}

function parseFrontmatterTags(content) {
  const match = content.match(/^---\n[\s\S]*?tags:\s*\[([^\]]+)\]/m);
  if (!match) return [];
  return match[1].split(',').map(t => t.trim()).filter(Boolean);
}

function extractDescription(content) {
  // Get the first non-empty paragraph after the title and frontmatter,
  // stopping at headings, code blocks, or table of contents
  const lines = content.split('\n');
  let inFrontmatter = false;
  let foundTitle = false;
  let inTOC = false;
  const paragraphs = [];
  for (const line of lines) {
    if (line === '---') { inFrontmatter = !inFrontmatter; continue; }
    if (inFrontmatter) continue;
    if (!foundTitle && line.startsWith('# ')) { foundTitle = true; continue; }
    if (foundTitle) {
      // Stop at headings (h2+)
      if (/^#{2,}\s/.test(line)) break;
      // Detect table of contents
      if (/^- \[/.test(line.trim()) || /^## Table/.test(line)) { inTOC = true; continue; }
      if (inTOC && /^- \[/.test(line.trim())) continue;
      if (inTOC && line.trim()) { inTOC = false; }
      // Skip empty lines and code fences
      if (!line.trim() || line.startsWith('```')) continue;
      paragraphs.push(line.trim());
      if (paragraphs.length >= 1) break; // Just the first paragraph
    }
  }
  return paragraphs.join(' ').substring(0, 200);
}

app.get('/api/docs', (_req, res) => {
  try {
    if (!fs.existsSync(DOCS_DIR)) {
      return res.status(404).json({ success: false, error: 'Docs directory not found' });
    }
    const files = fs.readdirSync(DOCS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort((a, b) => {
        // Sort index.md first, then alphabetically
        if (a === 'index.md') return -1;
        if (b === 'index.md') return 1;
        return a.localeCompare(b);
      })
      .map(f => {
        const name = f.replace(/\.md$/, '');
        const title = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const content = fs.readFileSync(join(DOCS_DIR, f), 'utf8');
        const tags = parseFrontmatterTags(content);
        const description = extractDescription(content);
        return { name, filename: f, title, tags, description };
      });
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/docs/:filename', (req, res) => {
  try {
    const filePath = join(DOCS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Doc not found' });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const rendered = resolveDocRef(content, req.params.filename);
    res.json({ success: true, data: rendered });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Library endpoints ---
const LIBRARY_DIR = process.env.BETTY_LIBRARY_DIR
  || join(os.homedir(), '.betty', 'library');

function parseLibraryFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n').filter(l => l.includes(':'))) {
    const [key, ...rest] = line.split(':');
    fm[key.trim()] = rest.join(':').trim();
  }
  return fm;
}

function extractLibrarySummary(content) {
  // Extract the summary paragraph after the title, stopping at ## headings
  const lines = content.split('\n');
  let foundTitle = false;
  const paragraphs = [];
  for (const line of lines) {
    if (!foundTitle && line.startsWith('# ')) { foundTitle = true; continue; }
    if (foundTitle) {
      if (/^##/.test(line)) break;
      if (line.startsWith('**Date:**') || line.startsWith('**Status:**') || line.startsWith('**Summary:**')) continue;
      if (!line.trim() || line.startsWith('---')) continue;
      paragraphs.push(line.trim());
      if (paragraphs.length >= 1) break;
    }
  }
  return paragraphs.join(' ').substring(0, 250);
}

function extractLibraryTags(content) {
  // Parse tags from frontmatter or from a "Tags:" line at end of file
  const fmTags = parseLibraryFrontmatter(content).tags;
  if (fmTags) {
    return fmTags.split(',').map(t => t.trim()).filter(Boolean);
  }
  // Fallback: look for "Tags:" line
  const tagMatch = content.match(/Tags:\s*\n((?:- \S+\n?)+)/);
  if (tagMatch) {
    return tagMatch[1].split('\n').map(l => l.replace(/^- /, '').trim()).filter(Boolean);
  }
  // Fallback: look for "**Tags:** tag1, tag2, tag3" on a single line
  const singleLineMatch = content.match(/\*\*Tags:\*\*\s*([\S,\s]+?)(?:\n\n|\n##)/);
  if (singleLineMatch) {
    return singleLineMatch[1].split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

function slugToTitle(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

app.get('/api/library', (_req, res) => {
  try {
    if (!fs.existsSync(LIBRARY_DIR)) {
      return res.status(404).json({ success: false, error: 'Library directory not found' });
    }
    const topicsDir = join(LIBRARY_DIR, 'topics');
    if (!fs.existsSync(topicsDir)) {
      return res.json({ success: true, data: [] });
    }
    const topicDirs = fs.readdirSync(topicsDir)
      .filter(d => fs.statSync(join(topicsDir, d)).isDirectory())
      .sort();

    const topics = topicDirs.map(slug => {
      const indexPath = join(topicsDir, slug, 'index.md');
      if (!fs.existsSync(indexPath)) return null;
      const content = fs.readFileSync(indexPath, 'utf8');
      const title = slugToTitle(slug);
      const tags = extractLibraryTags(content);
      const summary = extractLibrarySummary(content);
      // Try to extract date from INDEX.md or from filename pattern
      let date = '';
      const dateMatch = content.match(/Date:\s*(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) date = dateMatch[1];
      return { slug, title, date, tags, summary };
    }).filter(Boolean);

    // Sort by date descending, then alphabetically
    topics.sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.title.localeCompare(b.title);
    });

    res.json({ success: true, data: topics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/library/tags', (_req, res) => {
  try {
    if (!fs.existsSync(LIBRARY_DIR)) {
      return res.status(404).json({ success: false, error: 'Library directory not found' });
    }
    const tagsDir = join(LIBRARY_DIR, 'tags');
    if (!fs.existsSync(tagsDir)) {
      return res.json({ success: true, data: [] });
    }
    const tagFiles = fs.readdirSync(tagsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''))
      .sort();
    res.json({ success: true, data: tagFiles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// NOTE: /export and /import routes must come BEFORE /:topicSlug
// so Express doesn't match "export" or "import" as topic slugs.

//--- Library Export Endpoint ---
app.get("/api/library/export", authorize("admin", "operator"), (req, res) => {
  try {
    if (!fs.existsSync(LIBRARY_DIR)) {
      return res.status(404).json({ success: false, error: "Library directory not found" });
    }

    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", "attachment; filename=\"betty-library-export.tar.gz\"");
    res.setHeader("Cache-Control", "no-cache");

    const stream = tarCreate({
      gzip: true,
      cwd: LIBRARY_DIR,
    }, ['.']);

    stream.on("error", (err) => {
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: err.message });
      }
    });

    stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

//--- Library Import Endpoint ---
let libraryImportInProgress = false;

const libraryUpload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith('.tar.gz') || ext.endsWith('.tgz')) {
      cb(null, true);
    } else {
      cb(new Error("Only .tar.gz or .tgz files are allowed"));
    }
  },
});

app.post("/api/library/import", authorize("admin", "operator"), libraryUpload.single("archive"), (req, res) => {
  try {
    if (!req.file) {
      if (!res.headersSent) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }
      return;
    }

    // Concurrent import protection
    if (libraryImportInProgress) {
      fs.unlinkSync(req.file.path);
      return res.status(409).json({ success: false, error: "Another import is already in progress" });
    }
    libraryImportInProgress = true;

    const tempPath = req.file.path;
    let totalFileCount = 0;

    // Helper to abort and clean up
    function abortImport(msg) {
      libraryImportInProgress = false;
      try { fs.unlinkSync(tempPath); } catch {}
      if (!res.headersSent) {
        res.status(400).json({ success: false, error: msg });
      }
    }

    // Detect client disconnect during listing
    res.on("close", () => {
      if (libraryImportInProgress) {
        libraryImportInProgress = false;
        try { fs.unlinkSync(tempPath); } catch {}
      }
    });

    // First pass: count total files for progress tracking (integer only, no path storage)
    try {
      const readStream = fs.createReadStream(tempPath);
      const listStream = tarT(readStream);
      readStream.pipe(listStream);
      listStream.on("entry", (entry) => {
        totalFileCount++;
        entry.resume(); // drain entry
      });
      listStream.on("end", () => {
        // Second pass: extract with progress
        extractWithProgress(tempPath, totalFileCount, res);
      });
      listStream.on("error", (err) => {
        abortImport("Invalid archive: " + err.message);
      });
    } catch (err) {
      abortImport("Invalid archive: " + err.message);
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

function extractWithProgress(tempPath, totalFileCount, res) {
  const total = totalFileCount || 1;
  let extracted = 0;
  let finished = false;

  // Ensure library dir exists
  if (!fs.existsSync(LIBRARY_DIR)) {
    fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  }

  // Set up SSE response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  function cleanup() {
    try { fs.unlinkSync(tempPath); } catch {}
  }

  function sendError(msg) {
    if (finished) return;
    finished = true;
    libraryImportInProgress = false;
    cleanup();
    res.write(`event: library-import\ndata: ERROR:${msg}\n\n`);
    safeFlush(res);
    res.end();
  }

  // Detect client disconnect during extraction
  res.on("close", () => {
    if (!finished) {
      finished = true;
      libraryImportInProgress = false;
      cleanup();
    }
  });

  const extractStream = tarX({
    gzip: true,
    cwd: LIBRARY_DIR,
    filter: (path, stat) => {
      // Reject symlinks to prevent symlink-based path traversal
      if (stat.type === "SymbolicLink") return false;
      // Path traversal protection: reject entries that would escape LIBRARY_DIR
      const resolved = resolve(LIBRARY_DIR, path);
      if (!resolved.startsWith(LIBRARY_DIR + "/") && resolved !== LIBRARY_DIR) {
        return false;
      }
      return true;
    },
    onentry: (entry) => {
      extracted++;
      const progress = Math.round((extracted / total) * 100);
      res.write(`event: library-import\ndata: PROGRESS:${progress}:${extracted}/${total}\n\n`);
      safeFlush(res);
      // Do NOT call entry.resume() here — tar handles entry consumption
      // internally. Calling resume() drains the entry data before the
      // extraction pipeline can pipe it to the output file, resulting
      // in 0-byte files.
    },
  });

  extractStream.on("close", () => {
    if (finished) return;
    finished = true;
    libraryImportInProgress = false;
    cleanup();
    res.write(`event: library-import\ndata: COMPLETE:${extracted} files extracted\n\n`);
    safeFlush(res);
    res.end();
  });

  extractStream.on("error", (err) => {
    sendError(err.message);
  });

  // Pipe the file into the extract stream
  const readStream = fs.createReadStream(tempPath);
  readStream.on("error", (err) => {
    sendError("Failed to read archive: " + err.message);
  });
  readStream.pipe(extractStream);
}

app.get('/api/library/:topicSlug', (req, res) => {
  try {
    const topicDir = join(LIBRARY_DIR, 'topics', req.params.topicSlug);
    if (!fs.existsSync(topicDir)) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    const indexPath = join(topicDir, 'index.md');
    if (!fs.existsSync(indexPath)) {
      return res.status(404).json({ success: false, error: 'Topic index not found' });
    }
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const result = {
      index: indexContent,
      tags: extractLibraryTags(indexContent),
    };

    // Optionally include report.md
    const reportPath = join(topicDir, 'report.md');
    if (fs.existsSync(reportPath)) {
      result.report = fs.readFileSync(reportPath, 'utf8');
    }

    // Optionally include state.md
    const statePath = join(topicDir, 'state.md');
    if (fs.existsSync(statePath)) {
      result.state = fs.readFileSync(statePath, 'utf8');
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/library/tag/:tagname', (req, res) => {
  try {
    const tagname = req.params.tagname;
    const tagsDir = join(LIBRARY_DIR, 'tags');
    const tagFile = join(tagsDir, `${tagname}.md`);
    if (!fs.existsSync(tagFile)) {
      return res.status(404).json({ success: false, error: 'Tag not found' });
    }
    const content = fs.readFileSync(tagFile, 'utf8');
    // Parse the tag file: each line like "- [Topic Name](topics/slug/)" or "- Topic Name (topics/slug/)"
    const topics = [];
    for (const line of content.split('\n').filter(l => l.trim().startsWith('- '))) {
      const match = line.trim().substring(2).match(/\[([^\]]+)\]\(topics\/([^/]+)\)/);
      if (match) {
        topics.push({ title: match[1], slug: match[2] });
      } else {
        // Fallback: simple format "- Topic Name (topics/slug/)"
        const fallback = line.trim().substring(2).match(/(.+?)\(topics\/([^/]+)\)/);
        if (fallback) {
          topics.push({ title: fallback[1].trim(), slug: fallback[2] });
        }
      }
    }
    res.json({ success: true, data: topics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA fallback: serve index.html for non-API routes
app.get('*', (_req, res) => {
  res.sendFile(join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, API_HOST, () => {
  console.log(`Benchmark API server running at http://${API_HOST === '0.0.0.0' ? 'localhost' : API_HOST}:${PORT}`);
  console.log(`Frontend served from: ${FRONTEND_DIR}`);
  console.log(`Config file: ${CONFIGS_FILE}`);
  console.log(`Reports directory: ${REPORTS_DIR}`);
  if (API_HOST === '0.0.0.0') {
    console.log(`Accessible from remote machines on port ${PORT}`);
  }
});
