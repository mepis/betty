import "dotenv/config";
import axios from "axios";
import fs from "fs";
import { spawn, exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configs = JSON.parse(
  fs.readFileSync(join(__dirname, "configs.json"), "utf8"),
);
const llamaUrl = `http://${configs.llama_host}:${configs.llama_port}`;

//--- CLI arguments ---
const cliSkipBuild = process.argv.includes("--no-build");
const cliBuildOnly = process.argv.includes("--build-only");
const skipBuild = cliSkipBuild || configs.skip_build;
const rootDir = __dirname;
const resultsFile = join(rootDir, "results.md");

//--- Benchmark messages (user-defined messages to fill context) ---
const benchmarkMessages = configs.benchmark_messages || [
  "Develop a design doc for a self-hosted tetris clone web-based game..",
  "Audit the design doc.",
  "Recommend optimizations.",
  "Create a social-media marketing campaign for it.",
];

//--- Configurable test parameters ---
const memTimer = 5000;
let isRunning = true;

//--- Error tracking ---
const maxErrors = 10;
let errorCount = 0;

//** GPU Selection */
const gpuSelection = configs.gpu_selection;
let selectedGpus = gpuSelection.enabled ? gpuSelection.gpus : [0];
const primaryGpu = selectedGpus[0];
const tensorSplitValue = selectedGpus.length > 1
  ? Array(selectedGpus.length).fill(Math.round(100 / selectedGpus.length)).join(",")
  : "0";
console.log(
  `GPU selection: ${gpuSelection.enabled ? `enabled [${selectedGpus.join(", ")}]` : "disabled (GPU 0)"}`,
);
console.log(
  `  Primary GPU: ${primaryGpu}`,
);
console.log(
  `  Tensor split: ${tensorSplitValue}`,
);

//** Build Params */
const buildParams = configs.build_make_params;
const peerBatchSize = buildParams.peer_batch_size;
const schedMaxCopies = configs.build_make_params.cuda_max_scheduled_copies;
const cudaCompression = configs.build_make_params.cuda_compression_level;
const cudaFp16 = configs.build_make_params.cuda_fp16;
const allQuants = configs.build_make_params.cuda_all_quants;

//** Run Params */
console.log(
  `Skip build: ${skipBuild} (config: ${configs.skip_build}, cli: ${cliSkipBuild})`,
);

// Test variables (Do not remove)
// (Do not remove comment) # common contet size windows: 16384, 32768, 65536, 131072, 262144, 524288
const testParams = configs.test_params;
let contextLength = testParams.context_length;
const contextLengthMultiplier = testParams.context_length_multiplier;
const contextLengthMax = testParams.context_length_max;

let gpuLayerOffload = testParams.gpu_layer_offload;
const gpuLayerOffloadStep = testParams.gpu_layer_offload_step;
const gpuLayerOffMax = testParams.gpu_layer_off_max;

let batchSize = testParams.batch_size;
const batchSizeStep = testParams.batch_size_step;
const batchSizeMax = testParams.batch_size_max;

let uBatchSize = testParams.u_batch_size;
const uBatchSizeStep = testParams.u_batch_size_step;
const uBatchSizeMax = testParams.u_batch_size_max;

let cacheRam = testParams.cache_ram;
const cacheRamStep = testParams.cache_ram_step;
const cacheRamMax = testParams.cache_ram_max;

// End Test variables ------------------------

//--- Server process reference ---
let serverProcess = null;

//--- Results storage ---
const results = [];

//--- Ensure no llama-server is running before we start ---
async function ensureNoLlamaServer() {
  return new Promise((resolve) => {
    exec("pgrep -f llama-server", (error, stdout) => {
      if (error || !stdout.trim()) {
        console.log("No existing llama-server found.");
        resolve();
        return;
      }

      const pids = stdout.trim().split("\n").filter(Boolean);
      console.log(
        `Found ${pids.length} existing llama-server process(es): ${pids.join(", ")}`,
      );
      console.log("Killing existing llama-server process(es)...");

      // SIGTERM first
      pids.forEach((pid) => {
        try {
          process.kill(parseInt(pid, 10), "SIGTERM");
        } catch {
          // already dead
        }
      });

      // Wait 2s, then SIGKILL anything still alive
      setTimeout(async () => {
        pids.forEach((pid) => {
          try {
            process.kill(parseInt(pid, 10), "SIGKILL");
          } catch {
            // already dead
          }
        });
        console.log("All existing llama-server processes killed.");

        // Wait for port to be free
        await waitForPortFree(configs.llama_port);
        console.log("Port is free. Proceeding.");
        resolve();
      }, 2000);
    });
  });
}

async function main() {
  console.log("=== llama.cpp Benchmark Starting ===");
  console.log(`Server URL: ${llamaUrl}`);
  console.log(`Model: ${configs.model_directory}/${configs.model}`);
  console.log(`Results file: ${resultsFile}`);

  // Wipe the report file on startup
  if (fs.existsSync(resultsFile)) {
    fs.writeFileSync(resultsFile, "");
    console.log(`Wiped existing results file: ${resultsFile}`);
  }

  // Kill any existing llama-server before proceeding
  await ensureNoLlamaServer();

  try {
    const initResult = await initController();
    if (!initResult.success) {
      return;
    }

    if (cliBuildOnly) {
      console.log("\n" + "=".repeat(60));
      console.log("BUILD COMPLETE (build-only mode, skipping benchmark)");
      console.log("=".repeat(60));
      console.log(`Binary: ${rootDir}/llama.cpp/build/bin/llama-server`);
      console.log("=".repeat(60));
      process.exit(0);
    }

    if (initResult.success) {
      while (isRunning) {
        const result = await runTestRun();
        if (errorCount >= maxErrors) {
          console.error(`\nReached ${maxErrors} errors. Stopping benchmark.`);
          isRunning = false;
        }
        // Write results after each test run for incremental reporting
        writeResultsToMarkdown();
        // Skip the "all variables at max" check if this run was aborted (configs not advanced)
        if (!result?.aborted && areAllVariablesAtMax()) {
          console.log(
            "\nAll test variables reached their maximum values. Benchmark complete.",
          );
          isRunning = false;
        }
      }
    } else {
      console.error("\n" + "=".repeat(60));
      console.error("BENCHMARK ABORTED");
      console.error("=".repeat(60));
      console.error(`Reason: ${initResult.reason}`);
      if (initResult.detail) {
        console.error(`\nDetail: ${initResult.detail}`);
      }
      console.error(
        "\nCheck the logs above for cmake, git clone, or build errors.",
      );
      console.error("=".repeat(60));
      process.exit(1);
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
    process.exit(1);
  }

  clearInterval(memTimerId);

  // Final cleanup: ensure llama-server is stopped
  await stopLlamaServer();

  // Final write of results (already written after last test run, but ensure it's up to date)
  writeResultsToMarkdown();
  console.log("Benchmark complete. Results saved to", resultsFile);
  process.exit(0);
}

//--- Config update: advance to next test configuration ---
function updateConfigs() {
  contextLength = Math.min(
    contextLength * contextLengthMultiplier,
    contextLengthMax,
  );
  gpuLayerOffload = Math.min(
    gpuLayerOffload + gpuLayerOffloadStep,
    gpuLayerOffMax,
  );
  batchSize = Math.min(batchSize + batchSizeStep, batchSizeMax);
  uBatchSize = Math.min(uBatchSize + uBatchSizeStep, uBatchSizeMax);
  cacheRam = Math.min(cacheRam + cacheRamStep, cacheRamMax);
}

//--- Check if all test variables have reached their maximum values ---
function areAllVariablesAtMax() {
  return (
    contextLength >= contextLengthMax &&
    gpuLayerOffload >= gpuLayerOffMax &&
    batchSize >= batchSizeMax &&
    uBatchSize >= uBatchSizeMax &&
    cacheRam >= cacheRamMax
  );
}

//--- Controller: init repo, build, then enter benchmark loop ---
async function initController() {
  const initResult = await init();
  if (!initResult.success) {
    return {
      success: false,
      reason: "Repository initialization failed",
      detail: initResult.detail,
    };
  }

  if (skipBuild && !cliBuildOnly) {
    console.log("Skipping llama.cpp build (--no-build flag set).");
  } else {
    const buildResult = await runBuild();
    if (!buildResult.success) {
      return {
        success: false,
        reason: "llama.cpp build failed",
        detail: buildResult.detail,
      };
    }
  }

  return { success: true, reason: null };
}

async function init() {
  try {
    const cloned = isCloned();
    if (cloned) {
      const result = await runPull();
      return { success: true, detail: "llama.cpp updated" };
    } else {
      const result = await runClone();
      return { success: true, detail: "llama.cpp cloned" };
    }
  } catch (error) {
    let msg = "Init failed";
    if (error instanceof Error) {
      msg = error.message;
    } else if (error && typeof error === "object") {
      msg = error.error || "Unknown error";
      if (error.stderr) {
        msg += `\n\n--- stderr ---\n${error.stderr}`;
      }
    }
    console.error("\n" + "=".repeat(60));
    console.error("INITIALIZATION FAILURE");
    console.error("=".repeat(60));
    console.error(msg);
    console.error("=".repeat(60));
    return { success: false, detail: msg };
  }
}

function isCloned() {
  try {
    const llamaDir = join(rootDir, "llama.cpp");
    const stat = fs.statSync(llamaDir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function runBuild() {
  try {
    const env = buildEnv();
    const buildCores = configs.build_cores;
    const buildDir = rootDir + "/llama.cpp";

    // Step 1: Configure with cmake
    const buildScript = getBuildScript();

    console.log("Running cmake build configuration...");
    console.log(`  Working directory: ${buildDir}`);
    console.log(`  Build cores: ${buildCores}`);
    console.log("  Build parameters:");
    for (const flag of buildScript.flags) {
      console.log(`    ${flag}`);
    }
    console.log(`  CMake command: ${buildScript.command}`);
    await runCommand(buildScript.command, {
      cwd: buildDir,
      env,
    });
    console.log("CMake configuration complete.");

    // Step 2: Build with make
    console.log("Building llama.cpp...");
    await runCommand(
      `cmake --build build --config Release -j ${buildCores} --clean-first`,
      { cwd: buildDir, env },
    );

    // Step 3: Verify the binary was built
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
    // error is either an Error object or { error: string, stderr: string } from runCommand
    let msg = "Build failed";
    if (error instanceof Error) {
      msg = error.message;
    } else if (error && typeof error === "object") {
      msg = error.error || "Unknown error";
      if (error.stderr) {
        msg += `\n\n--- Build stderr ---\n${error.stderr}`;
      }
    }
    console.error("\n" + "=".repeat(60));
    console.error("BUILD FAILURE");
    console.error("=".repeat(60));
    console.error(msg);
    console.error("=".repeat(60));
    return { success: false, detail: msg };
  }
}

async function runPull() {
  try {
    const llamaDir = rootDir + "/llama.cpp";
    console.log("Pulling latest llama.cpp...");
    const result = await runCommand("git stash && git pull", { cwd: llamaDir });
    console.log("llama.cpp updated successfully.");
    return result;
  } catch (error) {
    console.error("Pull failed:", error.error);
    return false;
  }
}

async function runClone() {
  try {
    console.log("Cloning llama.cpp repository...");
    const result = await runCommand(
      "git clone https://github.com/ggml-org/llama.cpp",
      { cwd: rootDir },
    );
    console.log("llama.cpp cloned successfully.");
    return result;
  } catch (error) {
    console.error("Clone failed:", error.error);
    return false;
  }
}

function runCommand(command, options = {}) {
  const { cwd, env } = options;
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 3600000, cwd, env }, (error, stdout, stderr) => {
      if (error) {
        const errorMsg = error.message;
        const stderrMsg = stderr ? stderr.trim() : "(no stderr output)";
        console.error(`Command failed: ${command}`);
        console.error(`  Error: ${errorMsg}`);
        console.error(`  Stderr: ${stderrMsg}`);
        return reject({ error: errorMsg, stderr: stderrMsg });
      }
      if (stderr) {
        // Log warnings but don't fail on non-error output
        const warningLines = stderr
          .split("\n")
          .filter(
            (l) =>
              l.toLowerCase().includes("warning") ||
              l.toLowerCase().includes("deprecated"),
          );
        if (warningLines.length > 0) {
          console.warn(`Command produced warnings:\n${stderr}`);
        }
      }
      resolve(stdout.trim());
    });
  });
}

//--- Environment variables for llama.cpp build ---
function buildEnv() {
  const ec = configs.export_configs || {};
  return {
    ...process.env,
    GGML_CUDA_ENABLE_UNIFIED_MEMORY: ec.GGML_CUDA_ENABLE_UNIFIED_MEMORY || "1",
    CUDA_SCALE_LAUNCH_QUEUES: ec.CUDA_SCALE_LAUNCH_QUEUES || "4x",
    LLAMA_CACHE: ec.LLAMA_CACHE || configs.llama_cache || "",
    CUDACXX: configs.cuda_configs?.cudacxx || "/usr/local/cuda/bin/nvcc",
    GGML_CUDA_P2P: ec.GGML_CUDA_P2P || "on",
    PATH: `/usr/local/cuda-${configs.cuda_configs?.cuda_version || "12.6"}/bin${process.env.PATH ? ":" + process.env.PATH : ""}`,
    LLAMA_ARG_FIT: ec.LLAMA_ARG_FIT || "on",
    LLAMA_ARG_FIT_TARGET: ec.LLAMA_ARG_FIT_TARGET || "256",
    LLAMA_ARG_FIT_CTX: ec.LLAMA_ARG_FIT_CTX || "131072",
  };
}

//--- Environment exports for llama.cpp runtime ---
function getExports() {
  const env = buildEnv();
  const ec = configs.export_configs || {};
  const exports = [
    `export GGML_CUDA_ENABLE_UNIFIED_MEMORY=${env.GGML_CUDA_ENABLE_UNIFIED_MEMORY}`,
    `export CUDA_SCALE_LAUNCH_QUEUES=${env.CUDA_SCALE_LAUNCH_QUEUES}`,
    `export LLAMA_CACHE=${env.LLAMA_CACHE}`,
    `export CUDACXX=${env.CUDACXX}`,
    `export GGML_CUDA_P2P=${env.GGML_CUDA_P2P}`,
    `export PATH=${env.PATH}`,
    `export LLAMA_ARG_FIT=${env.LLAMA_ARG_FIT}`,
    `export LLAMA_ARG_FIT_TARGET=${env.LLAMA_ARG_FIT_TARGET}`,
    `export LLAMA_ARG_FIT_CTX=${env.LLAMA_ARG_FIT_CTX}`,
  ];
  return exports.join(" && ");
}

//--- CMake build script with proper if/else (fixed fall-through) ---
function getBuildScript() {
  const flags = [];

  if (buildParams.enable_ccache) {
    flags.push(`-DGGML_CCACHE=1`);
  }
  if (buildParams.enable_lto) {
    flags.push(`-DGGML_LTO=1`);
  }
  if (buildParams.enable_cuda) {
    flags.push(`-DGGML_CUDA=1`);
  }
  if (buildParams.enable_cuda_fa) {
    flags.push(`-DGGML_CUDA_FA=1`);
  }
  if (buildParams.enable_cuda_graphs) {
    flags.push(`-DGGML_CUDA_GRAPHS=1`);
  }
  if (buildParams.enable_cuda_nccl) {
    flags.push(`-DGGML_CUDA_NCCL=1`);
  }
  if (buildParams.enable_cuda_per_max_batch_size) {
    flags.push(`-DGGML_CUDA_PEER_MAX_BATCH_SIZE=${peerBatchSize}`);
  }
  if (buildParams.enable_cuda_peer_copy) {
    flags.push(`-DGGML_CUDA_PEER_COPY=1`);
  }
  if (buildParams.enable_cuda_custom_arch) {
    flags.push(`-DCMAKE_CUDA_ARCHITECTURES="86-real;120-real"`);
  }
  if (buildParams.enable_cuda_fa_all_quants) {
    flags.push(`-DGGML_CUDA_FA_ALL_QUANTS=${allQuants}`);
  }
  if (buildParams.enable_cuda_fp16) {
    flags.push(`-DGGML_CUDA_FP16=${cudaFp16}`);
  }
  if (buildParams.enable_cuda_scheduled_max_copies) {
    flags.push(`-DGGML_SCHED_MAX_COPIES=${schedMaxCopies}`);
  }
  if (buildParams.enable_cuda_compression_level) {
    flags.push(`-DGGML_CUDA_COMPRESSION_LEVEL=${cudaCompression}`);
  }

  return {
    command: `cmake -B build -DCMAKE_BUILD_TYPE=Release ${flags.join(" ")}`,
    flags,
  };
}

//--- Build llama-server command line (no export prefix — env vars are set via spawn's env option) ---
function getRunScript() {
  const sp = configs.server_params;
  const sps = configs.split_params;
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
  if (sp.flash_attn.enabled) parts.push(`--flash-attn ${sp.flash_attn.value} `);
  if (sp.reasoning.enabled) parts.push(`--reasoning ${sp.reasoning.value} `);
  if (sp.profiling) parts.push(`-e `);
  if (sp.presence_penalty.enabled)
    parts.push(`--presence-penalty ${sp.presence_penalty.value} `);
  if (sp.reasoning_budget.enabled)
    parts.push(`--reasoning-budget ${sp.reasoning_budget.value} `);
  if (sp.reasoning_budget_message.enabled) {
    parts.push(
      `--reasoning-budget-message "${sp.reasoning_budget_message.value}" `,
    );
  }
  if (sp.rope_scaling.enabled)
    parts.push(`--rope-scaling ${sp.rope_scaling.value} `);
  if (sp.jinja) parts.push(`--jinja `);
  if (sp.parallel.enabled) parts.push(`--parallel ${sp.parallel.value} `);
  if (sps.layer_split.enabled)
    parts.push(`--split-mode ${sps.layer_split.value} `);
  if (sps.tensor_split.enabled)
    parts.push(`--tensor-split ${tensorSplitValue} `);
  if (sps.primary_gpu.enabled)
    parts.push(`--main-gpu ${primaryGpu} `);

  const sps2 = configs.spec_params;
  if (sps2.spec_type.enabled)
    parts.push(`--spec-type ${sps2.spec_type.value} `);
  if (sps2.spec_draft_n_max.enabled)
    parts.push(`--spec-draft-n-max ${sps2.spec_draft_n_max.value} `);

  return parts.join("");
}

//--- System memory helper ---
function getMem() {
  const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
  const match = meminfo.match(/MemTotal:\s+(\d+)/);
  const totalKb = parseInt(match[1], 10);
  const totalGb = Math.round(totalKb / 1024 / 1024);
  const matchFree = meminfo.match(/MemAvailable:\s+(\d+)/);
  const availKb = parseInt(matchFree[1], 10);
  const availGb = Math.round(availKb / 1024 / 1024);
  const usedMB = totalGb - availGb;
  const percentUsed = (usedMB / totalGb).toFixed(2);
  return {
    used: usedMB,
    total: totalGb,
    stat: (percentUsed * 100).toFixed(2),
  };
}

//--- Start llama-server as a child process (with retry on port binding failure) ---
async function startLlamaServer() {
  // Verify the binary exists
  const binaryPath = rootDir + "/llama.cpp/build/bin/llama-server";
  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `llama-server binary not found at ${binaryPath}. ` +
        "Run the benchmark again - it should build llama.cpp automatically on first run. " +
        "Check the build logs above for cmake/make errors.",
    );
  }

  const runCmd = getRunScript();
  console.log("Starting llama-server...");
  console.log(`  Binary: ${binaryPath}`);
  console.log(`  Command: ${runCmd.trim()}`);

  // Retry loop: llama-server may fail to bind if port is still in TIME_WAIT
  const maxStartRetries = 5;
  for (let attempt = 1; attempt <= maxStartRetries; attempt++) {
    if (attempt > 1) {
      console.log(`  Retry attempt ${attempt}/${maxStartRetries}...`);
      await new Promise((r) => setTimeout(r, 2000));
    }

    const started = await tryStartServer(runCmd, binaryPath);
    if (started) {
      console.log(`llama-server started successfully on attempt ${attempt}.`);
      return;
    }
  }

  throw new Error(
    `llama-server failed to start after ${maxStartRetries} attempts (port binding issue)`,
  );
}

