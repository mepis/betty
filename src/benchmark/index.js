import "dotenv/config";
import axios from "axios";
import fs from "fs";
import { spawn, exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configs = JSON.parse(fs.readFileSync(join(__dirname, "configs.json"), "utf8"));
const llamaUrl = `http://${configs.llama_host}:${configs.llama_port}`;
const rootDir = __dirname;
const resultsFile = join(rootDir, "results.md");

//--- Benchmark messages (4 user-defined messages to fill context) ---
const benchmarkMessages = [
  "Summarize the key points of quantum computing and its implications for modern cryptography. Include a discussion of Shor's algorithm and Grover's algorithm, and explain how each affects RSA and ECC encryption schemes. Provide a timeline of when quantum computers might be capable of breaking these systems.",
  "Write a comprehensive analysis of the economic impact of renewable energy adoption across G20 nations from 2010 to 2025. Cover solar, wind, hydroelectric, and geothermal energy sources. Include data on job creation, GDP impact, infrastructure investment, and the transition challenges for fossil fuel-dependent economies.",
  "Explain the current state of artificial intelligence research as of 2026, covering transformer architectures, multimodal models, reasoning capabilities, and the ongoing debate about AGI timelines. Discuss the role of reinforcement learning from human feedback (RLHF), constitutional AI, and the latest advances in large language model scaling laws. Include perspectives from both optimistic and cautious researchers.",
  "Provide a detailed technical comparison of the top five open-source large language models as of mid-2026. Cover model architecture, training data size, parameter count, inference speed, memory requirements, benchmark scores (MMLU, GSM8K, HumanEval), license terms, and recommended use cases. Include both dense and Mixture-of-Experts (MoE) models.",
];

//--- Configurable test parameters ---
const memTimer = 5000;
let isRunning = true;

//** Build Params */
const peerBatchSize = configs.build_make_params.peer_batch_size;
const schedMaxCopies = configs.build_make_params.cuda_max_scheduled_copies;
const cudaCompression = configs.build_make_params.cuda_compression_level;
const cudaFp16 = configs.build_make_params.cuda_fp16;
const allQuants = configs.build_make_params.cuda_all_quants;

//** Run Params */
let contextLength = 32768;
const contextLengthMultiplier = 2;

let gpuLayerOffload = 999;
const gpuLayerOffloadStep = 0;

let batchSize = 128;
const batchSizeStep = 128;

let uBatchSize = 64;
const uBatchSizeStep = 64;

let cacheRam = 4096;
const cacheRamStep = 1024;

let flashAttn = 1;
let reasoning = 1;

const memTimerId = setInterval(async () => {
  const mem = getMem();
  console.log(`${mem.used} of ${mem.total} GB memory utilization (${mem.stat}%)`);
}, memTimer);

//--- Server process reference ---
let serverProcess = null;

//--- Results storage ---
const results = [];

async function main() {
  console.log("=== llama.cpp Benchmark Starting ===");
  console.log(`Server URL: ${llamaUrl}`);
  console.log(`Model: ${configs.model_directory}/${configs.model}`);
  console.log(`Results file: ${resultsFile}`);

  const ready = await initController();
  if (ready) {
    while (isRunning) {
      await runTestRun();
    }
  }

  clearInterval(memTimerId);
  writeResultsToMarkdown();
  console.log("Benchmark complete. Results saved to", resultsFile);
  process.exit(0);
}

//--- Config update: advance to next test configuration ---
function updateConfigs() {
  contextLength = contextLength * contextLengthMultiplier;
  gpuLayerOffload = gpuLayerOffload + gpuLayerOffloadStep;
  batchSize = batchSize + batchSizeStep;
  uBatchSize = uBatchSize + uBatchSizeStep;
  cacheRam = cacheRam + cacheRamStep;
}

//--- Controller: init repo, build, then enter benchmark loop ---
async function initController() {
  const didInit = await init();
  if (!didInit) return false;

  const isBuilt = await runBuild();
  if (!isBuilt) return false;

  return true;
}

async function init() {
  try {
    const cloned = isCloned();
    if (cloned) {
      return await runPull();
    } else {
      return await runClone();
    }
  } catch (error) {
    console.error("Init failed:", error);
    return false;
  }
}

function isCloned() {
  try {
    const dirs = fs.readdirSync(rootDir);
    return dirs.some((d) => d === "llama.cpp");
  } catch {
    return false;
  }
}

async function runBuild() {
  try {
    const exports = getExports();
    const buildScript = getBuildScript();
    const cmakeCommand = `${exports} && cd ${rootDir}/llama.cpp && ${buildScript}`;

    console.log("Running cmake build configuration...");
    const cmakeResult = await runCommand(cmakeCommand);
    if (!cmakeResult) {
      throw new Error("CMake configuration failed");
    }

    const buildCores = configs.build_make_params.build_cores;
    const buildBin = `cmake --build llama.cpp/build --config Release -j ${buildCores} --clean-first`;
    console.log("Building llama.cpp...");
    const buildResult = await runCommand(buildBin);
    if (!buildResult) {
      throw new Error("Build failed");
    }

    console.log("llama.cpp build complete.");
    return true;
  } catch (error) {
    console.error("Build failure:", error.message);
    return false;
  }
}

async function runPull() {
  try {
    const command = `cd ${rootDir}/llama.cpp && git stash && git pull`;
    console.log("Pulling latest llama.cpp...");
    return await runCommand(command);
  } catch (error) {
    console.error("Pull failed:", error.message);
    return false;
  }
}

async function runClone() {
  try {
    console.log("Cloning llama.cpp repository...");
    const command = `cd ${rootDir} && git clone https://github.com/ggml-org/llama.cpp`;
    return await runCommand(command);
  } catch (error) {
    console.error("Clone failed:", error.message);
    return false;
  }
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 3600000 }, (error, stdout, stderr) => {
      if (error) return reject({ error: error.message, stderr });
      resolve(stdout.trim());
    });
  });
}

