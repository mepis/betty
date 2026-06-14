/**
 * index.js — CLI entrypoint for the llama.cpp benchmark.
 *
 * Thin wrapper around BenchmarkEngine. All benchmark logic lives in
 * benchmark-engine.js so it can also be used by the API server.
 *
 * Usage:
 *   node index.js              — full benchmark run
 *   node index.js --no-build   — skip build phase
 *   node index.js --build-only — build llama.cpp, then exit
 */

import "dotenv/config";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BenchmarkEngine, loadConfigs, runBuildOnly } from "./benchmark-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── CLI arguments ───────────────────────────────────────────────────
const cliNoBuild = process.argv.includes("--no-build");
const cliBuildOnly = process.argv.includes("--build-only");

// ─── Load configs ────────────────────────────────────────────────────
const configsPath = join(__dirname, "configs.json");
const configs = loadConfigs(configsPath);

// Override skip_build from CLI
if (cliNoBuild) {
  configs.skip_build = true;
}

const rootDir = __dirname;
const resultsFile = join(rootDir, "results.md");
const reportsDir = join(rootDir, "reports");

// ─── Signal handlers ─────────────────────────────────────────────────
let engine = null;

function gracefulShutdown() {
  console.log("\nShutting down...");
  if (engine) {
    engine.stop();
  }
  // Give engine time to clean up, then force exit
  setTimeout(() => process.exit(1), 5000);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.message);
  gracefulShutdown();
});

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  if (cliBuildOnly) {
    await runBuildOnly(configs, { rootDir });
    process.exit(0);
  }

  engine = new BenchmarkEngine(configs, {
    rootDir,
    configsPath,
    resultsFile,
    reportsDir,
    onStatus: (data) => {
      console.log(`[STATUS] ${JSON.stringify(data)}`);
    },
    onResult: (result) => {
      console.log(`[RESULT] Test run ${result.testRunId} complete`);
    },
    onLog: (log) => {
      // Log messages (including BENCHMARK_JSON structured output)
      if (log.text.includes("BENCHMARK_JSON:")) {
        // Already printed by the engine
      } else if (log.text.trim()) {
        console.log(`[LOG:${log.type}] ${log.text}`);
      }
    },
    onComplete: (results) => {
      console.log(`[COMPLETE] Benchmark finished with ${results.length} test runs`);
    },
  });

  const result = await engine.run();
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