//--- Attempt to start the server once; returns true if successful ---
function tryStartServer(runCmd, binaryPath) {
  return new Promise((resolve) => {
    const prevProcess = serverProcess;

    serverProcess = spawn(runCmd.trim(), {
      cwd: rootDir + "/llama.cpp/build/bin",
      env: {
        ...process.env,
        ...buildEnv(),
      },
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

    // If server dies within 3 seconds, it likely failed to bind the port
    const earlyDeathTimer = setTimeout(() => {
      // Server survived 3 seconds — it's up, now poll for health
      const maxHealthRetries = 120;
      let retries = 0;
      const pollInterval = setInterval(async () => {
        retries++;
        try {
          const resp = await axios.get(`${llamaUrl}/health`, { timeout: 3000 });
          if (resp.status === 200) {
            clearInterval(pollInterval);
            console.log(`llama-server ready after ${retries * 1} tries.`);
            resolve(true);
            return;
          }
        } catch {
          if (retries >= maxHealthRetries) {
            clearInterval(pollInterval);
            console.log("llama-server did not become ready, will retry.");
            resolve(false);
            return;
          }
        }
      }, 1000);
    }, 3000);

    serverProcess.on("close", (code) => {
      clearTimeout(earlyDeathTimer);
      // Check if the failure was a port binding issue
      if (code !== 0) {
        const hasBindError =
          output.includes("couldn't bind") ||
          output.includes("HTTP server error");
        if (hasBindError) {
          console.log(
            `llama-server failed to bind port (attempt ${output.split("\n").filter((l) => l.includes("couldn't bind")).length > 0 ? "port conflict" : "exit code " + code}). Will retry.`,
          );
        }
        resolve(false);
      }
    });

    serverProcess.on("error", (err) => {
      clearTimeout(earlyDeathTimer);
      resolve(false);
    });

    // If previous process exists, clean it up
    if (prevProcess && !prevProcess.killed) {
      prevProcess.kill("SIGKILL");
    }
  });
}

//--- Stop llama-server (safe to call multiple times) ---
async function stopLlamaServer() {
  if (!serverProcess) return;
  console.log("Stopping llama-server...");

  // Try graceful shutdown via /shutdown endpoint first
  try {
    await axios.post(`${llamaUrl}/shutdown`, null, { timeout: 3000 });
    console.log("llama-server stopped gracefully via /shutdown");
    // Wait for process to close
    await new Promise((resolve) => {
      serverProcess.on("close", () => {
        serverProcess = null;
        console.log("llama-server stopped.");
        resolve();
      });
      setTimeout(resolve, 3000);
    });
  } catch {
    // /shutdown failed or server already dead, fall back to signal
  }

  // If process is still alive, use SIGTERM -> SIGKILL
  if (serverProcess) {
    serverProcess.kill("SIGTERM");

    await new Promise((resolve) => {
      serverProcess.on("close", () => {
        serverProcess = null;
        console.log("llama-server stopped.");
        resolve();
      });
      // Force kill after 10 seconds
      setTimeout(() => {
        if (serverProcess) {
          serverProcess.kill("SIGKILL");
          serverProcess = null;
          console.log("llama-server force killed.");
        }
        resolve();
      }, 10000);
    });
  }

  // Wait for port to be truly free (no TIME_WAIT either)
  await waitForPortFree(configs.llama_port);
  console.log("llama-server stopped.");
}

//--- Wait for a TCP port to be fully free (no process bound, no TIME_WAIT) ---
function waitForPortFree(port, maxWaitMs = 15000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      exec(
        `ss -t state time-wait sport = :${port} 2>/dev/null || true`,
        (error, stdout) => {
          const hasTimeWait = stdout.trim().length > 0;
          if (!hasTimeWait) {
            // Also verify no process is bound
            exec(`lsof -i :${port} -t 2>/dev/null`, (error2) => {
              if (error2) {
                // No process bound and no TIME_WAIT — port is truly free
                resolve();
              } else {
                // Process still bound, kill it
                exec(
                  `kill -9 $(lsof -i :${port} -t 2>/dev/null)`,
                  (killErr) => {
                    console.warn(
                      `Warning: force-killed leftover process on port ${port}`,
                    );
                    setTimeout(resolve, 500);
                  },
                );
              }
            });
          } else if (Date.now() - start < maxWaitMs) {
            setTimeout(check, 500);
          } else {
            // Max wait exceeded — force kill anything on the port
            exec(`kill -9 $(lsof -i :${port} -t 2>/dev/null)`, (killErr) => {
              console.warn(
                `Warning: force-killed leftover process on port ${port} after timeout`,
              );
              resolve();
            });
          }
        },
      );
    };
    check();
  });
}