//--- Environment exports for llama.cpp ---
function getExports() {
  const exports = [
    `export GGML_CUDA_ENABLE_UNIFIED_MEMORY=1`,
    `export CUDA_SCALE_LAUNCH_QUEUES=4x`,
    `export LLAMA_CACHE=${configs.llama_cache}`,
    `export CUDACXX=$(which nvcc)`,
    `export GGML_CUDA_P2P=on`,
    `export PATH=/usr/local/cuda-${configs.cuda_configs.cuda_version}/bin${process.env.PATH ? ":" + process.env.PATH : ""}`,
    `export LLAMA_ARG_FIT=on`,
    `export LLAMA_ARG_FIT_TARGET=256`,
    `export LLAMA_ARG_FIT_CTX=131072`,
  ];
  return exports.join(" && ");
}

//--- CMake build script with proper if/else (fixed fall-through) ---
function getBuildScript() {
  let make = `cmake -B build`;

  if (configs.build_make_params.enable_ccache) {
    make += ` -DGGML_CCACHE=1`;
  }
  if (configs.build_make_params.enable_lto) {
    make += ` -DGGML_LTO=1`;
  }
  if (configs.build_make_params.enable_cuda) {
    make += ` -DGGML_CUDA=1`;
  }
  if (configs.build_make_params.enable_cuda_fa) {
    make += ` -DGGML_CUDA_FA=1`;
  }
  if (configs.build_make_params.enable_cuda_graphs) {
    make += ` -DGGML_CUDA_GRAPHS=1`;
  }
  if (configs.build_make_params.enable_cuda_nccl) {
    make += ` -DGGML_CUDA_NCCL=1`;
  }
  if (configs.build_make_params.enable_cuda_per_max_batch_size) {
    make += ` -DGGML_CUDA_PEER_MAX_BATCH_SIZE=${peerBatchSize}`;
  }
  if (configs.build_make_params.enable_cuda_peer_copy) {
    make += ` -DGGML_CUDA_PEER_COPY=1`;
  }
  if (configs.build_make_params.enable_cuda_custom_arch) {
    make += ` -DCMAKE_CUDA_ARCHITECTURES="86-real;120-real"`;
  }
  if (configs.build_make_params.enable_cuda_fa_all_quants) {
    make += ` -DGGML_CUDA_FA_ALL_QUANTS=${allQuants}`;
  }
  if (configs.build_make_params.enable_cuda_fp16) {
    make += ` -DGGML_CUDA_FP16=${cudaFp16}`;
  }
  if (configs.build_make_params.enable_cuda_scheduled_max_copies) {
    make += ` -DGGML_SCHED_MAX_COPIES=${schedMaxCopies}`;
  }
  if (configs.build_make_params.enable_cuda_compression_level) {
    make += ` -DGGML_CUDA_COMPRESSION_LEVEL=${cudaCompression}`;
  }

  return make;
}

