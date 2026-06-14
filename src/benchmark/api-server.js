/**
 * api-server.js — Express API server for the llama.cpp benchmark.
 *
 * Replaced subprocess-based benchmark execution with direct calls to
 * BenchmarkEngine. Tests now use HTTP calls through the engine module
 * instead of calling the CLI directly.
 *
 * Key changes:
 *   - POST /api/run → engine.run() directly (no child process)
 *   - POST /api/build → engine.runBuild() directly
 *   - POST /api/stop → engine.stop() (sets isRunning flag)
 *   - GET /api/status → reports engine state
 *   - SSE events carry structured data (no regex parsing)
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  BenchmarkEngine,
  loadConfigs,
  saveConfigs,
  getSystemMemory,
  findLlamaServerProcesses,
  initGpuSelection,
  initTestState,
  getServerCommand,
  getServerParamsSnapshot,
  BENCHMARK_MESSAGES,
  DEFAULT_CONFIGS,
  extractConfigsPerRun,
  runBuild,
  buildEnv,
  isCloned,
  runPull,
  runClone,
} from "./benchmark-engine.js";

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
const PROFILES_DIR = join(BENCHMARK_DIR, "profiles");

// Allowed CORS origins
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Ensure directories exist
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

// Create default configs.json if it doesn't exist
if (!fs.existsSync(CONFIGS_FILE)) {
  fs.writeFileSync(CONFIGS_FILE, JSON.stringify(DEFAULT_CONFIGS, null, 2));
}

// ─── In-memory state ────────────────────────────────────────────────
let engine = null;
let benchmarkStatus = "idle"; // idle | building | testing | error | stopped
let currentTestRun = 0;
let liveResults = [];
let streamingClients = new Set();
let benchmarkMessages = [];
let buildStatus = "idle"; // idle | building | success | error

// CORS
app.use(cors({
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.static(FRONTEND_DIR));

// ─── Helpers ─────────────────────────────────────────────────────────

function broadcast(event, data) {
  for (const client of streamingClients) {
    try {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {}
  }
}

function sendToClient(client, event, data) {
  if (!streamingClients.has(client)) return;
  try {
    client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {}
}

function updateStatus(status, extra = {}) {
  benchmarkStatus = status;
  currentTestRun = engine?.currentTestRun || currentTestRun;
  liveResults = engine?.liveResults || liveResults;
  benchmarkMessages = engine?.benchmarkMessages || benchmarkMessages;

  broadcast("status", {
    status,
    testRun: currentTestRun,
    liveResults,
    benchmarkMessages,
    processAlive: !!engine,
    ...extra,
  });
}

function updateResults() {
  liveResults = engine?.liveResults || liveResults;
  broadcast("results", { liveResults });
}

function updateMessages() {
  benchmarkMessages = engine?.benchmarkMessages || benchmarkMessages;
  broadcast("test-run-complete", {
    testRunId: currentTestRun,
    messages: benchmarkMessages.map((bm) => ({
      testRunId: bm.testRunId,
      messages: bm.messages,
    })),
  });
}

// ─── Config endpoints ────────────────────────────────────────────────

app.get("/api/configs", (_req, res) => {
  try {
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put("/api/configs", (req, res) => {
  try {
    const configs = req.body;
    saveConfigs(configs, CONFIGS_FILE);
    res.json({ success: true, message: "Config saved" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Benchmark messages endpoint ─────────────────────────────────────

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

// ─── Profile endpoints ───────────────────────────────────────────────

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
    saveConfigs(profile, CONFIGS_FILE);
    res.json({ success: true, message: `Profile "${req.params.name}" loaded`, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Status endpoint ─────────────────────────────────────────────────

app.get("/api/status", (_req, res) => {
  res.json({
    success: true,
    status: benchmarkStatus,
    testRun: currentTestRun,
    liveResults,
    processAlive: engine !== null,
    buildStatus,
  });
});

// ─── SSE stream endpoint ─────────────────────────────────────────────

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
    liveResults,
    benchmarkMessages,
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    sendToClient(client, "heartbeat", { ts: Date.now() });
  }, 15000);

  req.on("close", () => {
    streamingClients.delete(client);
    clearInterval(heartbeat);
  });
});

// ─── Run benchmark endpoint (direct engine call — no subprocess) ─────

app.post("/api/run", (req, res) => {
  if (benchmarkStatus !== "idle") {
    return res.status(409).json({
      success: false,
      error: `Benchmark is already ${benchmarkStatus}`,
    });
  }

  try {
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));

    // Reset state
    benchmarkStatus = "building";
    currentTestRun = 0;
    liveResults = [];
    benchmarkMessages = [];

    // Wipe results file
    if (fs.existsSync(RESULTS_FILE)) {
      fs.writeFileSync(RESULTS_FILE, "");
    }

    // Create and run the engine directly (no child process)
    engine = new BenchmarkEngine(configs, {
      rootDir: BENCHMARK_DIR,
      configsPath: CONFIGS_FILE,
      resultsFile: RESULTS_FILE,
      reportsDir: REPORTS_DIR,
      onStatus: (data) => {
        updateStatus(data.status, data);
      },
      onResult: (result) => {
        updateResults();
      },
      onLog: (log) => {
        if (log.text.includes("BENCHMARK_JSON:")) {
          // Parse structured benchmark JSON from engine
          try {
            const jsonStr = log.text.slice('BENCHMARK_JSON:'.length);
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
                broadcast('message-complete', data);
                break;
              case 'test-run-complete':
                updateMessages();
                break;
            }
          } catch {
            // Not valid JSON, ignore
          }
        } else if (log.text.trim()) {
          broadcast("log", { type: log.type, text: log.text });
        }
      },
      onComplete: (results) => {
        console.log(`Benchmark complete: ${results.length} test runs`);
      },
    });

    // Run the benchmark in the background
    engine.run().then((result) => {
      if (!result.success) {
        updateStatus("error", { error: result.reason || result.error });
      } else {
        updateStatus("idle");
      }
    }).catch((err) => {
      console.error("Engine error:", err);
      updateStatus("error", { error: err.message });
    });

    updateStatus("building");
    res.json({ success: true, message: "Benchmark started" });
  } catch (err) {
    benchmarkStatus = "idle";
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Stop benchmark endpoint (sets isRunning flag) ───────────────────

app.post("/api/stop", (_req, res) => {
  if (!engine) {
    return res.json({ success: true, message: "No benchmark running" });
  }

  try {
    engine.stop();
    benchmarkStatus = "stopped";
    updateStatus("stopped");
    res.json({ success: true, message: "Benchmark stopping..." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Reports endpoints ───────────────────────────────────────────────

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

// ─── Save report endpoint ────────────────────────────────────────────

app.post("/api/save-report", (req, res) => {
  try {
    const { name } = req.body;
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
    const modelBasename = configs.model ? configs.model.replace(/\.[^.]+$/, "") : "unknown";
    const today = new Date().toISOString().slice(0, 10);
    const defaultName = `${today}-${modelBasename}`;
    const safeName = name || defaultName;

    const mdContent = fs.existsSync(RESULTS_FILE) ? fs.readFileSync(RESULTS_FILE, "utf8") : "";

    const configsPerRun = extractConfigsPerRun(liveResults, configs);

    const report = {
      name: safeName,
      savedAt: new Date().toISOString(),
      mdContent,
      liveResults,
      configsPerRun,
      configs,
    };

    const filePath = join(REPORTS_DIR, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    res.json({ success: true, message: `Report saved as ${safeName}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Get detailed configs for a specific test run ────────────────────

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

// ─── Get current results.md ──────────────────────────────────────────

app.get("/api/results", (_req, res) => {
  try {
    const content = fs.existsSync(RESULTS_FILE) ? fs.readFileSync(RESULTS_FILE, "utf8") : "";
    res.json({ success: true, data: content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── List models in a directory ──────────────────────────────────────

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

// ─── Kill processes on llama_port ────────────────────────────────────

app.post("/api/kill-port", (req, res) => {
  try {
    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
    const port = configs.llama_port || 11434;

    execSync(`lsof -ti :${port}`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean)
      .forEach((pid) => {
        try { execSync(`kill -9 ${pid}`); } catch {}
      });

    res.json({ success: true, message: `Killed processes on port ${port}` });
  } catch (err) {
    // No processes found or kill failed
    res.json({ success: true, message: `No processes found or killed on port ${err.message || "unknown"}` });
  }
});

// ─── System status endpoint ──────────────────────────────────────────

app.get("/api/system-status", (_req, res) => {
  try {
    const mem = getSystemMemory();
    res.json({
      success: true,
      data: {
        totalGB: mem.total,
        usedGB: mem.used,
        availableGB: mem.total - mem.used,
        totalMB: mem.total * 1024,
        usedMB: mem.used * 1024,
        percentUsed: parseFloat(mem.stat),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Health check ────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── Build endpoint (direct engine call) ─────────────────────────────

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

    const configs = JSON.parse(fs.readFileSync(CONFIGS_FILE, "utf8"));
    const buildCores = configs.build_cores || 1;

    const llamaDir = join(BENCHMARK_DIR, "llama.cpp");

    // Clone/pull
    if (isCloned(llamaDir)) {
      try {
        runPull(llamaDir);
        writeBuildLog(res, "llama.cpp updated successfully.");
      } catch (err) {
        writeBuildLog(res, `Pull failed: ${err.message}`);
      }
    } else {
      try {
        runClone(llamaDir);
        writeBuildLog(res, "llama.cpp cloned successfully.");
      } catch (err) {
        writeBuildLog(res, `Clone failed: ${err.message}`);
        writeBuildLog(res, "STATUS:Clone failed");
        writeBuildLog(res, `ERROR: ${err.message}`);
        res.end();
        buildStatus = "error";
        return;
      }
    }

    // Build
    if (!configs.skip_build) {
      writeBuildLog(res, `Building with ${buildCores} cores...`);

      const buildResult = runBuild(llamaDir, buildCores, configs);

      if (buildResult.success) {
        writeBuildLog(res, "Build successful!");
        writeBuildLog(res, "PROGRESS:100");
        writeBuildLog(res, "STATUS:Build complete!");
        res.end();
        buildStatus = "success";
      } else {
        writeBuildLog(res, `Build failed: ${buildResult.detail}`);
        writeBuildLog(res, "STATUS:Build failed");
        writeBuildLog(res, `ERROR: ${buildResult.detail}`);
        res.end();
        buildStatus = "error";
      }
    } else {
      writeBuildLog(res, "Build skipped (--no-build).");
      writeBuildLog(res, "STATUS:Build skipped");
      res.end();
      buildStatus = "success";
    }

    // Reset after delay
    setTimeout(() => { buildStatus = "idle"; }, 10000);
  } catch (err) {
    writeBuildLog(res, `STATUS:Build failed`);
    writeBuildLog(res, `ERROR: ${err.message}`);
    res.end();
    buildStatus = "error";
    setTimeout(() => { buildStatus = "idle"; }, 10000);
  }
});

function writeBuildLog(res, line) {
  res.write(`event: build-log\ndata: ${line}\n\n`);
}

// ─── SPA fallback ────────────────────────────────────────────────────

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
