/**
 * benchmark-engine.js
 *
 * Core benchmark engine — all test logic extracted from index.js.
 * Can be imported by both the CLI entrypoint (index.js) and the API server (api-server.js).
 *
 * Usage:
 *   const engine = new BenchmarkEngine(configs, { onStatus, onResult, onLog, onComplete });
 *   await engine.run();
 */

import "dotenv/config";
import axios from "axios";
import fs from "fs";
import { spawn, exec, execSync } from "child_process";
import { join } from "path";

// ─── Shared test messages ────────────────────────────────────────────
export const BENCHMARK_MESSAGES = [
  "Develop a design doc for a self-hosted tetris clone web-based game..",
  "Audit the design doc.",
  "Recommend optimizations.",
  "Create a social-media marketing campaign for it.",
];

// ─── Configuration defaults ──────────────────────────────────────────
export const DEFAULT_CONFIGS = {
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
  model_directory: "",
  llama_cache: "",
  gpu_selection: { enabled: true, gpus: [0] },
  split_params: {
    layer_split: { enabled: false, value: "layer" },
    tensor_split: { enabled: false, value: "16,12,12" },
    primary_gpu: { enabled: false, value: 0 },
  },
  spec_params: {
    spec_type: { enabled: false, value: "draft-mtp" },
    spec_draft_n_max: { enabled: false, value: 3 },
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
  cuda_configs: { cuda_version: "12.6", cudacxx: "/usr/local/cuda/bin/nvcc" },
  model_configs: { temp: 0.6, top_p: 0.95, min_p: 0, top_k: 20 },
  server_params: {
    cont_batching: true,
    flash_attn: { enabled: true, value: 1 },
    reasoning: { enabled: true, value: 1 },
    profiling: true,
    presence_penalty: { enabled: true, value: 0 },
    reasoning_budget: { enabled: true, value: 2048 },
    reasoning_budget_message: { enabled: true, value: "Proceed to final answer." },
    rope_scaling: { enabled: true, value: "yarn" },
    jinja: false,
    parallel: { enabled: true, value: 1 },
    n_predict: { enabled: false, value: 512 },
    n_keep: { enabled: false, value: 0 },
    stream: { enabled: true, value: false },
    cache_prompt: { enabled: true, value: true },
    gpu_layers: { enabled: true, value: 999 },
  },
  benchmark_messages: BENCHMARK_MESSAGES,
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

/**
 * Load configs from a JSON file.
 */
export function loadConfigs(configPath) {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIGS, null, 2));
    return { ...DEFAULT_CONFIGS };
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

/**
 * Save configs to a JSON file.
 */
export function saveConfigs(configs, configPath) {
  fs.writeFileSync(configPath, JSON.stringify(configs, null, 2));
}

// ─── System helpers ──────────────────────────────────────────────────

/**
 * Read system memory from /proc/meminfo.
 */
export function getSystemMemory() {
  const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
  const match = meminfo.match(/MemTotal:\s+(\d+)/);
  const matchFree = meminfo.match(/MemAvailable:\s+(\d+)/);
  const totalKb = parseInt(match[1], 10);
  const availKb = parseInt(matchFree[1], 10);
  const totalGb = Math.round(totalKb / 1024 / 1024);
  const availGb = Math.round(availKb / 1024 / 1024);
  const usedMb = totalGb - availGb;
  const percentUsed = (usedMb / totalGb).toFixed(2);
  return { used: usedMb, total: totalGb, stat: (percentUsed * 100).toFixed(2) };
}

/**
 * Wait for a TCP port to be fully free (no TIME_WAIT, no process bound).
 */
export function waitForPortFree(port, maxWaitMs = 15000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      exec(`ss -t state time-wait sport = :${port} 2>/dev/null || true`, (error, stdout) => {
        const hasTimeWait = stdout.trim().length > 0;
        if (!hasTimeWait) {
          exec(`lsof -i :${port} -t 2>/dev/null`, (error2) => {
            if (error2) {
              resolve();
            } else {
              exec(`kill -9 $(lsof -i :${port} -t 2>/dev/null)`, (killErr) => {
                setTimeout(resolve, 500);
              });
            }
          });
        } else if (Date.now() - start < maxWaitMs) {
          setTimeout(check, 500);
        } else {
          exec(`kill -9 $(lsof -i :${port} -t 2>/dev/null)`, () => resolve());
        }
      });
    };
    check();
  });
}

/**
 * Check if any llama-server processes are running.
 */
export function findLlamaServerProcesses() {
  return new Promise((resolve) => {
    exec("pgrep -f llama-server", (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve([]);
        return;
      }
      resolve(stdout.trim().split("\n").filter(Boolean).map(Number));
    });
  });
}

/**
 * Kill all llama-server processes.
 */
export async function killLlamaServerProcesses() {
  const pids = await findLlamaServerProcesses();
  if (pids.length === 0) return;

  console.log(`Found ${pids.length} existing llama-server process(es): ${pids.join(", ")}`);
  console.log("Killing existing llama-server process(es)...");

  pids.forEach((pid) => {
    try { process.kill(pid, "SIGTERM"); } catch { /* already dead */ }
  });

  await new Promise((r) => setTimeout(r, 2000));

  pids.forEach((pid) => {
    try { process.kill(pid, "SIGKILL"); } catch { /* already dead */ }
  });

  console.log("All existing llama-server processes killed.");
  await waitForPortFree(configs?.llama_port || 11434);
  console.log("Port is free.");
}

// ─── Build helpers ───────────────────────────────────────────────────

/**
 * Check if llama.cpp repo already exists.
 */