//--- Build llama-server command line ---
function getRunScript() {
  const exports = getExports();
  const run = `${exports} ./llama-server -m ${configs.model_directory}/${configs.model} `
    + `--port ${configs.llama_port} --host ${configs.llama_host} `
    + `-c ${contextLength} -ngl ${gpuLayerOffload} `
    + `--cont-batching --temp ${configs.model_configs.temp} `
    + `--top-p ${configs.model_configs.top_p} --min-p ${configs.model_configs.min_p} `
    + `--top-k ${configs.model_configs.top_k} `
    + `--batch-size ${batchSize} --ubatch-size ${uBatchSize} `
    + `--flash-attn ${flashAttn} --reasoning ${reasoning} `
    + `--split-mode ${configs.layer_split} `
    + `--tensor-split ${configs.tensor_split} `
    + `--main-gpu ${configs.primary_gpu} -e `
    + `--presence-penalty 0.0 `
    + `--reasoning-budget 2048 --reasoning-budget-message "Proceed to final answer." `
    + `--cache-ram ${cacheRam} `
    + `--rope-scaling yarn --jinja --parallel 1`;
  return run;
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
    stat: percentUsed * 100,
  };
}

//--- Start llama-server as a child process ---
function startLlamaServer() {
  return new Promise((resolve, reject) => {
    const exports = getExports();
    const runCmd = getRunScript();

    // Parse the command into executable and args
    const parts = runCmd.replace(/^export .+ && /, "").trim();
    const execPath = parts.split(" ")[0];
    const args = parts.split(" ").slice(1);

    console.log("Starting llama-server...");
    console.log(`  Command: ${execPath} ${args.join(" ")}`);

    serverProcess = spawn(execPath, args, {
      env: {
        ...process.env,
        GGML_CUDA_ENABLE_UNIFIED_MEMORY: "1",
        CUDA_SCALE_LAUNCH_QUEUES: "4x",
        LLAMA_CACHE: configs.llama_cache,
        GGML_CUDA_P2P: "on",
        LLAMA_ARG_FIT: "on",
        LLAMA_ARG_FIT_TARGET: "256",
        LLAMA_ARG_FIT_CTX: "131072",
      },
      stdio: ["pipe", "pipe", "pipe"],
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

    serverProcess.on("error", (err) => {
      reject(new Error(`Failed to start llama-server: ${err.message}`));
    });

    serverProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`llama-server exited with code ${code}`));
      }
    });

    // Wait for server to be ready by polling the health endpoint
    const maxRetries = 120;
    let retries = 0;
    const pollInterval = setInterval(async () => {
      retries++;
      try {
        const resp = await axios.get(`${llamaUrl}/health`, { timeout: 3000 });
        if (resp.status === 200) {
          clearInterval(pollInterval);
          console.log(`llama-server ready after ${retries * 1} tries.`);
          resolve();
          return;
        }
      } catch {
        if (retries >= maxRetries) {
          clearInterval(pollInterval);
          reject(new Error("llama-server did not become ready within timeout"));
        }
      }
    }, 1000);
  });
}

//--- Stop llama-server ---
function stopLlamaServer() {
  return new Promise((resolve) => {
    if (serverProcess) {
      console.log("Stopping llama-server...");
      serverProcess.kill("SIGTERM");
      serverProcess.on("close", () => {
        serverProcess = null;
        console.log("llama-server stopped.");
        resolve();
      });
      // Force kill after 5 seconds
      setTimeout(() => {
        if (serverProcess) {
          serverProcess.kill("SIGKILL");
          serverProcess = null;
          console.log("llama-server force killed.");
          resolve();
        }
      }, 5000);
    } else {
      resolve();
    }
  });
}