//--- Signal handlers: kill llama-server on process exit ---
process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM. Shutting down...");
  stopLlamaServer().then(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("\nReceived SIGINT. Shutting down...");
  stopLlamaServer().then(() => process.exit(0));
});

process.on("uncaughtException", (err) => {
  console.error("\nUncaught exception:", err.message);
  stopLlamaServer().then(() => process.exit(1));
});

//--- Send a chat request to the chat/completions endpoint and measure timing ---
async function sendChat(messages) {
  const startTime = Date.now();

  try {
    const payload = {
      messages: messages,
      n_ctx: contextLength,
      batch_size: batchSize,
      temperature: configs.model_configs.temp,
      top_p: configs.model_configs.top_p,
      min_p: configs.model_configs.min_p,
      top_k: configs.model_configs.top_k,
    };

    if (configs.server_params.n_predict.enabled)
      payload.n_predict = configs.server_params.n_predict.value;
    if (configs.server_params.n_keep.enabled)
      payload.n_keep = configs.server_params.n_keep.value;
    if (configs.server_params.cache_prompt.enabled)
      payload.cache_prompt = configs.server_params.cache_prompt.value;

    const resp = await axios.post(`${llamaUrl}/chat/completions`, payload, {
      timeout: 600000,
    });

    const endTime = Date.now();
    const totalTimeMs = endTime - startTime;

    const data = resp.data;

    // Extract the assistant's response text
    const responseText =
      data.choices?.[0]?.message?.content || "(no response content)";

    // Token counts: chat endpoint uses total_tokens + completion_tokens
    const promptTokens = data.usage?.prompt_tokens || 0;
    const generatedTokens = data.usage?.completion_tokens || 0;

    // Timing: chat endpoint uses timings.prompt_ms and timings.predicted_ms
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
      messageIndex: 0,
      prompt: messages[messages.length - 1].content,
      responseText,
      promptTokens,
      generatedTokens,
      totalTimeMs,
      promptTimeMs: promptTimeMs || totalTimeMs,
      predictedTimeMs: predictedTimeMs || 0,
      promptTokensPerSec: Math.round(promptTokensPerSec * 100) / 100,
      generatedTokensPerSec: Math.round(generatedTokensPerSec * 100) / 100,
      serverParams: getServerParamsSnapshot(),
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const errMsg = error.response
      ? `[${error.response.status}] ${error.response.statusText}`
      : error.message;
    throw new Error(`Chat request failed after ${elapsed}ms: ${errMsg}`);
  }
}

