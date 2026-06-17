import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import { spawn, execSync } from "child_process";
import { Transform, Readable } from "stream";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
const FRONTEND_DIR = join(BENCHMARK_DIR, "frontend", "dist");
const CONFIGS_FILE = join(BENCHMARK_DIR, "configs.json");
const RESULTS_FILE = join(BENCHMARK_DIR, "results.md");
const REPORTS_DIR = join(BENCHMARK_DIR, "reports");
const PROFILES_DIR = join(BENCHMARK_DIR, "profiles");

// Allowed CORS origins (comma-separated or * for all)
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Ensure reports and profiles directories exist
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

// Default config template
const DEFAULT_CONFIGS = {
  export_configs: {
    GGML_CUDA_ENABLE_UNIFIED_MEMORY: "1",
    CUDA_SCALE_LAUNCH_QUEUES: "4x",
    LLAMA_CACHE: "",
    GGML_CUDA_P2P: "on",
    LLAMA_ARG_FIT: "on",
    LLAMA_ARG_FIT_TARGET: "256",
    LLAMA_ARG_FIT_CTX: "131072",
  },
  max_sys_mem: 93,
  llama_port: 11434,
  llama_host: "localhost",
  model: "",
  model_directory: "hf_downloads",
  llama_cache: "",
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
function syncConfigDefaults() {
  try {
    const current = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
    if (deepMerge(current, DEFAULT_CONFIGS)) {
      fs.writeFileSync(CONFIGS_FILE, JSON.stringify(current, null, 2));
      console.log(`[config] Updated configs.json with missing default keys`);
    }
  } catch (err) {
    console.error(`[config] Failed to sync defaults: ${err.message}`);
  }
}

// Create default configs.json if it doesn't exist
if (!fs.existsSync(CONFIGS_FILE)) {
  fs.writeFileSync(CONFIGS_FILE, JSON.stringify(DEFAULT_CONFIGS, null, 2));
  console.log(`Created default config file: ${CONFIGS_FILE}`);
} else {
  syncConfigDefaults();
}

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

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Transfer-Encoding', 'Cache-Control', 'Connection', 'Retry-After'],
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.static(FRONTEND_DIR));