//--- Send a single message to the completion endpoint and measure timing ---
async function sendCompletion(prompt) {
  const startTime = Date.now();

  const payload = {
    prompt: prompt,
    n_predict: 512,
    n_keep: 0,
    temperature: configs.model_configs.temp,
    top_p: configs.model_configs.top_p,
    min_p: configs.model_configs.min_p,
    top_k: configs.model_configs.top_k,
    stream: false,
    cache_prompt: true,
    n_ctx: contextLength,
    batch_size: batchSize,
  };

  const resp = await axios.post(`${llamaUrl}/completion`, payload, {
    timeout: 600000,
  });

  const endTime = Date.now();
  const totalTimeMs = endTime - startTime;

  const data = resp.data;
  const promptTokens = data.n_prompt_tokens || 0;
  const generatedTokens = data.n_tokens_predicted || data.n_predict || 0;
  const promptTimeMs = data.timings?.prompt_ms || 0;
  const predictedTimeMs = data.timings?.predicted_ms || 0;

  const promptTokensPerSec = promptTokens > 0 && promptTimeMs > 0
    ? (promptTokens / promptTimeMs) * 1000
    : 0;
  const generatedTokensPerSec = generatedTokens > 0 && predictedTimeMs > 0
    ? (generatedTokens / predictedTimeMs) * 1000
    : 0;

  return {
    messageIndex: 0,
    prompt,
    promptTokens,
    generatedTokens,
    totalTimeMs,
    promptTimeMs: promptTimeMs || totalTimeMs,
    predictedTimeMs: predictedTimeMs || 0,
    promptTokensPerSec: Math.round(promptTokensPerSec * 100) / 100,
    generatedTokensPerSec: Math.round(generatedTokensPerSec * 100) / 100,
    serverParams: getServerParamsSnapshot(),
  };
}

//--- Snapshot of server parameters for this test run ---
function getServerParamsSnapshot() {
  return {
    model: `${configs.model_directory}/${configs.model}`,
    host: configs.llama_host,
    port: configs.llama_port,
    contextLength,
    gpuLayerOffload,
    batchSize,
    uBatchSize,
    cacheRam,
    flashAttn,
    reasoning,
    temperature: configs.model_configs.temp,
    topP: configs.model_configs.top_p,
    minP: configs.model_configs.min_p,
    topK: configs.model_configs.top_k,
    layerSplit: configs.layer_split,
    tensorSplit: configs.tensor_split,
    primaryGpu: configs.primary_gpu,
    ropeScaling: "yarn",
    jinja: true,
    parallel: 1,
    contBatching: true,
    presencePenalty: 0.0,
    reasoningBudget: 2048,
    reasoningBudgetMessage: "Proceed to final answer.",
    env: {
      GGML_CUDA_ENABLE_UNIFIED_MEMORY: "1",
      CUDA_SCALE_LAUNCH_QUEUES: "4x",
      LLAMA_CACHE: configs.llama_cache,
      GGML_CUDA_P2P: "on",
      LLAMA_ARG_FIT: "on",
      LLAMA_ARG_FIT_TARGET: "256",
      LLAMA_ARG_FIT_CTX: "131072",
    },
    cmakeFlags: getCmakeFlagsSnapshot(),
  };
}

function getCmakeFlagsSnapshot() {
  const flags = {};
  const bp = configs.build_make_params;
  if (bp.enable_ccache) flags.GGML_CCACHE = "1";
  if (bp.enable_lto) flags.GGML_LTO = "1";
  if (bp.enable_cuda) flags.GGML_CUDA = "1";
  if (bp.enable_cuda_fa) flags.GGML_CUDA_FA = "1";
  if (bp.enable_cuda_graphs) flags.GGML_CUDA_GRAPHS = "1";
  if (bp.enable_cuda_nccl) flags.GGML_CUDA_NCCL = "1";
  if (bp.enable_cuda_per_max_batch_size) flags.GGML_CUDA_PEER_MAX_BATCH_SIZE = peerBatchSize;
  if (bp.enable_cuda_peer_copy) flags.GGML_CUDA_PEER_COPY = "1";
  if (bp.enable_cuda_custom_arch) flags.CMAKE_CUDA_ARCHITECTURES = "86-real;120-real";
  if (bp.enable_cuda_fa_all_quants) flags.GGML_CUDA_FA_ALL_QUANTS = allQuants;
  if (bp.enable_cuda_fp16) flags.GGML_CUDA_FP16 = cudaFp16;
  if (bp.enable_cuda_scheduled_max_copies) flags.GGML_SCHED_MAX_COPIES = schedMaxCopies;
  if (bp.enable_cuda_compression_level) flags.GGML_CUDA_COMPRESSION_LEVEL = cudaCompression;
  return flags;
}