//--- Snapshot of server parameters for this test run ---
function getServerParamsSnapshot() {
  const sp = configs.server_params;
  const sps = configs.split_params;
  return {
    model: `${configs.model_directory}/${configs.model}`,
    host: configs.llama_host,
    port: configs.llama_port,
    contextLength,
    gpuLayerOffload,
    gpuLayers: sp.gpu_layers.enabled ? sp.gpu_layers.value : null,
    batchSize,
    uBatchSize,
    cacheRam,
    flashAttn: sp.flash_attn.enabled ? sp.flash_attn.value : null,
    reasoning: sp.reasoning.enabled ? sp.reasoning.value : null,
    temperature: configs.model_configs.temp,
    topP: configs.model_configs.top_p,
    minP: configs.model_configs.min_p,
    topK: configs.model_configs.top_k,
    layerSplit: sps.layer_split.enabled ? sps.layer_split.value : null,
    tensorSplit: sps.tensor_split.enabled ? tensorSplitValue : null,
    primaryGpu: sps.primary_gpu.enabled ? primaryGpu : null,
    gpuSelection: gpuSelection.enabled
      ? selectedGpus.slice()
      : [0],
    ropeScaling: sp.rope_scaling.enabled ? sp.rope_scaling.value : null,
    jinja: sp.jinja ? true : null,
    parallel: sp.parallel.enabled ? sp.parallel.value : null,
    contBatching: sp.cont_batching ? true : null,
    presencePenalty: sp.presence_penalty.enabled
      ? sp.presence_penalty.value
      : null,
    reasoningBudget: sp.reasoning_budget.enabled
      ? sp.reasoning_budget.value
      : null,
    reasoningBudgetMessage: sp.reasoning_budget_message.enabled
      ? sp.reasoning_budget_message.value
      : null,
    env: buildEnv(),
    cmakeFlags: getCmakeFlagsSnapshot(),
  };
}