//--- Config endpoints ---
app.get("/api/configs", (_req, res) => {
  try {
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/configs", (_req, res) => {
  try {
    const configs = _req.body;
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(configs, null, 2));
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
app.get("/api/profiles", (_req, res) => {
  try {
    const files = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith(".json"));
    const profiles = files.map((file) => {
      const stats = fs.statSync(join(PROFILES_DIR, file));
      const name = file.replace(/\.json$/, "");
      return {
        name,
        filename: file,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    }).sort((a, b) => b.modified - a.modified);
    res.json({ success: true, data: profiles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/profile/:name", (req, res) => {
  try {
    const filePath = join(PROFILES_DIR, `${req.params.name}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/profile", (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ success: false, error: "name and data required" });
    }

    // Sanitize name
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = join(PROFILES_DIR, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, message: "Profile saved" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/profile/:name", (req, res) => {
  try {
    const filePath = join(PROFILES_DIR, `${req.params.name}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true, message: "Profile deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/profile/:name/load", (req, res) => {
  try {
    const filePath = join(PROFILES_DIR, `${req.params.name}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }
    const profile = JSON.parse(fs.readFileSync(filePath, "utf8"));
    // Write the profile's config to configs.json
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(profile, null, 2));
    res.json({ success: true, message: `Profile "${req.params.name}" loaded`, data: profile });
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
  } catch {}
}

function broadcast(event, data) {
  for (const client of streamingClients) {
    sendToClient(client, event, data);
  }
}

//--- Run benchmark endpoint ---
app.post("/api/run", (req, res) => {
  if (benchmarkStatus !== "idle") {
    return res.status(409).json({
      success: false,
      error: `Benchmark is already ${benchmarkStatus}`,
    });
  }

  try {
    // Read current configs
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
    const skipBuild = req.body.skipBuild ?? configs.skip_build;

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
          finished: true,
        });
      } else {
        benchmarkStatus = "error";
        broadcast("status", {
          status: "error",
          error: `Process exited with code ${code}`,
          testRun: currentTestRun,
          liveResults: liveResults,
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
  saveReport();

  inSummaryBlock = false;
  summaryBuffer = {};
}

//--- Parse log output for live results (called with complete lines) ---
function parseLogOutput(text) {
  // Check for structured benchmark JSON first
  if (parseBenchmarkJSON(text)) return;

  // Parse "========== Test Run #N =========="
  const runMatch = text.match(/Test Run #(\d+)/);
  if (runMatch) {
    currentTestRun = parseInt(runMatch[1], 10);
    benchmarkStatus = "testing";
    broadcast("status", {
      status: "testing",
      testRun: currentTestRun,
      liveResults: liveResults,
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
app.post("/api/stop", (_req, res) => {
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
app.get("/api/reports", (_req, res) => {
  try {
    const files = fs.readdirSync(REPORTS_DIR).filter((f) => f.endsWith(".json"));
    const reports = files.map((file) => {
      const stats = fs.statSync(join(REPORTS_DIR, file));
      const name = file.replace(/\.json$/, "");
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

app.get("/api/report/:name", (req, res) => {
  try {
    const filePath = join(REPORTS_DIR, `${req.params.name}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/report", (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ success: false, error: "name and data required" });
    }

    // Sanitize name
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = join(REPORTS_DIR, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, message: "Report saved" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/report/:name", (req, res) => {
  try {
    const filePath = join(REPORTS_DIR, `${req.params.name}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true, message: "Report deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Auto-save report after each test run completes ---
function saveReport() {
  if (!currentReportName) {
    // Generate report name on first save
    try {
      const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
      const modelBasename = configs.model ? configs.model.replace(/\.[^.]+$/, "") : "unknown";
      const today = new Date().toISOString().slice(0, 10);
      currentReportName = `${today}-${modelBasename}`;
    } catch {
      currentReportName = `benchmark-${Date.now()}`;
    }
  }

  try {
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
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

    const filePath = join(REPORTS_DIR, `${currentReportName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    console.log(`Report saved: ${filePath}`);
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

  const cmakeCmd = `cmake -B build -DCMAKE_BUILD_TYPE=Release ${flags.join(" ")}`;
  const makeCmd = `cmake --build build --config Release -j ${buildCores} --clean-first`;

  // Build env exports
  const ec = configs.export_configs || {};
  const cudaVer = configs.cuda_configs?.cuda_version || "12.6";
  const envLines = [
    `export GGML_CUDA_ENABLE_UNIFIED_MEMORY=${ec.GGML_CUDA_ENABLE_UNIFIED_MEMORY || "1"}`,
    `export CUDA_SCALE_LAUNCH_QUEUES=${ec.CUDA_SCALE_LAUNCH_QUEUES || "4x"}`,
    `export LLAMA_CACHE=${ec.LLAMA_CACHE || configs.llama_cache || ""}`,
    `export CUDACXX=${configs.cuda_configs?.cudacxx || "/usr/local/cuda/bin/nvcc"}`,
    `export GGML_CUDA_P2P=${ec.GGML_CUDA_P2P || "on"}`,
    `export PATH=/usr/local/cuda-${cudaVer}/bin:$PATH`,
    `export LLAMA_ARG_FIT=${ec.LLAMA_ARG_FIT || "on"}`,
    `export LLAMA_ARG_FIT_TARGET=${ec.LLAMA_ARG_FIT_TARGET || "256"}`,
    `export LLAMA_ARG_FIT_CTX=${ec.LLAMA_ARG_FIT_CTX || "131072"}`,
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

  const tensorSplitValue = gs.enabled && gs.gpus && gs.gpus.length > 1
    ? Array(gs.gpus.length).fill(Math.round(100 / gs.gpus.length)).join(",")
    : "0";
  const primaryGpu = gs.enabled ? gs.gpus[0] : 0;

  const modelPath = server.model || `${configs.model_directory}/${configs.model}`;
  const port = server.port || configs.llama_port || 11434;
  const host = server.host || configs.llama_host || "localhost";

  const parts = [
    `./llama-server`,
    `-m ${modelPath}`,
    `--port ${port} --host ${host}`,
    `-c ${contextLength} -ngl ${gpuLayerOffload}`,
    `--temp ${mc.temp} --top-p ${mc.top_p} --min-p ${mc.min_p} --top-k ${mc.top_k}`,
    `--batch-size ${batchSize} --ubatch-size ${uBatchSize}`,
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
  if (sp.parallel?.enabled) parts.push(`--parallel ${sp.parallel.value}`);
  if (sps.layer_split?.enabled) parts.push(`--split-mode ${sps.layer_split.value}`);
  if (sps.tensor_split?.enabled) parts.push(`--tensor-split ${tensorSplitValue}`);
  if (sps.primary_gpu?.enabled) parts.push(`--main-gpu ${primaryGpu}`);
  if (sp2.spec_type?.enabled) parts.push(`--spec-type ${sp2.spec_type.value}`);
  if (sp2.spec_draft_n_max?.enabled) parts.push(`--spec-draft-n-max ${sp2.spec_draft_n_max.value}`);

  // Build env exports
  const ec = configs.export_configs || {};
  const cudaVer = configs.cuda_configs?.cuda_version || "12.6";
  const envLines = [
    `export GGML_CUDA_ENABLE_UNIFIED_MEMORY=${env.GGML_CUDA_ENABLE_UNIFIED_MEMORY || ec.GGML_CUDA_ENABLE_UNIFIED_MEMORY || "1"}`,
    `export CUDA_SCALE_LAUNCH_QUEUES=${env.CUDA_SCALE_LAUNCH_QUEUES || ec.CUDA_SCALE_LAUNCH_QUEUES || "4x"}`,
    `export LLAMA_CACHE=${env.LLAMA_CACHE || ec.LLAMA_CACHE || configs.llama_cache || ""}`,
    `export CUDACXX=${env.CUDACXX || configs.cuda_configs?.cudacxx || "/usr/local/cuda/bin/nvcc"}`,
    `export GGML_CUDA_P2P=${env.GGML_CUDA_P2P || ec.GGML_CUDA_P2P || "on"}`,
    `export PATH=/usr/local/cuda-${cudaVer}/bin:$PATH`,
    `export LLAMA_ARG_FIT=${env.LLAMA_ARG_FIT || ec.LLAMA_ARG_FIT || "on"}`,
    `export LLAMA_ARG_FIT_TARGET=${env.LLAMA_ARG_FIT_TARGET || ec.LLAMA_ARG_FIT_TARGET || "256"}`,
    `export LLAMA_ARG_FIT_CTX=${env.LLAMA_ARG_FIT_CTX || ec.LLAMA_ARG_FIT_CTX || "131072"}`,
  ];

  return {
    env: envLines,
    command: parts.join(" \\"),
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
    const cacheRam = Math.min(
      tp.cache_ram + (tp.cache_ram_step || 1024) * (r.testRunId - 1),
      tp.cache_ram_max || 4096,
    );

    const tensorSplitValue = gs.enabled && gs.gpus && gs.gpus.length > 1
      ? Array(gs.gpus.length).fill(Math.round(100 / gs.gpus.length)).join(",")
      : "0";

    return {
      testRunId: r.testRunId,
      testParameters: {
        contextLength,
        batchSize,
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
        model: `${configs.model_directory || ""}/${configs.model || ""}`,
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
        tensorSplit: sps.tensor_split?.enabled ? tensorSplitValue : null,
        primaryGpu: sps.primary_gpu?.enabled ? (gs.enabled ? gs.gpus[0] : sps.primary_gpu.value) : null,
        gpuSelection: gs.enabled ? gs.gpus : [0],
      },
      environment: {
        GGML_CUDA_ENABLE_UNIFIED_MEMORY: configs.export_configs?.GGML_CUDA_ENABLE_UNIFIED_MEMORY || "1",
        CUDA_SCALE_LAUNCH_QUEUES: configs.export_configs?.CUDA_SCALE_LAUNCH_QUEUES || "4x",
        LLAMA_CACHE: configs.export_configs?.LLAMA_CACHE || configs.llama_cache || "",
        GGML_CUDA_P2P: configs.export_configs?.GGML_CUDA_P2P || "on",
        LLAMA_ARG_FIT: configs.export_configs?.LLAMA_ARG_FIT || "on",
        LLAMA_ARG_FIT_TARGET: configs.export_configs?.LLAMA_ARG_FIT_TARGET || "256",
        LLAMA_ARG_FIT_CTX: configs.export_configs?.LLAMA_ARG_FIT_CTX || "131072",
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
app.post("/api/save-report", (req, res) => {
  try {
    const { name } = req.body;

    // Read configs first to get the model name
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
    const modelBasename = configs.model ? configs.model.replace(/\.[^.]+$/, "") : "unknown";
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

    const filePath = join(REPORTS_DIR, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    res.json({ success: true, message: `Report saved as ${safeName}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Get detailed configs for a specific test run in a report ---
app.get("/api/report/:name/configs/:testRunId", (req, res) => {
  try {
    const filePath = join(REPORTS_DIR, `${req.params.name}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    const report = JSON.parse(fs.readFileSync(filePath, "utf8"));
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
app.get("/api/report/:name/commands/:testRunId", (req, res) => {
  try {
    const filePath = join(REPORTS_DIR, `${req.params.name}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    const report = JSON.parse(fs.readFileSync(filePath, "utf8"));
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
      // Return path relative to the base directory
      results.push(fullPath.replace(baseDir + '/', ''));
    }
  }
  return results.sort();
}

//--- List models in a directory ---
app.get("/api/models", (_req, res) => {
  try {
    const dir = _req.query.directory;
    if (!dir) {
      return res.status(400).json({ success: false, error: "directory query param required" });
    }
    const files = findModelFiles(dir);
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Systemd service control ---
app.post("/api/service/start", (_req, res) => {
  try {
    execSync("systemctl --user start llama.service");
    res.json({ success: true, message: "llama.service started" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/service/stop", (_req, res) => {
  try {
    execSync("systemctl --user stop llama.service");
    res.json({ success: true, message: "llama.service stopped" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/service/status", (_req, res) => {
  try {
    const output = execSync("systemctl --user is-active llama.service").toString().trim();
    res.json({ success: true, active: output === "active" });
  } catch {
    res.json({ success: true, active: false });
  }
});

//--- Install a systemd service from a report's launch command ---
app.post("/api/service/install", (req, res) => {
  try {
    const { reportName, testRunId } = req.body;
    if (!reportName || !testRunId) {
      return res.status(400).json({ success: false, error: "reportName and testRunId are required" });
    }

    // Get the report
    const filePath = join(REPORTS_DIR, `${reportName}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    const report = JSON.parse(fs.readFileSync(filePath, "utf8"));
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

    // Build service file content
    const serviceName = `llama-benchmark-${reportName.replace(/[^a-zA-Z0-9_-]/g, "-")}-${testRunId}.service`;
    const serviceFile = join("/home", serviceUser, ".config", "systemd", "user", serviceName);

    const serviceContent = `[Unit]
Description=Llama.cpp Benchmark Service - ${reportName} (Run #${testRunId})
After=network.target

[Service]
Type=simple
User=${serviceUser}
EnvironmentFile=${envFile}
ExecStart=${llamaServerPath} ${launchCmd.command}
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=llama-benchmark

[Install]
WantedBy=default.target
`;

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
    }

    // Write service file
    try {
      execSync(`cat > ${serviceFile} << 'SVCEOF'
${serviceContent}SVCEOF`);
    } catch (err) {
      console.error(`Failed to write service file: ${err.message}`);
    }

    // Reload systemd daemon and enable + start the service
    try {
      execSync(`systemctl --user daemon-reload`);
      execSync(`systemctl --user enable ${serviceName}`);
      execSync(`systemctl --user start ${serviceName}`);
    } catch (err) {
      console.error(`Failed to start service: ${err.message}`);
      return res.json({
        success: true,
        message: `Service file installed as ${serviceName}`,
        warning: err.message,
        serviceName,
        envFile,
        serviceFile,
      });
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
app.post("/api/kill-port", (req, res) => {
  try {
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
    const port = configs.llama_port || 11434;

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
app.get("/api/system-status", (_req, res) => {
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

    res.json({
      success: true,
      data: {
        totalGB: Math.round(totalGB * 100) / 100,
        usedGB: Math.round(usedGB * 100) / 100,
        availableGB: Math.round(availableGB * 100) / 100,
        totalMB: Math.round(totalKB / 1024),
        usedMB: Math.round((usedGB * 1024)),
        percentUsed: totalKB > 0 ? Math.round((usedGB / totalGB) * 100) : 0,
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
const HF_DOWNLOAD_DIR = join(BENCHMARK_DIR, "hf_downloads");
if (!fs.existsSync(HF_DOWNLOAD_DIR)) {
  fs.mkdirSync(HF_DOWNLOAD_DIR, { recursive: true });
}

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
app.post("/api/hf/download", async (req, res) => {
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

    const downloadDir = targetDir || HF_DOWNLOAD_DIR;
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

    // Stream the download
    const downloadResponse = await fetch(downloadUrl, {
      headers: { "User-Agent": "betty-benchmark/1.0" },
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

    // Track download in memory
    hfDownloads.set(modelId, {
      status: "downloading",
      progress: 0,
      total: totalSize,
      downloaded: 0,
      filename: filename,
      filePath: filePath,
    });

    // Use a Transform stream to track progress while piping to file.
    // This avoids the Node.js anti-pattern of attaching both a 'data' listener
    // and pipe() to the same stream, which causes a race condition where data
    // may be lost or the file stream may not receive the data properly.
    let downloaded = 0;
    const progressTransform = new Transform({
      transform(chunk, encoding, callback) {
        downloaded += chunk.length;
        const progress = totalSize > 0 ? Math.round((downloaded / totalSize) * 100) : Math.min(99, Math.round((downloaded / (1024 * 1024 * 100)) * 100));

        hfDownloads.set(modelId, {
          status: "downloading",
          progress,
          total: totalSize,
          downloaded,
          filename,
          filePath,
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

    const fileStream = fs.createWriteStream(filePath);

    await new Promise((resolve, reject) => {
      const bodyStream = Readable.fromWeb(downloadResponse.body);
      bodyStream.on("error", (err) => {
        reject(err);
      });
      bodyStream.pipe(progressTransform).pipe(fileStream);
      fileStream.on("finish", () => {
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
      res.write(`event: hf-download\ndata: STATUS:Download failed\n\n`);
      res.write(`event: hf-download\ndata: ERROR: ${err.message}\n\n`);
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

// List downloaded HF models
app.get("/api/hf/downloads", (req, res) => {
  try {
    const entries = [];
    if (fs.existsSync(HF_DOWNLOAD_DIR)) {
      const dirs = fs.readdirSync(HF_DOWNLOAD_DIR).filter(d => {
        const dirPath = join(HF_DOWNLOAD_DIR, d);
        return fs.statSync(dirPath).isDirectory();
      });
      for (const dir of dirs) {
        const files = fs.readdirSync(join(HF_DOWNLOAD_DIR, dir))
          .filter(f => f.endsWith(".gguf"))
          .map(f => {
            const stat = fs.statSync(join(HF_DOWNLOAD_DIR, dir, f));
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
app.delete("/api/hf/download/:modelId", (req, res) => {
  try {
    const modelId = req.params.modelId;
    const modelDir = join(HF_DOWNLOAD_DIR, modelId);
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

//--- Build llama.cpp endpoint ---
app.post("/api/build", async (req, res) => {
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
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
    const buildCores = configs.build_cores || 1;

    const buildProcess = spawn("node", ["index.js", "--build-only"], {
      cwd: BENCHMARK_DIR,
      env: {
        ...process.env,
        GGML_CUDA_ENABLE_UNIFIED_MEMORY: configs.export_configs?.GGML_CUDA_ENABLE_UNIFIED_MEMORY || "1",
        CUDA_SCALE_LAUNCH_QUEUES: configs.export_configs?.CUDA_SCALE_LAUNCH_QUEUES || "4x",
        LLAMA_CACHE: configs.export_configs?.LLAMA_CACHE || configs.llama_cache || "",
        GGML_CUDA_P2P: configs.export_configs?.GGML_CUDA_P2P || "on",
        LLAMA_ARG_FIT: configs.export_configs?.LLAMA_ARG_FIT || "on",
        LLAMA_ARG_FIT_TARGET: configs.export_configs?.LLAMA_ARG_FIT_TARGET || "256",
        LLAMA_ARG_FIT_CTX: configs.export_configs?.LLAMA_ARG_FIT_CTX || "131072",
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

    const buildResult = await new Promise((resolve, reject) => {
      buildProcess.on("close", (code) => {
        clearInterval(progressInterval);
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject(new Error(`Build failed with exit code ${code}`));
        }
      });

      buildProcess.on("error", (err) => {
        clearInterval(progressInterval);
        reject(err);
      });
    });

    // Send final progress and completion
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
app.post("/api/clone", async (req, res) => {
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
