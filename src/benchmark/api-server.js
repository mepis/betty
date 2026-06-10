import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import { spawn } from "child_process";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.API_PORT, 10) || 3456;
const API_HOST = process.env.API_HOST || '0.0.0.0';
const BENCHMARK_DIR = __dirname;
const FRONTEND_DIR = join(BENCHMARK_DIR, "frontend", "dist");
const CONFIGS_FILE = join(BENCHMARK_DIR, "configs.json");
const RESULTS_FILE = join(BENCHMARK_DIR, "results.md");
const REPORTS_DIR = join(BENCHMARK_DIR, "reports");

// Allowed CORS origins (comma-separated or * for all)
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Default config template
const DEFAULT_CONFIGS = {
  max_sys_mem: 93,
  llama_port: 11434,
  llama_host: "localhost",
  model: "",
  model_directory: "",
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

// Create default configs.json if it doesn't exist
if (!fs.existsSync(CONFIGS_FILE)) {
  fs.writeFileSync(CONFIGS_FILE, JSON.stringify(DEFAULT_CONFIGS, null, 2));
  console.log(`Created default config file: ${CONFIGS_FILE}`);
}

// In-memory state
let benchmarkProcess = null;
let benchmarkStatus = "idle"; // idle | building | testing | error | stopped
let currentTestRun = 0;
let liveResults = [];
let streamingClients = new Set();

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
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

//--- Status endpoint ---
app.get("/api/status", (_req, res) => {
  res.json({
    success: true,
    status: benchmarkStatus,
    testRun: currentTestRun,
    liveResults: liveResults,
    processAlive: benchmarkProcess ? !benchmarkProcess.killed : false,
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
    client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
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
      parseLogOutput(text);
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
      parseLogOutput(text);
    });

    benchmarkProcess.on("close", (code) => {
      benchmarkProcess = null;
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

//--- Parse log output for live results ---
function parseLogOutput(text) {
  // Parse "========== Test Run #N =========="
  const runMatch = text.match(/Test Run #(\d+)/);
  if (runMatch) {
    currentTestRun = parseInt(runMatch[1], 10);
    broadcast("status", {
      status: "testing",
      testRun: currentTestRun,
      liveResults: liveResults,
    });
  }

  // Parse "Avg gen tokens/sec:    XXX"
  const genMatch = text.match(/Avg gen tokens\/sec:\s+([\d.]+)/);
  const promptMatch = text.match(/Avg prompt tokens\/sec:\s+([\d.]+)/);
  const totalGenMatch = text.match(/Total tokens:\s+([\d.]+)\s*\(gen\)/);
  const totalPromptMatch = text.match(/Total tokens:\s+[\d.]+\s*\(gen\) \/ ([\d.]+)/);
  const totalTimeMatch = text.match(/Total time \(all msgs\):\s+([\d.]+)\s*ms/);
  const memMatch = text.match(/Avg Mem Used \(GB\):\s+([\d.]+) \/ ([\d.]+)/);

  if (genMatch && promptMatch) {
    const runId = currentTestRun;
    const existingIdx = liveResults.findIndex((r) => r.testRunId === runId);

    const result = {
      testRunId: runId,
      avgGenTokensPerSec: parseFloat(genMatch[1]),
      avgPromptTokensPerSec: parseFloat(promptMatch[1]),
      totalGenTokens: totalGenMatch ? parseFloat(totalGenMatch[1]) : null,
      totalPromptTokens: totalPromptMatch ? parseFloat(totalPromptMatch[1]) : null,
      totalTimeMs: totalTimeMatch ? parseFloat(totalTimeMatch[1]) : null,
      avgMemUsed: memMatch ? parseFloat(memMatch[1]) : null,
      avgMemTotal: memMatch ? parseFloat(memMatch[2]) : null,
    };

    if (existingIdx >= 0) {
      liveResults[existingIdx] = result;
    } else {
      liveResults.push(result);
    }

    broadcast("results", { liveResults });
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

//--- Save current results as report ---
app.post("/api/save-report", (req, res) => {
  try {
    const { name } = req.body;
    const safeName = name || `benchmark-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;

    // Read the current results.md
    const mdContent = fs.existsSync(RESULTS_FILE) ? fs.readFileSync(RESULTS_FILE, "utf8") : "";

    const report = {
      name: safeName,
      savedAt: new Date().toISOString(),
      mdContent,
      liveResults: liveResults,
      configs: JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8")),
    };

    const filePath = join(REPORTS_DIR, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    res.json({ success: true, message: `Report saved as ${safeName}` });
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

//--- List models in a directory ---
app.get("/api/models", (_req, res) => {
  try {
    const dir = _req.query.directory;
    if (!dir) {
      return res.status(400).json({ success: false, error: "directory query param required" });
    }
    if (!fs.existsSync(dir)) {
      return res.json({ success: true, data: [] });
    }
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.gguf') || f.endsWith('.bin') || f.endsWith('.safetensors'))
      .sort();
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
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