function getCmakeFlagsSnapshot() {
  const flags = {};
  const bp = buildParams;
  if (bp.enable_ccache) flags.GGML_CCACHE = "1";
  if (bp.enable_lto) flags.GGML_LTO = "1";
  if (bp.enable_cuda) flags.GGML_CUDA = "1";
  if (bp.enable_cuda_fa) flags.GGML_CUDA_FA = "1";
  if (bp.enable_cuda_graphs) flags.GGML_CUDA_GRAPHS = "1";
  if (bp.enable_cuda_nccl) flags.GGML_CUDA_NCCL = "1";
  if (bp.enable_cuda_per_max_batch_size)
    flags.GGML_CUDA_PEER_MAX_BATCH_SIZE = peerBatchSize;
  if (bp.enable_cuda_peer_copy) flags.GGML_CUDA_PEER_COPY = "1";
  if (bp.enable_cuda_custom_arch)
    flags.CMAKE_CUDA_ARCHITECTURES = "86-real;120-real";
  if (bp.enable_cuda_fa_all_quants) flags.GGML_CUDA_FA_ALL_QUANTS = allQuants;
  if (bp.enable_cuda_fp16) flags.GGML_CUDA_FP16 = cudaFp16;
  if (bp.enable_cuda_scheduled_max_copies)
    flags.GGML_SCHED_MAX_COPIES = schedMaxCopies;
  if (bp.enable_cuda_compression_level)
    flags.GGML_CUDA_COMPRESSION_LEVEL = cudaCompression;
  return flags;
}