//--- Run one full test iteration: 4 messages, then stop server, update configs ---
async function runTestRun() {
  const testRunId = results.length + 1;
  console.log(`\n========== Test Run #${testRunId} ==========`);
  console.log(`  Context: ${contextLength}, Batch: ${batchSize}, UBatch: ${uBatchSize}, Cache: ${cacheRam} GB`);
  console.log(`  GPU Offload: ${gpuLayerOffload}`);

  // Start server
  await startLlamaServer();

  const messageResults = [];

  // Send 4 messages sequentially
  for (let i = 0; i < benchmarkMessages.length; i++) {
    console.log(`\n  --- Message ${i + 1}/${benchmarkMessages.length} ---`);
    const result = await sendCompletion(benchmarkMessages[i]);
    result.messageIndex = i + 1;
    messageResults.push(result);

    console.log(`    Prompt tokens: ${result.promptTokens}, Generated: ${result.generatedTokens}`);
    console.log(`    Total time: ${result.totalTimeMs} ms`);
    console.log(`    Prompt tokens/sec: ${result.promptTokensPerSec}`);
    console.log(`    Gen tokens/sec: ${result.generatedTokensPerSec}`);
  }

  // Stop server
  await stopLlamaServer();

  // Calculate averages for this test run
  const totalPromptTokens = messageResults.reduce((s, r) => s + r.promptTokens, 0);
  const totalGeneratedTokens = messageResults.reduce((s, r) => s + r.generatedTokens, 0);
  const totalMs = messageResults.reduce((s, r) => s + r.totalTimeMs, 0);
  const avgPromptTokensPerSec = messageResults.reduce((s, r) => s + r.promptTokensPerSec, 0) / messageResults.length;
  const avgGenTokensPerSec = messageResults.reduce((s, r) => s + r.generatedTokensPerSec, 0) / messageResults.length;

  const testRunResult = {
    testRunId,
    contextLength,
    batchSize,
    uBatchSize,
    cacheRam,
    gpuLayerOffload,
    flashAttn,
    reasoning,
    temperature: configs.model_configs.temp,
    topP: configs.model_configs.top_p,
    minP: configs.model_configs.min_p,
    topK: configs.model_configs.top_k,
    layerSplit: configs.layer_split,
    tensorSplit: configs.tensor_split,
    primaryGpu: configs.primary_gpu,
    ropeScaling: "yarn",
    parallel: 1,
    env: getServerParamsSnapshot().env,
    cmakeFlags: getCmakeFlagsSnapshot(),
    messageResults,
    averages: {
      totalPromptTokens,
      totalGeneratedTokens,
      totalTimeMs: totalMs,
      avgPromptTokensPerSec: Math.round(avgPromptTokensPerSec * 100) / 100,
      avgGenTokensPerSec: Math.round(avgGenTokensPerSec * 100) / 100,
    },
  };

  results.push(testRunResult);

  // Print summary for this run
  console.log(`\n  === Test Run #${testRunId} Summary ===`);
  console.log(`  Avg prompt tokens/sec: ${testRunResult.averages.avgPromptTokensPerSec}`);
  console.log(`  Avg gen tokens/sec:    ${testRunResult.averages.avgGenTokensPerSec}`);
  console.log(`  Total tokens:          ${testRunResult.averages.totalGeneratedTokens} (gen) / ${testRunResult.averages.totalPromptTokens} (prompt)`);
  console.log(`  Total time (all msgs): ${testRunResult.averages.totalTimeMs} ms`);

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
  md += "| Test Run | Message | Context | Prompt Tokens | Generated Tokens | Total Time (ms) | Prompt Tokens/sec | Gen Tokens/sec |\n";
  md += "|----------|---------|---------|---------------|------------------|-----------------|-------------------|----------------|\n";

  for (const run of results) {
    for (const msg of run.messageResults) {
      md += `| ${run.testRunId} | ${msg.messageIndex} | ${run.contextLength} | ${msg.promptTokens} | ${msg.generatedTokens} | ${msg.totalTimeMs} | ${msg.promptTokensPerSec} | ${msg.generatedTokensPerSec} |\n`;
    }
  }

  md += "\n";

  // Table 2: Per-test-run averages
  md += "## Test Run Averages\n\n";
  md += "| Test Run | Context | Batch | UBatch | Cache (GB) | GPU Layers | Avg Prompt Tok/s | Avg Gen Tok/s | Total Prompt Toks | Total Gen Toks | Total Time (ms) |\n";
  md += "|----------|---------|-------|--------|------------|------------|------------------|---------------|-------------------|----------------|-----------------|\n";

  for (const run of results) {
    md += `| ${run.testRunId} | ${run.contextLength} | ${run.batchSize} | ${run.uBatchSize} | ${run.cacheRam} | ${run.gpuLayerOffload} | ${run.averages.avgPromptTokensPerSec} | ${run.averages.avgGenTokensPerSec} | ${run.averages.totalPromptTokens} | ${run.averages.totalGeneratedTokens} | ${run.averages.totalTimeMs} |\n`;
  }

  md += "\n";

  // Table 3: Server parameters per test run
  md += "## Server Parameters\n\n";
  md += "| Test Run | Temp | Top-P | Min-P | Top-K | Flash-Attn | Reasoning | Rope Scaling | Split Mode | Tensor Split | Main GPU | Parallel |\n";
  md += "|----------|------|-------|-------|-------|------------|-----------|--------------|------------|--------------|----------|----------|\n";

  for (const run of results) {
    md += `| ${run.testRunId} | ${run.temperature} | ${run.topP} | ${run.minP} | ${run.topK} | ${run.flashAttn} | ${run.reasoning} | ${run.ropeScaling} | ${run.layerSplit} | ${run.tensorSplit} | ${run.primaryGpu} | ${run.parallel} |\n`;
  }

  md += "\n";

  // Table 4: CMake build flags per test run
  md += "## CMake Build Flags\n\n";
  md += "| Test Run | GGML_CUDA | GGML_CUDA_GRAPHS | GGML_CUDA_FA | GGML_CUDA_FP16 | GGML_CUDA_PEER_MAX_BATCH_SIZE | GGML_SCHED_MAX_COPIES | GGML_CUDA_COMPRESSION_LEVEL | GGML_LTO | GGML_CCACHE |\n";
  md += "|----------|-----------|------------------|--------------|----------------|-------------------------------|-----------------------|-----------------------------|----------|-------------|\n";

  for (const run of results) {
    const f = run.cmakeFlags;
    md += `| ${run.testRunId} | ${f.GGML_CUDA || ""} | ${f.GGML_CUDA_GRAPHS || ""} | ${f.GGML_CUDA_FA || ""} | ${f.GGML_CUDA_FP16 || ""} | ${f.GGML_CUDA_PEER_MAX_BATCH_SIZE || ""} | ${f.GGML_SCHED_MAX_COPIES || ""} | ${f.GGML_CUDA_COMPRESSION_LEVEL || ""} | ${f.GGML_LTO || ""} | ${f.GGML_CCACHE || ""} |\n`;
  }

  md += "\n";

  // Table 5: Environment variables per test run
  md += "## Environment Variables\n\n";
  md += "| Test Run | GGML_CUDA_ENABLE_UNIFIED_MEMORY | CUDA_SCALE_LAUNCH_QUEUES | LLAMA_CACHE | GGML_CUDA_P2P | LLAMA_ARG_FIT | LLAMA_ARG_FIT_TARGET | LLAMA_ARG_FIT_CTX |\n";
  md += "|----------|---------------------------------|--------------------------|-------------|---------------|---------------|----------------------|---------------------|\n";

  for (const run of results) {
    const e = run.env;
    md += `| ${run.testRunId} | ${e.GGML_CUDA_ENABLE_UNIFIED_MEMORY} | ${e.CUDA_SCALE_LAUNCH_QUEUES} | ${e.LLAMA_CACHE} | ${e.GGML_CUDA_P2P} | ${e.LLAMA_ARG_FIT} | ${e.LLAMA_ARG_FIT_TARGET} | ${e.LLAMA_ARG_FIT_CTX} |\n`;
  }

  md += "\n---\n*Generated by llama.cpp benchmark tool*\n";

  fs.writeFileSync(resultsFile, md);
  console.log(`Results written to ${resultsFile}`);
}

main();
