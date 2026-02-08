const { spawn } = require('child_process');
const axios = require('axios');
const config = require('../config');

class LlamaService {
  constructor() {
    this.process = null;
    this.isRunning = false;
    this.isRestarting = false;
    this.currentModelPath = config.llama.modelPath;
    this.baseUrl = `http://${config.llama.host}:${config.llama.port}`;
  }

  /**
   * Start the llama.cpp server process
   */
  async start() {
    if (this.isRunning) {
      console.log('llama.cpp server is already running');
      return;
    }

    console.log('Starting llama.cpp server...');

    const args = [
      '-m', this.currentModelPath,
      '-c', config.llama.contextSize.toString(),
      '-t', config.llama.threads.toString(),
      '--port', config.llama.port.toString(),
      '-ngl', config.llama.gpuLayers.toString(),
      '-b', config.llama.batchSize.toString(),
      '--embeddings', // Enable embeddings endpoint for RAG
      '--pooling', 'mean', // Use mean pooling for embeddings
    ];

    // GPU configuration
    if (config.llama.mainGpu !== undefined) {
      args.push('--main-gpu', config.llama.mainGpu.toString());
    }

    if (config.llama.splitMode && config.llama.splitMode !== 'none') {
      args.push('--split-mode', config.llama.splitMode);
    }

    if (config.llama.tensorSplit) {
      args.push('--tensor-split', config.llama.tensorSplit);
    }

    if (config.llama.flashAttention && config.llama.flashAttention !== 'off') {
      args.push('--flash-attn', config.llama.flashAttention);
    }

    if (config.llama.seed !== -1) {
      args.push('-s', config.llama.seed.toString());
    }

    console.log('llama.cpp args:', args.join(' '));

    try {
      this.process = spawn(config.llama.executable, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true, // Create new process group for clean shutdown
      });

      this.process.stdout.on('data', (data) => {
        console.log(`[llama.cpp] ${data.toString().trim()}`);
      });

      this.process.stderr.on('data', (data) => {
        console.error(`[llama.cpp] ${data.toString().trim()}`);
      });

      this.process.on('error', (error) => {
        console.error('Failed to start llama.cpp server:', error);
        this.isRunning = false;
      });

      this.process.on('exit', (code, signal) => {
        console.log(`llama.cpp server exited with code ${code} and signal ${signal}`);
        this.isRunning = false;
        this.process = null;
      });

      // Wait for the server to be ready
      await this.waitForReady();
      this.isRunning = true;
      console.log(`llama.cpp server is ready at ${this.baseUrl}`);
    } catch (error) {
      console.error('Error starting llama.cpp server:', error);
      throw error;
    }
  }

  /**
   * Wait for llama.cpp server to be ready
   */
  async waitForReady() {
    const startTime = Date.now();
    let retries = 0;

    while (retries < config.healthCheck.retries) {
      if (Date.now() - startTime > config.healthCheck.timeout) {
        throw new Error('llama.cpp server health check timeout');
      }

      try {
        await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
        return;
      } catch (error) {
        retries++;
        console.log(`Waiting for llama.cpp server... (attempt ${retries}/${config.healthCheck.retries})`);
        await new Promise(resolve => setTimeout(resolve, config.healthCheck.interval));
      }
    }

    throw new Error('llama.cpp server failed to start');
  }

  /**
   * Stop the llama.cpp server process
   */
  async stop() {
    if (!this.process) {
      console.log('llama.cpp server is not running');
      return;
    }

    console.log('Stopping llama.cpp server...');
    const pid = this.process.pid;

    return new Promise((resolve) => {
      if (this.process) {
        this.process.once('exit', () => {
          console.log('llama.cpp server stopped');
          this.isRunning = false;
          this.process = null;
          resolve();
        });

        // Kill entire process group (negative PID) to ensure all child processes are terminated
        try {
          process.kill(-pid, 'SIGTERM');
        } catch (err) {
          // Fallback to killing just the process if group kill fails
          this.process.kill('SIGTERM');
        }

        // Force kill after 5 seconds if not stopped
        setTimeout(() => {
          if (this.process) {
            console.log('Force killing llama.cpp server');
            try {
              process.kill(-pid, 'SIGKILL');
            } catch (err) {
              // Fallback to killing just the process
              if (this.process) {
                this.process.kill('SIGKILL');
              }
            }
          }
        }, 5000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the status of llama.cpp server
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      baseUrl: this.baseUrl,
      pid: this.process ? this.process.pid : null,
    };
  }

  /**
   * Get base URL for proxying requests
   */
  getBaseUrl() {
    return this.baseUrl;
  }

  /**
   * Restart llama.cpp server with a different model
   * @param {string} modelPath - Path to new model file
   */
  async restart(modelPath) {
    if (this.isRestarting) {
      throw new Error('Server is already restarting');
    }

    const fs = require('fs').promises;

    // Validate model file exists
    try {
      await fs.access(modelPath);
    } catch (error) {
      throw new Error(`Model file not found: ${modelPath}`);
    }

    this.isRestarting = true;
    const previousModelPath = this.currentModelPath;

    try {
      console.log(`Restarting llama.cpp server with model: ${modelPath}`);

      // Stop current server
      await this.stop();

      // Update model path
      this.currentModelPath = modelPath;

      // Start with new model
      await this.start();

      console.log('llama.cpp server restarted successfully');
      this.isRestarting = false;
    } catch (error) {
      console.error('Failed to restart llama.cpp server:', error);

      // Rollback to previous model on failure
      this.currentModelPath = previousModelPath;
      this.isRestarting = false;

      // Try to restart with previous model
      try {
        console.log('Attempting to rollback to previous model...');
        await this.start();
        console.log('Rollback successful');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }

      throw error;
    }
  }

  /**
   * Get current model path
   * @returns {string} Current model path
   */
  getCurrentModelPath() {
    return this.currentModelPath;
  }

  /**
   * Check if server is restarting
   * @returns {boolean} True if restarting
   */
  getIsRestarting() {
    return this.isRestarting;
  }
}

// Singleton instance
const llamaService = new LlamaService();

module.exports = llamaService;