//--- Run one full test iteration: 4 messages, then stop server, update configs ---
async function runTestRun() {
  const testRunId = results.length + 1;
  console.log(`\n========== Test Run #${testRunId} ==========`);
  console.log(
    `  Context: ${contextLength}, Batch: ${batchSize}, UBatch: ${uBatchSize}, Cache: ${cacheRam} GB`,
  );
  console.log(`  GPU Offload: ${gpuLayerOffload}`);

  // Check system memory before starting the test
  const mem = getMem();
  if (parseFloat(mem.stat) >= configs.max_sys_mem) {
    console.log(
      `  ABORTED: System memory at ${mem.stat}% (${mem.used}GB/${mem.total}GB) exceeds threshold of ${configs.max_sys_mem}%`,
    );
    const abortedResult = {
      testRunId,
      contextLength,
      batchSize,
      uBatchSize,
      cacheRam,
      gpuLayerOffload,
      aborted: true,
      abortReason: `System memory at ${mem.stat}% (${mem.used}GB/${mem.total}GB) exceeds threshold of ${configs.max_sys_mem}%`,
    };
    results.push(abortedResult);
    return { aborted: true };
  }

  // Ensure no leftover llama-server from previous run before starting a new one
  await ensureNoLlamaServer();

  // Start server
  try {
    await startLlamaServer();
  } catch (error) {
    errorCount++;
    console.error(
      `\nTest Run #${testRunId} failed (error ${errorCount}/${maxErrors}): ${error.message}`,
    );
    console.error("Skipping this test run. Check the error above for details.");
    return;
  }

  const messageResults = [];
  const chatHistory = []; // Accumulated messages for chat-style requests

  // Send 4 messages sequentially, accumulating prior messages each turn
  let runFailed = false;
  for (let i = 0; i < benchmarkMessages.length; i++) {
    console.log(`\n  --- Message ${i + 1}/${benchmarkMessages.length} ---`);
    try {
      // Add the user's message to the chat history
      chatHistory.push({ role: "user", content: benchmarkMessages[i] });

      // Send all accumulated messages to the chat endpoint
      const result = await sendChat(chatHistory);
      result.messageIndex = i + 1;
      result.totalMessagesInContext = chatHistory.length;
      result.mem = getMem();
      messageResults.push(result);

      // Add the assistant's response to the chat history for the next turn
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

  // Stop server
  await stopLlamaServer();

  // Skip results collection if run failed
  if (runFailed) {
    errorCount++;
    console.log(
      `\n  === Test Run #${testRunId} FAILED (error ${errorCount}/${maxErrors}) ===`,
    );
    console.log("  Not enough successful messages to record results.");
    return;
  }

  // Calculate averages for this test run
  const totalPromptTokens = messageResults.reduce(
    (s, r) => s + r.promptTokens,
    0,
  );
  const totalGeneratedTokens = messageResults.reduce(
    (s, r) => s + r.generatedTokens,
    0,
  );
  const totalMs = messageResults.reduce((s, r) => s + r.totalTimeMs, 0);
  const avgPromptTokensPerSec =
    messageResults.reduce((s, r) => s + r.promptTokensPerSec, 0) /
    messageResults.length;
  const avgGenTokensPerSec =
    messageResults.reduce((s, r) => s + r.generatedTokensPerSec, 0) /
    messageResults.length;
  const avgMemUsed =
    messageResults.reduce((s, r) => s + r.mem.used, 0) / messageResults.length;

  const sp = configs.server_params;
  const sps = configs.split_params;
  const testRunResult = {
    testRunId,
    contextLength,
    batchSize,
    uBatchSize,
    cacheRam,
    gpuLayerOffload,
    flashAttn: sp.flash_attn.enabled ? sp.flash_attn.value : null,
    reasoning: sp.reasoning.enabled ? sp.reasoning.value : null,
    temperature: configs.model_configs.temp,
    topP: configs.model_configs.top_p,
    minP: configs.model_configs.min_p,
    topK: configs.model_configs.top_k,
    layerSplit: sps.layer_split.enabled ? sps.layer_split.value : null,
    tensorSplit: sps.tensor_split.enabled ? tensorSplitValue : null,
    primaryGpu: sps.primary_gpu.enabled ? primaryGpu : null,
    gpuSelection: gpuSelection.enabled
      ? selectedGpus.slice()
      : [0],
    ropeScaling: sp.rope_scaling.enabled ? sp.rope_scaling.value : null,
    gpuLayers: sp.gpu_layers.enabled ? sp.gpu_layers.value : null,
    parallel: sp.parallel.enabled ? sp.parallel.value : null,
    env: getServerParamsSnapshot().env,
    cmakeFlags: getCmakeFlagsSnapshot(),
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

  results.push(testRunResult);

  // Print summary for this run
  console.log(`\n  === Test Run #${testRunId} Summary ===`);
  console.log(
    `  Avg prompt tokens/sec: ${testRunResult.averages.avgPromptTokensPerSec}`,
  );
  console.log(
    `  Avg gen tokens/sec:    ${testRunResult.averages.avgGenTokensPerSec}`,
  );
  console.log(
    `  Total tokens:          ${testRunResult.averages.totalGeneratedTokens} (gen) / ${testRunResult.averages.totalPromptTokens} (prompt)`,
  );
  console.log(
    `  Total time (all msgs): ${testRunResult.averages.totalTimeMs} ms`,
  );
  console.log(
    `  Avg Mem Used (GB):     ${testRunResult.averages.avgMemUsed} / ${testRunResult.averages.avgMemTotal}`,
  );

  // Update configs for next iteration
  updateConfigs();
}

//--- Write all results to a markdown file ---
function writeResultsToMarkdown() {
  let md = "# llama.cpp Benchmark Results\n\n";
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `Model: ${configs.model_directory}/${configs.model}\n\n`;
  md += `---\n\n`;

  // Table 1: Per-message results
  md += "## Per-Message Results\n\n";
  md +=
    "| Test Run | Message | Context Len | Messages in Context | Prompt Tokens | Generated Tokens | Total Time (ms) | Prompt Tokens/sec | Gen Tokens/sec | Memory (GB) |\n";
  md +=
    "|----------|---------|-------------|---------------------|---------------|------------------|-----------------|-------------------|----------------|-------------|\n";

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
  md +=
    "| Test Run | Context | Batch | UBatch | Cache (GB) | GPU Layers | Avg Prompt Tok/s | Avg Gen Tok/s | Total Prompt Toks | Total Gen Toks | Total Time (ms) | Mem (GB) |\n";
  md +=
    "|----------|---------|-------|--------|------------|------------|------------------|---------------|-------------------|----------------|-----------------|----------|\n";

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
  md +=
    "| Test Run | GPUs | Temp | Top-P | Min-P | Top-K | Flash-Attn | Reasoning | Rope Scaling | Split Mode | Tensor Split | Main GPU | Parallel |\n";
  md +=
    "|----------|------|------|-------|-------|-------|------------|-----------|--------------|------------|--------------|----------|----------|\n";

  for (const run of results) {
    md += `| ${run.testRunId} | ${run.gpuSelection?.join(",") || "0"} | ${run.temperature} | ${run.topP} | ${run.minP} | ${run.topK} | ${run.flashAttn} | ${run.reasoning} | ${run.ropeScaling} | ${run.layerSplit} | ${run.tensorSplit} | ${run.primaryGpu} | ${run.parallel} |\n`;
  }

  md += "\n";

  // Table 4: CMake build flags per test run
  md += "## CMake Build Flags\n\n";
  md +=
    "| Test Run | GGML_CUDA | GGML_CUDA_GRAPHS | GGML_CUDA_FA | GGML_CUDA_FP16 | GGML_CUDA_PEER_MAX_BATCH_SIZE | GGML_SCHED_MAX_COPIES | GGML_CUDA_COMPRESSION_LEVEL | GGML_LTO | GGML_CCACHE |\n";
  md +=
    "|----------|-----------|------------------|--------------|----------------|-------------------------------|-----------------------|-----------------------------|----------|-------------|\n";

  for (const run of results) {
    const f = run.cmakeFlags;
    md += `| ${run.testRunId} | ${f.GGML_CUDA || ""} | ${f.GGML_CUDA_GRAPHS || ""} | ${f.GGML_CUDA_FA || ""} | ${f.GGML_CUDA_FP16 || ""} | ${f.GGML_CUDA_PEER_MAX_BATCH_SIZE || ""} | ${f.GGML_SCHED_MAX_COPIES || ""} | ${f.GGML_CUDA_COMPRESSION_LEVEL || ""} | ${f.GGML_LTO || ""} | ${f.GGML_CCACHE || ""} |\n`;
  }

  md += "\n";

  // Table 5: Environment variables per test run
  md += "## Environment Variables\n\n";
  md +=
    "| Test Run | GGML_CUDA_ENABLE_UNIFIED_MEMORY | CUDA_SCALE_LAUNCH_QUEUES | LLAMA_CACHE | GGML_CUDA_P2P | LLAMA_ARG_FIT | LLAMA_ARG_FIT_TARGET | LLAMA_ARG_FIT_CTX |\n";
  md +=
    "|----------|---------------------------------|--------------------------|-------------|---------------|---------------|----------------------|---------------------|\n";

  for (const run of results) {
    const e = run.env;
    md += `| ${run.testRunId} | ${e.GGML_CUDA_ENABLE_UNIFIED_MEMORY} | ${e.CUDA_SCALE_LAUNCH_QUEUES} | ${e.LLAMA_CACHE} | ${e.GGML_CUDA_P2P} | ${e.LLAMA_ARG_FIT} | ${e.LLAMA_ARG_FIT_TARGET} | ${e.LLAMA_ARG_FIT_CTX} |\n`;
  }

  md += "\n---\n*Generated by llama.cpp benchmark tool*\n";

  fs.writeFileSync(resultsFile, md);
  console.log(`Results written to ${resultsFile}`);
}

main();