export function isCloned(llamaDir) {
  try {
    const stat = fs.statSync(llamaDir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Clone the llama.cpp repository.
 */
export function runClone(llamaDir) {
  console.log("Cloning llama.cpp repository...");
  execSync("git clone https://github.com/ggml-org/llama.cpp", { cwd: llamaDir, stdio: "inherit" });
  console.log("llama.cpp cloned successfully.");
}

/**
 * Pull latest changes in the llama.cpp repository.
 */
export function runPull(llamaDir) {
  console.log("Pulling latest llama.cpp...");
  execSync("git stash && git pull", { cwd: llamaDir, stdio: "inherit" });
  console.log("llama.cpp updated successfully.");
}

/**
 * Build llama.cpp using cmake + make.
 * Returns { success, detail }
 */
export function runBuild(buildDir, buildCores, configs) {
  try {
    const env = buildEnv(configs);
    const buildScript = getBuildScript(configs);

    console.log("Running cmake build configuration...");
    console.log(`  Working directory: ${buildDir}`);
    console.log(`  Build cores: ${buildCores}`);
    console.log("  Build parameters:");
    for (const flag of buildScript.flags) {
      console.log(`    ${flag}`);
    }
    console.log(`  CMake command: ${buildScript.command}`);

    execSync(buildScript.command, { cwd: buildDir, env, stdio: "inherit" });
    console.log("CMake configuration complete.");

    console.log("Building llama.cpp...");
    execSync(`cmake --build build --config Release -j ${buildCores} --clean-first`, {
      cwd: buildDir,
      env,
      stdio: "inherit",
    });

    const binaryPath = buildDir + "/build/bin/llama-server";
    if (!fs.existsSync(binaryPath)) {
      let detail = `llama-server binary not found at ${binaryPath}. `;
      try {
        detail += `Build directory contents: ${fs.readdirSync(buildDir + "/build").join(", ")}`;
      } catch {
        detail += "Build directory does not exist.";
      }
      throw new Error(detail);
    }

    console.log("llama.cpp build complete. Binary: " + binaryPath);
    return { success: true, detail: "Build successful" };
  } catch (error) {
    let msg = "Build failed";
    if (error instanceof Error) {
      msg = error.message;
    }
    console.error("\n" + "=".repeat(60));
    console.error("BUILD FAILURE");
    console.error("=".repeat(60));
    console.error(msg);
    console.error("=".repeat(60));
    return { success: false, detail: msg };
  }
}

/**
 * Verify the llama-server binary exists.
 */
export function verifyBinary(binaryPath) {
  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `llama-server binary not found at ${binaryPath}. ` +
        "Run the benchmark again - it should build llama.cpp automatically on first run. " +
        "Check the build logs above for cmake/make errors.",
    );
  }
  return true;
}

/**
 * Build environment variables for llama.cpp.
 */
export function buildEnv(configs) {
  const ec = configs.export_configs || {};
  const cuda = configs.cuda_configs || {};
  return {
    ...process.env,
    GGML_CUDA_ENABLE_UNIFIED_MEMORY: ec.GGML_CUDA_ENABLE_UNIFIED_MEMORY || "1",
    CUDA_SCALE_LAUNCH_QUEUES: ec.CUDA_SCALE_LAUNCH_QUEUES || "4x",
    LLAMA_CACHE: ec.LLAMA_CACHE || configs.llama_cache || "",
    CUDACXX: cuda.cudacxx || "/usr/local/cuda/bin/nvcc",
    GGML_CUDA_P2P: ec.GGML_CUDA_P2P || "on",
    PATH: `/usr/local/cuda-${cuda.cuda_version || "12.6"}/bin${process.env.PATH ? ":" + process.env.PATH : ""}`,
    LLAMA_ARG_FIT: ec.LLAMA_ARG_FIT || "on",
    LLAMA_ARG_FIT_TARGET: ec.LLAMA_ARG_FIT_TARGET || "256",
    LLAMA_ARG_FIT_CTX: ec.LLAMA_ARG_FIT_CTX || "131072",
  };
}

/**
 * Build the CMake command string from configs.
 */
export function getBuildScript(configs) {
  const flags = [];
  const bp = configs.build_make_params || {};

  if (bp.enable_ccache) flags.push("-DGGML_CCACHE=1");
  if (bp.enable_lto) flags.push("-DGGML_LTO=1");
  if (bp.enable_cuda) flags.push("-DGGML_CUDA=1");
  if (bp.enable_cuda_fa) flags.push("-DGGML_CUDA_FA=1");
  if (bp.enable_cuda_graphs) flags.push("-DGGML_CUDA_GRAPHS=1");
  if (bp.enable_cuda_nccl) flags.push("-DGGML_CUDA_NCCL=1");
  if (bp.enable_cuda_per_max_batch_size)
    flags.push(`-DGGML_CUDA_PEER_MAX_BATCH_SIZE=${bp.peer_batch_size || "512"}`);
  if (bp.enable_cuda_peer_copy) flags.push("-DGGML_CUDA_PEER_COPY=1");
  if (bp.enable_cuda_custom_arch)
    flags.push("-DCMAKE_CUDA_ARCHITECTURES=\"86-real;120-real\"");
  if (bp.enable_cuda_fa_all_quants)
    flags.push(`-DGGML_CUDA_FA_ALL_QUANTS=${bp.cuda_all_quants !== undefined ? bp.cuda_all_quants : true}`);
  if (bp.enable_cuda_fp16)
    flags.push(`-DGGML_CUDA_FP16=${bp.cuda_fp16 !== undefined ? bp.cuda_fp16 : true}`);
  if (bp.enable_cuda_scheduled_max_copies)
    flags.push(`-DGGML_SCHED_MAX_COPIES=${bp.cuda_max_scheduled_copies || 14}`);
  if (bp.enable_cuda_compression_level)
    flags.push(`-DGGML_CUDA_COMPRESSION_LEVEL=${bp.cuda_compression_level || 0}`);

  return {
    command: `cmake -B build -DCMAKE_BUILD_TYPE=Release ${flags.join(" ")}`,
    flags,
  };
}

/**
 * Build the llama-server CLI command string.
 */
export function getServerCommand(configs, testState) {
  const sp = configs.server_params || {};
  const sps = configs.split_params || {};
  const gs = configs.gpu_selection || { enabled: false, gpus: [0] };
  const { contextLength, gpuLayerOffload, batchSize, uBatchSize, cacheRam } = testState;

  const parts = [
    `./llama-server -m ${configs.model_directory}/${configs.model} `,
    `--port ${configs.llama_port} --host ${configs.llama_host} `,
    `-c ${contextLength} -ngl ${gpuLayerOffload} `,
    `--temp ${configs.model_configs.temp} `,
    `--top-p ${configs.model_configs.top_p} --min-p ${configs.model_configs.min_p} `,
    `--top-k ${configs.model_configs.top_k} `,
    `--batch-size ${batchSize} --ubatch-size ${uBatchSize} `,
    `--cache-ram ${cacheRam} `,
  ];

  if (sp.cont_batching) parts.push(`--cont-batching `);
  if (sp.flash_attn?.enabled) parts.push(`--flash-attn ${sp.flash_attn.value} `);
  if (sp.reasoning?.enabled) parts.push(`--reasoning ${sp.reasoning.value} `);
  if (sp.profiling) parts.push(`-e `);
  if (sp.presence_penalty?.enabled)
    parts.push(`--presence-penalty ${sp.presence_penalty.value} `);
  if (sp.reasoning_budget?.enabled)
    parts.push(`--reasoning-budget ${sp.reasoning_budget.value} `);
  if (sp.reasoning_budget_message?.enabled)
    parts.push(`--reasoning-budget-message "${sp.reasoning_budget_message.value}" `);
  if (sp.rope_scaling?.enabled)
    parts.push(`--rope-scaling ${sp.rope_scaling.value} `);
  if (sp.jinja) parts.push(`--jinja `);
  if (sp.parallel?.enabled) parts.push(`--parallel ${sp.parallel.value} `);
  if (sps.layer_split?.enabled)
    parts.push(`--split-mode ${sps.layer_split.value} `);

  // Tensor split
  if (sps.tensor_split?.enabled) {
    const tensorSplitValue = gs.enabled && gs.gpus && gs.gpus.length > 1
      ? Array(gs.gpus.length).fill(Math.round(100 / gs.gpus.length)).join(",")
      : "0";
    parts.push(`--tensor-split ${tensorSplitValue} `);
  }

  if (sps.primary_gpu?.enabled)
    parts.push(`--main-gpu ${gs.enabled && gs.gpus ? gs.gpus[0] : 0} `);

  // Spec params
  const sps2 = configs.spec_params || {};
  if (sps2.spec_type?.enabled)
    parts.push(`--spec-type ${sps2.spec_type.value} `);
  if (sps2.spec_draft_n_max?.enabled)
    parts.push(`--spec-draft-n-max ${sps2.spec_draft_n_max.value} `);

  return parts.join("");
}

/**
 * Get a snapshot of server parameters for this test run (for results reporting).
 */
export function getServerParamsSnapshot(configs, testState, gpuSelection) {
  const sp = configs.server_params || {};
  const sps = configs.split_params || {};
  const gs = configs.gpu_selection || { enabled: false, gpus: [0] };
  const bp = configs.build_make_params || {};
  const ec = configs.export_configs || {};
  const cuda = configs.cuda_configs || {};

  const tensorSplitValue = gs.enabled && gs.gpus && gs.gpus.length > 1
    ? Array(gs.gpus.length).fill(Math.round(100 / gs.gpus.length)).join(",")
    : "0";

  return {
    model: `${configs.model_directory}/${configs.model}`,
    host: configs.llama_host,
    port: configs.llama_port,
    contextLength: testState.contextLength,
    gpuLayerOffload: testState.gpuLayerOffload,
    gpuLayers: sp.gpu_layers?.enabled ? sp.gpu_layers.value : null,
    batchSize: testState.batchSize,
    uBatchSize: testState.uBatchSize,
    cacheRam: testState.cacheRam,
    flashAttn: sp.flash_attn?.enabled ? sp.flash_attn.value : null,
    reasoning: sp.reasoning?.enabled ? sp.reasoning.value : null,
    temperature: configs.model_configs?.temp,
    topP: configs.model_configs?.top_p,
    minP: configs.model_configs?.min_p,
    topK: configs.model_configs?.top_k,
    layerSplit: sps.layer_split?.enabled ? sps.layer_split.value : null,
    tensorSplit: sps.tensor_split?.enabled ? tensorSplitValue : null,
    primaryGpu: sps.primary_gpu?.enabled ? (gs.enabled && gs.gpus ? gs.gpus[0] : 0) : null,
    gpuSelection: gs.enabled ? gs.gpus.slice() : [0],
    ropeScaling: sp.rope_scaling?.enabled ? sp.rope_scaling.value : null,
    jinja: sp.jinja ? true : null,
    parallel: sp.parallel?.enabled ? sp.parallel.value : null,
    contBatching: sp.cont_batching ? true : null,
    presencePenalty: sp.presence_penalty?.enabled ? sp.presence_penalty.value : null,
    reasoningBudget: sp.reasoning_budget?.enabled ? sp.reasoning_budget.value : null,
    reasoningBudgetMessage: sp.reasoning_budget_message?.enabled ? sp.reasoning_budget_message.value : null,
    env: buildEnv(configs),
    cmakeFlags: getCmakeFlagsSnapshot(bp),
  };
}

function getCmakeFlagsSnapshot(bp) {
  const flags = {};
  if (bp.enable_ccache) flags.GGML_CCACHE = "1";
  if (bp.enable_lto) flags.GGML_LTO = "1";
  if (bp.enable_cuda) flags.GGML_CUDA = "1";
  if (bp.enable_cuda_fa) flags.GGML_CUDA_FA = "1";
  if (bp.enable_cuda_graphs) flags.GGML_CUDA_GRAPHS = "1";
  if (bp.enable_cuda_nccl) flags.GGML_CUDA_NCCL = "1";
  if (bp.enable_cuda_per_max_batch_size)
    flags.GGML_CUDA_PEER_MAX_BATCH_SIZE = bp.peer_batch_size || "512";
  if (bp.enable_cuda_peer_copy) flags.GGML_CUDA_PEER_COPY = "1";
  if (bp.enable_cuda_custom_arch)
    flags.CMAKE_CUDA_ARCHITECTURES = "86-real;120-real";
  if (bp.enable_cuda_fa_all_quants)
    flags.GGML_CUDA_FA_ALL_QUANTS = bp.cuda_all_quants !== undefined ? bp.cuda_all_quants : true;
  if (bp.enable_cuda_fp16)
    flags.GGML_CUDA_FP16 = bp.cuda_fp16 !== undefined ? bp.cuda_fp16 : true;
  if (bp.enable_cuda_scheduled_max_copies)
    flags.GGML_SCHED_MAX_COPIES = bp.cuda_max_scheduled_copies || 14;
  if (bp.enable_cuda_compression_level)
    flags.GGML_CUDA_COMPRESSION_LEVEL = bp.cuda_compression_level || 0;
  return flags;
}

// ─── GPU selection helpers ───────────────────────────────────────────

export function initGpuSelection(configs) {
  const gpuSelection = configs.gpu_selection || { enabled: false, gpus: [0] };
  const selectedGpus = gpuSelection.enabled ? gpuSelection.gpus : [0];
  const primaryGpu = selectedGpus[0];
  const tensorSplitValue = selectedGpus.length > 1
    ? Array(selectedGpus.length).fill(Math.round(100 / selectedGpus.length)).join(",")
    : "0";

  console.log(
    `GPU selection: ${gpuSelection.enabled ? `enabled [${selectedGpus.join(", ")}]` : "disabled (GPU 0)"}`,
  );
  console.log(`  Primary GPU: ${primaryGpu}`);
  console.log(`  Tensor split: ${tensorSplitValue}`);

  return {
    gpuSelection,
    selectedGpus,
    primaryGpu,
    tensorSplitValue,
  };
}

// ─── HTTP test helpers (the core refactored piece) ───────────────────

/**
 * Send a chat completion request to the llama-server API.
 * This is the refactored test function — pure HTTP, no subprocess coupling.
 *
 * @param {string} url - The llama-server base URL (e.g., "http://localhost:11434")
 * @param {Array} messages - Chat messages array
 * @param {Object} params - Test parameters (n_ctx, batch_size, etc.)
 * @returns {Object} Structured result with timing and token counts
 */
export async function sendChatCompletion(url, messages, params, configs) {
  const startTime = Date.now();

  const payload = {
    messages: messages,
    n_ctx: params.contextLength,
    batch_size: params.batchSize,
    temperature: configs.model_configs.temp,
    top_p: configs.model_configs.top_p,
    min_p: configs.model_configs.min_p,
    top_k: configs.model_configs.top_k,
  };

  if (configs.server_params?.n_predict?.enabled)
    payload.n_predict = configs.server_params.n_predict.value;
  if (configs.server_params?.n_keep?.enabled)
    payload.n_keep = configs.server_params.n_keep.value;
  if (configs.server_params?.cache_prompt?.enabled)
    payload.cache_prompt = configs.server_params.cache_prompt.value;

  const resp = await axios.post(`${url}/chat/completions`, payload, {
    timeout: 600000,
  });

  const endTime = Date.now();
  const totalTimeMs = endTime - startTime;
  const data = resp.data;

  const responseText = data.choices?.[0]?.message?.content || "(no response content)";
  const promptTokens = data.usage?.prompt_tokens || 0;
  const generatedTokens = data.usage?.completion_tokens || 0;
  const promptTimeMs = data.timings?.prompt_ms || 0;
  const predictedTimeMs = data.timings?.predicted_ms || 0;

  const promptTokensPerSec =
    promptTokens > 0 && promptTimeMs > 0
      ? (promptTokens / promptTimeMs) * 1000
      : 0;
  const generatedTokensPerSec =
    generatedTokens > 0 && predictedTimeMs > 0
      ? (generatedTokens / predictedTimeMs) * 1000
      : 0;

  return {
    promptTokens,
    generatedTokens,
    totalTimeMs,
    promptTimeMs: promptTimeMs || totalTimeMs,
    predictedTimeMs: predictedTimeMs || 0,
    promptTokensPerSec: Math.round(promptTokensPerSec * 100) / 100,
    generatedTokensPerSec: Math.round(generatedTokensPerSec * 100) / 100,
    responseText,
  };
}

// ─── Server lifecycle ────────────────────────────────────────────────

/**
 * Start llama-server as a child process with retry logic.
 * @returns {Promise<{ url: string, process: ChildProcess }>}
 */
export function startLlamaServer(configs, testState, rootDir) {
  return new Promise((resolve, reject) => {
    const binaryPath = rootDir + "/llama.cpp/build/bin/llama-server";
    verifyBinary(binaryPath);

    const runCmd = getServerCommand(configs, testState);
    const url = `http://${configs.llama_host}:${configs.llama_port}`;

    console.log("Starting llama-server...");
    console.log(`  Binary: ${binaryPath}`);
    console.log(`  Command: ${runCmd.trim()}`);

    const maxRetries = 5;

    async function tryStart(attempt) {
      if (attempt > maxRetries) {
        reject(new Error(`llama-server failed to start after ${maxRetries} attempts`));
        return;
      }

      if (attempt > 1) {
        console.log(`  Retry attempt ${attempt}/${maxRetries}...`);
        await new Promise((r) => setTimeout(r, 2000));
      }

      const env = buildEnv(configs);
      const serverProcess = spawn(runCmd.trim(), {
        cwd: rootDir + "/llama.cpp/build/bin",
        env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      });

      let output = "";
      serverProcess.stdout.on("data", (data) => {
        const str = data.toString();
        output += str;
        process.stdout.write(str);
      });
      serverProcess.stderr.on("data", (data) => {
        const str = data.toString();
        output += str;
        process.stderr.write(str);
      });

      // Wait 3 seconds, then poll for health
      const earlyDeathTimer = setTimeout(async () => {
        const maxHealthRetries = 120;
        let retries = 0;
        const pollInterval = setInterval(async () => {
          retries++;
          try {
            const resp = await axios.get(`${url}/health`, { timeout: 3000 });
            if (resp.status === 200) {
              clearInterval(pollInterval);
              console.log(`llama-server ready after ${retries * 1} tries.`);
              resolve({ url, process: serverProcess });
              return;
            }
          } catch {
            if (retries >= maxHealthRetries) {
              clearInterval(pollInterval);
              // Clean up failed process
              if (!serverProcess.killed) {
                try { serverProcess.kill("SIGKILL"); } catch {}
              }
              // Retry on port binding failure
              const hasBindError = output.includes("couldn't bind") || output.includes("HTTP server error");
              if (hasBindError) {
                tryStart(attempt + 1);
              } else {
                reject(new Error(`llama-server did not become ready after ${maxHealthRetries} health checks`));
              }
              return;
            }
          }
        }, 1000);
      }, 3000);

      serverProcess.on("close", (code) => {
        clearTimeout(earlyDeathTimer);
        if (code !== 0) {
          const hasBindError = output.includes("couldn't bind") || output.includes("HTTP server error");
          if (hasBindError) {
            tryStart(attempt + 1);
            return;
          }
          reject(new Error(`llama-server exited with code ${code}`));
        }
      });

      serverProcess.on("error", (err) => {
        clearTimeout(earlyDeathTimer);
        reject(err);
      });
    }

    tryStart(1);
  });
}

/**
 * Stop llama-server gracefully, then fall back to signal kill.
 */
export async function stopLlamaServer(server) {
  if (!server) return;

  const url = server.url;

  // Try graceful shutdown via /shutdown endpoint
  try {
    await axios.post(`${url}/shutdown`, null, { timeout: 3000 });
    console.log("llama-server stopped gracefully via /shutdown");
  } catch {
    // /shutdown failed or server already dead, fall back to signal
  }

  // If process is still alive, use SIGTERM -> SIGKILL
  if (server.process && !server.process.killed) {
    server.process.kill("SIGTERM");

    await new Promise((resolve) => {
      server.process.on("close", () => {
        console.log("llama-server stopped.");
        resolve();
      });
      setTimeout(() => {
        if (server.process && !server.process.killed) {
          server.process.kill("SIGKILL");
          console.log("llama-server force killed.");
        }
        resolve();
      }, 10000);
    });
  }

  // Wait for port to be truly free
  await waitForPortFree(configs?.llama_port || 11434);
  console.log("llama-server stopped.");
}

// ─── Parameter advancement ───────────────────────────────────────────

/**
 * Advance test parameters to the next configuration.
 */
export function advanceConfig(configs, testState) {
  const tp = configs.test_params || {};
  testState.contextLength = Math.min(
    testState.contextLength * (tp.context_length_multiplier || 2),
    tp.context_length_max || 262144,
  );
  testState.gpuLayerOffload = Math.min(
    testState.gpuLayerOffload + (tp.gpu_layer_offload_step || 0),
    tp.gpu_layer_off_max || 999,
  );
  testState.batchSize = Math.min(
    testState.batchSize + (tp.batch_size_step || 128),
    tp.batch_size_max || 16384,
  );
  testState.uBatchSize = Math.min(
    testState.uBatchSize + (tp.u_batch_size_step || 64),
    tp.u_batch_size_max || 4096,
  );
  testState.cacheRam = Math.min(
    testState.cacheRam + (tp.cache_ram_step || 1024),
    tp.cache_ram_max || 4096,
  );
}

/**
 * Check if all test variables have reached their maximum values.
 */
export function areAllVariablesAtMax(configs, testState) {
  const tp = configs.test_params || {};
  return (
    testState.contextLength >= (tp.context_length_max || 262144) &&
    testState.gpuLayerOffload >= (tp.gpu_layer_off_max || 999) &&
    testState.batchSize >= (tp.batch_size_max || 16384) &&
    testState.uBatchSize >= (tp.u_batch_size_max || 4096) &&
    testState.cacheRam >= (tp.cache_ram_max || 4096)
  );
}

/**
 * Initialize test state from configs.
 */
export function initTestState(configs) {
  const tp = configs.test_params || {};
  return {
    contextLength: tp.context_length || 32768,
    gpuLayerOffload: tp.gpu_layer_offload || 999,
    batchSize: tp.batch_size || 128,
    uBatchSize: tp.u_batch_size || 64,
    cacheRam: tp.cache_ram || 4096,
  };
}

// ─── Results writing ─────────────────────────────────────────────────

/**
 * Write all results to a markdown file.
 */
export function writeResultsMarkdown(results, resultsFile) {
  let md = "# llama.cpp Benchmark Results\n\n";
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `Model: ${results.length > 0 && results[0].model ? results[0].model : "unknown"}\n\n`;
  md += `---\n\n`;

  // Table 1: Per-message results
  md += "## Per-Message Results\n\n";
  md += "| Test Run | Message | Context Len | Messages in Context | Prompt Tokens | Generated Tokens | Total Time (ms) | Prompt Tokens/sec | Gen Tokens/sec | Memory (GB) |\n";
  md += "|----------|---------|-------------|---------------------|---------------|------------------|-----------------|-------------------|----------------|-------------|\n";

  for (const run of results) {
    if (run.aborted) {
      md += `| ${run.testRunId} | - | ${run.contextLength} | - | - | - | - | - | - | - | *Aborted: ${run.abortReason}* |\n`;
    } else {
      for (const msg of run.messageResults) {
        md += `| ${run.testRunId} | ${msg.messageIndex} | ${run.contextLength} | ${msg.totalMessagesInContext} | ${msg.promptTokens} | ${msg.generatedTokens} | ${msg.totalTimeMs} | ${msg.promptTokensPerSec} | ${msg.generatedTokensPerSec} | ${msg.mem.used} / ${msg.mem.total} GB |\n`;
      }
    }
  }

  md += "\n";

  // Table 2: Per-test-run averages
  md += "## Test Run Averages\n\n";
  md += "| Test Run | Context | Batch | UBatch | Cache (GB) | GPU Layers | Avg Prompt Tok/s | Avg Gen Tok/s | Total Prompt Toks | Total Gen Toks | Total Time (ms) | Mem (GB) |\n";
  md += "|----------|---------|-------|--------|------------|------------|------------------|---------------|-------------------|----------------|-----------------|----------|\n";

  for (const run of results) {
    if (run.aborted) {
      md += `| ${run.testRunId} | ${run.contextLength} | ${run.batchSize} | ${run.uBatchSize} | ${run.cacheRam} | ${run.gpuLayerOffload} | - | - | - | - | - | - | *Aborted: ${run.abortReason}* |\n`;
    } else {
      md += `| ${run.testRunId} | ${run.contextLength} | ${run.batchSize} | ${run.uBatchSize} | ${run.cacheRam} | ${run.gpuLayerOffload} | ${run.averages.avgPromptTokensPerSec} | ${run.averages.avgGenTokensPerSec} | ${run.averages.totalPromptTokens} | ${run.averages.totalGeneratedTokens} | ${run.averages.totalTimeMs} | ${run.averages.avgMemUsed} / ${run.averages.avgMemTotal} GB |\n`;
    }
  }

  md += "\n";

  // Table 3: Server parameters per test run
  md += "## Server Parameters\n\n";
  md += "| Test Run | GPUs | Temp | Top-P | Min-P | Top-K | Flash-Attn | Reasoning | Rope Scaling | Split Mode | Tensor Split | Main GPU | Parallel |\n";
  md += "|----------|------|------|-------|-------|-------|------------|-----------|--------------|------------|--------------|----------|----------|\n";

  for (const run of results) {
    md += `| ${run.testRunId} | ${run.gpuSelection?.join(",") || "0"} | ${run.temperature} | ${run.topP} | ${run.minP} | ${run.topK} | ${run.flashAttn} | ${run.reasoning} | ${run.ropeScaling} | ${run.layerSplit} | ${run.tensorSplit} | ${run.primaryGpu} | ${run.parallel} |\n`;
  }

  md += "\n";

  // Table 4: CMake build flags per test run
  md += "## CMake Build Flags\n\n";
  md += "| Test Run | GGML_CUDA | GGML_CUDA_GRAPHS | GGML_CUDA_FA | GGML_CUDA_FP16 | GGML_CUDA_PEER_MAX_BATCH_SIZE | GGML_SCHED_MAX_COPIES | GGML_CUDA_COMPRESSION_LEVEL | GGML_LTO | GGML_CCACHE |\n";
  md += "|----------|-----------|------------------|--------------|----------------|-------------------------------|-----------------------|-----------------------------|----------|-------------|\n";

  for (const run of results) {
    const f = run.cmakeFlags || {};
    md += `| ${run.testRunId} | ${f.GGML_CUDA || ""} | ${f.GGML_CUDA_GRAPHS || ""} | ${f.GGML_CUDA_FA || ""} | ${f.GGML_CUDA_FP16 || ""} | ${f.GGML_CUDA_PEER_MAX_BATCH_SIZE || ""} | ${f.GGML_SCHED_MAX_COPIES || ""} | ${f.GGML_CUDA_COMPRESSION_LEVEL || ""} | ${f.GGML_LTO || ""} | ${f.GGML_CCACHE || ""} |\n`;
  }

  md += "\n";

  // Table 5: Environment variables per test run
  md += "## Environment Variables\n\n";
  md += "| Test Run | GGML_CUDA_ENABLE_UNIFIED_MEMORY | CUDA_SCALE_LAUNCH_QUEUES | LLAMA_CACHE | GGML_CUDA_P2P | LLAMA_ARG_FIT | LLAMA_ARG_FIT_TARGET | LLAMA_ARG_FIT_CTX |\n";
  md += "|----------|---------------------------------|--------------------------|-------------|---------------|---------------|----------------------|---------------------|\n";

  for (const run of results) {
    const e = run.env || {};
    md += `| ${run.testRunId} | ${e.GGML_CUDA_ENABLE_UNIFIED_MEMORY} | ${e.CUDA_SCALE_LAUNCH_QUEUES} | ${e.LLAMA_CACHE} | ${e.GGML_CUDA_P2P} | ${e.LLAMA_ARG_FIT} | ${e.LLAMA_ARG_FIT_TARGET} | ${e.LLAMA_ARG_FIT_CTX} |\n`;
  }

  md += "\n---\n*Generated by llama.cpp benchmark tool*\n";

  fs.writeFileSync(resultsFile, md);
}

/**
 * Save a JSON report.
 */
export function saveReport(liveResults, configs, resultsFile, reportsDir) {
  const modelBasename = configs.model ? configs.model.replace(/\.[^.]+$/, "") : "unknown";
  const today = new Date().toISOString().slice(0, 10);
  const reportName = `${today}-${modelBasename}`;

  const mdContent = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, "utf8") : "";
  const configsPerRun = extractConfigsPerRun(liveResults, configs);

  const report = {
    name: reportName,
    savedAt: new Date().toISOString(),
    mdContent,
    liveResults,
    configsPerRun,
    configs,
  };

  const filePath = join(reportsDir, `${reportName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  return { reportName, filePath };
}

/**
 * Extract detailed test run configs from live results.
 */
export function extractConfigsPerRun(liveResults, configs) {
  if (!liveResults || !configs) return [];
  return liveResults.map((r) => {
    const tp = configs.test_params || {};
    const mc = configs.model_configs || {};
    const sp = configs.server_params || {};
    const sps = configs.split_params || {};
    const gs = configs.gpu_selection || { enabled: false, gpus: [0] };

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
      testParameters: { contextLength, batchSize, uBatchSize, cacheRam, gpuLayerOffload },
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

// ─── BenchmarkEngine class ───────────────────────────────────────────

/**
 * The main benchmark engine class.
 *
 * @param {Object} configs - Benchmark configuration
 * @param {Object} options
 * @param {string} options.rootDir - Root directory of the benchmark project
 * @param {string} options.configsPath - Path to configs.json
 * @param {string} options.resultsFile - Path to results.md output
 * @param {string} options.reportsDir - Path to reports directory
 * @param {Function} options.onStatus - Called with status changes: { status, testRun, liveResults, finished, error }
 * @param {Function} options.onResult - Called with each completed test run result
 * @param {Function} options.onLog - Called with log messages: { type, text }
 * @param {Function} options.onComplete - Called when benchmark is fully done
 */
export class BenchmarkEngine {
  constructor(configs, options = {}) {
    this.configs = configs;
    this.rootDir = options.rootDir || process.cwd();
    this.configsPath = options.configsPath || join(this.rootDir, "configs.json");
    this.resultsFile = options.resultsFile || join(this.rootDir, "results.md");
    this.reportsDir = options.reportsDir || join(this.rootDir, "reports");
    this.onStatus = options.onStatus || (() => {});
    this.onResult = options.onResult || (() => {});
    this.onLog = options.onLog || (() => {});
    this.onComplete = options.onComplete || (() => {});

    // State
    this.isRunning = true;
    this.errorCount = 0;
    this.maxErrors = 10;
    this.results = [];
    this.liveResults = [];
    this.currentTestRun = 0;
    this.benchmarkMessages = [];
    this.currentTestRunMessages = [];
    this.server = null; // { url, process }

    // GPU info (initialized in run())
    this.gpuSelection = null;
    this.selectedGpus = null;
    this.primaryGpu = null;
    this.tensorSplitValue = null;

    // Test state (initialized in run())
    this.testState = null;

    // Build state
    this.buildStatus = "idle"; // idle | building | success | error
    this.buildProcess = null;

    // Build params
    this.buildParams = configs.build_make_params || {};
    this.buildCores = configs.build_cores || 1;
    this.skipBuild = configs.skip_build || false;
  }

  /**
   * Run the full benchmark: init → build → test loop.
   */
  async run() {
    console.log("=== llama.cpp Benchmark Starting ===");
    const llamaUrl = `http://${this.configs.llama_host}:${this.configs.llama_port}`;
    console.log(`Server URL: ${llamaUrl}`);
    console.log(`Model: ${this.configs.model_directory}/${this.configs.model}`);
    console.log(`Results file: ${this.resultsFile}`);

    // Wipe the report file on startup
    if (fs.existsSync(this.resultsFile)) {
      fs.writeFileSync(this.resultsFile, "");
      console.log(`Wiped existing results file: ${this.resultsFile}`);
    }

    // Kill any existing llama-server before proceeding
    await this.ensureNoLlamaServer();

    try {
      const initResult = await this.initController();
      if (!initResult.success) {
        this.onStatus({
          status: "error",
          testRun: this.currentTestRun,
          liveResults: this.liveResults,
          finished: true,
          error: `Initialization failed: ${initResult.reason}`,
        });
        return { success: false, reason: initResult.reason };
      }

      if (initResult.success) {
        // Initialize test parameters from config
        this.testState = initTestState(this.configs);
        // Initialize GPU selection
        const gpuInfo = initGpuSelection(this.configs);
        this.gpuSelection = gpuInfo.gpuSelection;
        this.selectedGpus = gpuInfo.selectedGpus;
        this.primaryGpu = gpuInfo.primaryGpu;
        this.tensorSplitValue = gpuInfo.tensorSplitValue;

        while (this.isRunning) {
          const result = await this.runTestRun();
          if (this.errorCount >= this.maxErrors) {
            console.error(`\nReached ${this.maxErrors} errors. Stopping benchmark.`);
            this.isRunning = false;
          }
          // Write results after each test run for incremental reporting
          writeResultsMarkdown(this.results, this.resultsFile);
          // Save report after each run
          this.saveReportInternal();
          // Skip the "all variables at max" check if this run was aborted
          if (!result?.aborted && areAllVariablesAtMax(this.configs, this.testState)) {
            console.log("\nAll test variables reached their maximum values. Benchmark complete.");
            this.isRunning = false;
          }
        }
      } else {
        this.onStatus({
          status: "error",
          testRun: this.currentTestRun,
          liveResults: this.liveResults,
          finished: true,
          error: initResult.reason,
        });
        return { success: false, reason: initResult.reason };
      }
    } catch (error) {
      console.error("\n" + "=".repeat(60));
      console.error("BENCHMARK ENCOUNTERED AN UNEXPECTED ERROR");
      console.error("=".repeat(60));
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(`\nStack trace:\n${error.stack}`);
      }
      console.error("=".repeat(60));

      this.onStatus({
        status: "error",
        testRun: this.currentTestRun,
        liveResults: this.liveResults,
        finished: true,
        error: error.message,
      });

      return { success: false, error: error.message };
    }

    // Final cleanup: ensure llama-server is stopped
    await this.stopLlamaServer();

    // Final write of results
    writeResultsMarkdown(this.results, this.resultsFile);
    console.log("Benchmark complete. Results saved to", this.resultsFile);

    this.onStatus({
      status: "idle",
      testRun: this.currentTestRun,
      liveResults: this.liveResults,
      finished: true,
    });

    this.onComplete(this.results);
    return { success: true };
  }

  /**
   * Stop the benchmark (sets isRunning = false).
   */
  stop() {
    this.isRunning = false;
  }

  // ─── Controller: init repo, build, then enter benchmark loop ───────

  async initController() {
    const initResult = await this.init();
    if (!initResult.success) {
      return { success: false, reason: "Repository initialization failed", detail: initResult.detail };
    }

    if (this.skipBuild) {
      console.log("Skipping llama.cpp build (--no-build flag set).");
    } else {
      const buildResult = await this.runBuild();
      if (!buildResult.success) {
        return { success: false, reason: "llama.cpp build failed", detail: buildResult.detail };
      }
    }

    return { success: true, reason: null };
  }

  async init() {
    try {
      const llamaDir = join(this.rootDir, "llama.cpp");
      const cloned = isCloned(llamaDir);
      if (cloned) {
        runPull(llamaDir);
        return { success: true, detail: "llama.cpp updated" };
      } else {
        runClone(llamaDir);
        return { success: true, detail: "llama.cpp cloned" };
      }
    } catch (error) {
      let msg = "Init failed";
      if (error instanceof Error) {
        msg = error.message;
      }
      console.error("\n" + "=".repeat(60));
      console.error("INITIALIZATION FAILURE");
      console.error("=".repeat(60));
      console.error(msg);
      console.error("=".repeat(60));
      return { success: false, detail: msg };
    }
  }

  async runBuild() {
    this.buildStatus = "building";
    this.onStatus({
      status: "building",
      testRun: this.currentTestRun,
      liveResults: this.liveResults,
    });

    const buildDir = this.rootDir + "/llama.cpp";
    const result = runBuild(buildDir, this.buildCores, this.configs);

    if (result.success) {
      this.buildStatus = "success";
      return result;
    } else {
      this.buildStatus = "error";
      return result;
    }
  }

  // ─── Lifecycle helpers ─────────────────────────────────────────────

  async ensureNoLlamaServer() {
    const pids = await findLlamaServerProcesses();
    if (pids.length === 0) {
      console.log("No existing llama-server found.");
      return;
    }

    console.log(`Found ${pids.length} existing llama-server process(es): ${pids.join(", ")}`);
    console.log("Killing existing llama-server process(es)...");

    pids.forEach((pid) => {
      try { process.kill(pid, "SIGTERM"); } catch { /* already dead */ }
    });

    await new Promise((r) => setTimeout(r, 2000));

    pids.forEach((pid) => {
      try { process.kill(pid, "SIGKILL"); } catch { /* already dead */ }
    });

    console.log("All existing llama-server processes killed.");
    await waitForPortFree(this.configs.llama_port);
    console.log("Port is free. Proceeding.");
  }

  async startLlamaServerInternal() {
    const server = await startLlamaServer(this.configs, this.testState, this.rootDir);
    this.server = server;
    return server;
  }

  async stopLlamaServer() {
    if (!this.server) return;
    await stopLlamaServer(this.server);
    this.server = null;
  }

  // ─── Test execution ────────────────────────────────────────────────

  async runTestRun() {
    this.currentTestRun = this.results.length + 1;
    const testRunId = this.currentTestRun;
    console.log(`\n========== Test Run #${testRunId} ==========`);
    console.log(
      `  Context: ${this.testState.contextLength}, Batch: ${this.testState.batchSize}, UBatch: ${this.testState.uBatchSize}, Cache: ${this.testState.cacheRam} GB`,
    );
    console.log(`  GPU Offload: ${this.testState.gpuLayerOffload}`);

    // Broadcast status
    this.onStatus({
      status: "testing",
      testRun: testRunId,
      liveResults: this.liveResults,
    });

    // Check system memory
    const mem = getSystemMemory();
    if (parseFloat(mem.stat) >= this.configs.max_sys_mem) {
      console.log(
        `  ABORTED: System memory at ${mem.stat}% (${mem.used}GB/${mem.total}GB) exceeds threshold of ${this.configs.max_sys_mem}%`,
      );
      const abortedResult = {
        testRunId,
        contextLength: this.testState.contextLength,
        batchSize: this.testState.batchSize,
        uBatchSize: this.testState.uBatchSize,
        cacheRam: this.testState.cacheRam,
        gpuLayerOffload: this.testState.gpuLayerOffload,
        aborted: true,
        abortReason: `System memory at ${mem.stat}% (${mem.used}GB/${mem.total}GB) exceeds threshold of ${this.configs.max_sys_mem}%`,
      };
      this.results.push(abortedResult);
      this.liveResults.push({
        testRunId,
        avgGenTokensPerSec: null,
        avgPromptTokensPerSec: null,
        totalGenTokens: null,
        totalPromptTokens: null,
        totalTimeMs: null,
        avgMemUsed: null,
        avgMemTotal: mem.total,
      });
      this.onStatus({
        status: "testing",
        testRun: testRunId,
        liveResults: this.liveResults,
      });
      return { aborted: true };
    }

    // Ensure no leftover server
    await this.ensureNoLlamaServer();

    // Start server
    let server;
    try {
      server = await this.startLlamaServerInternal();
    } catch (error) {
      this.errorCount++;
      console.error(
        `\nTest Run #${testRunId} failed (error ${this.errorCount}/${this.maxErrors}): ${error.message}`,
      );
      console.error("Skipping this test run. Check the error above for details.");
      return;
    }

    const benchmarkMessages = this.configs.benchmark_messages || BENCHMARK_MESSAGES;
    const messageResults = [];
    const chatHistory = [];
    let runFailed = false;

    for (let i = 0; i < benchmarkMessages.length; i++) {
      console.log(`\n  --- Message ${i + 1}/${benchmarkMessages.length} ---`);
      try {
        chatHistory.push({ role: "user", content: benchmarkMessages[i] });

        // Broadcast message start
        this.onLog({ type: "stdout", text: `BENCHMARK_JSON:{"type":"message-start","testRunId":${testRunId},"messageIndex":${i + 1},"prompt":"${benchmarkMessages[i].replace(/"/g, '\\"')}"}` });

        const result = await sendChatCompletion(
          server.url,
          chatHistory,
          this.testState,
          this.configs,
        );
        result.messageIndex = i + 1;
        result.totalMessagesInContext = chatHistory.length;
        result.mem = getSystemMemory();
        messageResults.push(result);

        // Broadcast message complete
        const responseEscaped = result.responseText
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r');
        this.onLog({
          type: "stdout",
          text: `BENCHMARK_JSON:{"type":"message-complete","testRunId":${testRunId},"messageIndex":${i + 1},"prompt":"${benchmarkMessages[i].replace(/"/g, '\\"')}","response":"${responseEscaped}","promptTokens":${result.promptTokens},"generatedTokens":${result.generatedTokens},"totalTimeMs":${result.totalTimeMs}}`,
        });

        chatHistory.push({ role: "assistant", content: result.responseText });

        console.log(
          `    Messages in context: ${chatHistory.length}, ` +
            `Prompt tokens: ${result.promptTokens}, Generated: ${result.generatedTokens}`,
        );
        console.log(`    Total time: ${result.totalTimeMs} ms`);
        console.log(`    Prompt tokens/sec: ${result.promptTokensPerSec}`);
        console.log(`    Gen tokens/sec: ${result.generatedTokensPerSec}`);
      } catch (error) {
        console.error(`    ERROR: ${error.message}`);
        runFailed = true;
        break;
      }
    }

    // Broadcast test run complete
    this.onLog({ type: "stdout", text: `BENCHMARK_JSON:{"type":"test-run-complete","testRunId":${testRunId}}` });

    // Stop server
    await this.stopLlamaServer();

    if (runFailed) {
      this.errorCount++;
      console.log(
        `\n  === Test Run #${testRunId} FAILED (error ${this.errorCount}/${this.maxErrors}) ===`,
      );
      console.log("  Not enough successful messages to record results.");
      return;
    }

    // Calculate averages
    const totalPromptTokens = messageResults.reduce((s, r) => s + r.promptTokens, 0);
    const totalGeneratedTokens = messageResults.reduce((s, r) => s + r.generatedTokens, 0);
    const totalMs = messageResults.reduce((s, r) => s + r.totalTimeMs, 0);
    const avgPromptTokensPerSec = messageResults.reduce((s, r) => s + r.promptTokensPerSec, 0) / messageResults.length;
    const avgGenTokensPerSec = messageResults.reduce((s, r) => s + r.generatedTokensPerSec, 0) / messageResults.length;
    const avgMemUsed = messageResults.reduce((s, r) => s + r.mem.used, 0) / messageResults.length;

    const serverParams = getServerParamsSnapshot(this.configs, this.testState, this.gpuSelection);

    const testRunResult = {
      testRunId,
      contextLength: this.testState.contextLength,
      batchSize: this.testState.batchSize,
      uBatchSize: this.testState.uBatchSize,
      cacheRam: this.testState.cacheRam,
      gpuLayerOffload: this.testState.gpuLayerOffload,
      flashAttn: this.configs.server_params?.flash_attn?.enabled ? this.configs.server_params.flash_attn.value : null,
      reasoning: this.configs.server_params?.reasoning?.enabled ? this.configs.server_params.reasoning.value : null,
      temperature: this.configs.model_configs?.temp,
      topP: this.configs.model_configs?.top_p,
      minP: this.configs.model_configs?.min_p,
      topK: this.configs.model_configs?.top_k,
      layerSplit: this.configs.split_params?.layer_split?.enabled ? this.configs.split_params.layer_split.value : null,
      tensorSplit: this.configs.split_params?.tensor_split?.enabled ? this.tensorSplitValue : null,
      primaryGpu: this.configs.split_params?.primary_gpu?.enabled ? (this.gpuSelection?.enabled ? this.selectedGpus[0] : 0) : null,
      gpuSelection: this.gpuSelection?.enabled ? this.selectedGpus.slice() : [0],
      ropeScaling: this.configs.server_params?.rope_scaling?.enabled ? this.configs.server_params.rope_scaling.value : null,
      gpuLayers: this.configs.server_params?.gpu_layers?.enabled ? this.configs.server_params.gpu_layers.value : null,
      parallel: this.configs.server_params?.parallel?.enabled ? this.configs.server_params.parallel.value : null,
      env: serverParams.env,
      cmakeFlags: serverParams.cmakeFlags,
      messageResults,
      averages: {
        totalPromptTokens,
        totalGeneratedTokens,
        totalTimeMs: totalMs,
        avgPromptTokensPerSec: Math.round(avgPromptTokensPerSec * 100) / 100,
        avgGenTokensPerSec: Math.round(avgGenTokensPerSec * 100) / 100,
        avgMemUsed: Math.round(avgMemUsed * 100) / 100,
        avgMemTotal: mem.total,
      },
    };

    this.results.push(testRunResult);
    this.liveResults.push({
      testRunId,
      avgGenTokensPerSec: testRunResult.averages.avgGenTokensPerSec,
      avgPromptTokensPerSec: testRunResult.averages.avgPromptTokensPerSec,
      totalGenTokens: testRunResult.averages.totalGeneratedTokens,
      totalPromptTokens: testRunResult.averages.totalPromptTokens,
      totalTimeMs: testRunResult.averages.totalTimeMs,
      avgMemUsed: testRunResult.averages.avgMemUsed,
      avgMemTotal: testRunResult.averages.avgMemTotal,
    });

    // Store messages for this test run
    this.currentTestRunMessages = messageResults.map((msg) => ({
      messageIndex: msg.messageIndex,
      prompt: benchmarkMessages[msg.messageIndex - 1],
      response: msg.responseText,
      promptTokens: msg.promptTokens,
      generatedTokens: msg.generatedTokens,
      totalTimeMs: msg.totalTimeMs,
    }));
    this.benchmarkMessages.push({
      testRunId,
      messages: [...this.currentTestRunMessages],
    });

    // Broadcast results
    this.onStatus({
      status: "testing",
      testRun: testRunId,
      liveResults: this.liveResults,
    });
    this.onLog({
      type: "stdout",
      text: `BENCHMARK_JSON:{"type":"test-run-complete","testRunId":${testRunId},"messages":${JSON.stringify(this.benchmarkMessages.map((bm) => ({ testRunId: bm.testRunId, messages: bm.messages })))}}`,
    });

    // Print summary
    console.log(`\n  === Test Run #${testRunId} Summary ===`);
    console.log(`  Avg prompt tokens/sec: ${testRunResult.averages.avgPromptTokensPerSec}`);
    console.log(`  Avg gen tokens/sec:    ${testRunResult.averages.avgGenTokensPerSec}`);
    console.log(`  Total tokens:          ${testRunResult.averages.totalGeneratedTokens} (gen) / ${testRunResult.averages.totalPromptTokens} (prompt)`);
    console.log(`  Total time (all msgs): ${testRunResult.averages.totalTimeMs} ms`);
    console.log(`  Avg Mem Used (GB):     ${testRunResult.averages.avgMemUsed} / ${testRunResult.averages.avgMemTotal}`);

    // Advance configs for next iteration
    advanceConfig(this.configs, this.testState);

    return testRunResult;
  }

  saveReportInternal() {
    try {
      const { reportName, filePath } = saveReport(
        this.liveResults,
        this.configs,
        this.resultsFile,
        this.reportsDir,
      );
      console.log(`Report saved: ${filePath}`);
      return { reportName, filePath };
    } catch (err) {
      console.error(`Failed to save report: ${err.message}`);
      return null;
    }
  }
}

// ─── Convenience: build-only mode ────────────────────────────────────

/**
 * Run only the build phase (no benchmark tests).
 * Used by `index.js --build-only`.
 */
export async function runBuildOnly(configs, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const buildCores = configs.build_cores || 1;

  console.log("=== llama.cpp Build Only ===");
  console.log(`Root: ${rootDir}`);

  // Clone/pull
  const llamaDir = join(rootDir, "llama.cpp");
  if (isCloned(llamaDir)) {
    runPull(llamaDir);
  } else {
    runClone(llamaDir);
  }

  // Build
  if (!configs.skip_build) {
    const result = runBuild(llamaDir, buildCores, configs);
    if (!result.success) {
      console.error("Build failed:", result.detail);
      process.exit(1);
    }
  } else {
    console.log("Skipping build (--no-build flag set).");
  }

  const binaryPath = llamaDir + "/build/bin/llama-server";
  console.log("=".repeat(60));
  console.log("BUILD COMPLETE (build-only mode, skipping benchmark)");
  console.log("=".repeat(60));
  console.log(`Binary: ${binaryPath}`);
  console.log("=".repeat(60));
}
