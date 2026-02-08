const { spawn } = require('child_process');
const axios = require('axios');
const config = require('../config');

class EmbeddingServerService {
  constructor() {
    this.process = null;
    this.isRunning = false;
    this.isRestarting = false;
    this.currentModelPath = null;
    this.baseUrl = `http://${config.embedding.host}:${config.embedding.port}`;
  }

  /**
   * Start the embedding llama.cpp server process
   * @param {string} modelPath - Path to the model file
   */
  async start(modelPath) {
    if (this.isRunning) {
      console.log('Embedding server is already running');
      return;
    }

    if (!modelPath) {
      throw new Error('Model path is required to start embedding server');
    }

    console.log(`Starting embedding server with model: ${modelPath}`);
    this.currentModelPath = modelPath;

    const args = [
      '-m', modelPath,
      '-c', config.embedding.contextSize.toString(),
      '-t', config.embedding.threads.toString(),
      '--port', config.embedding.port.toString(),
      '-ngl', config.embedding.gpuLayers.toString(),
      '-b', config.embedding.batchSize.toString(),
      '--embeddings',
      '--pooling', 'mean',
    ];

    console.log('Embedding server args:', args.join(' '));

    try {
      this.process = spawn(config.llama.executable, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true, // Create new process group for clean shutdown
      });

      this.process.stdout.on('data', (data) => {
        console.log(`[embedding-server] ${data.toString().trim()}`);
      });

      this.process.stderr.on('data', (data) => {
        console.error(`[embedding-server] ${data.toString().trim()}`);
      });

      this.process.on('error', (error) => {
        console.error('Failed to start embedding server:', error);
        this.isRunning = false;
      });

      this.process.on('exit', (code, signal) => {
        console.log(`Embedding server exited with code ${code} and signal ${signal}`);
        this.isRunning = false;
        this.process = null;
      });

      // Wait for the server to be ready
      await this.waitForReady();
      this.isRunning = true;
      console.log(`Embedding server is ready at ${this.baseUrl}`);
    } catch (error) {
      console.error('Error starting embedding server:', error);
      throw error;
    }
  }

  /**
   * Wait for embedding server to be ready
   */
  async waitForReady() {
    const startTime = Date.now();
    let retries = 0;

    while (retries < config.healthCheck.retries) {
      if (Date.now() - startTime > config.healthCheck.timeout) {
        throw new Error('Embedding server health check timeout');
      }

      try {
        await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
        return;
      } catch (error) {
        retries++;
        console.log(`Waiting for embedding server... (attempt ${retries}/${config.healthCheck.retries})`);
        await new Promise(resolve => setTimeout(resolve, config.healthCheck.interval));
      }
    }

    throw new Error('Embedding server failed to start');
  }

  /**
   * Stop the embedding server process
   */
  async stop() {
    if (!this.process) {
      console.log('Embedding server is not running');
      return;
    }

    console.log('Stopping embedding server...');
    const pid = this.process.pid;

    return new Promise((resolve) => {
      if (this.process) {
        this.process.once('exit', () => {
          console.log('Embedding server stopped');
          this.isRunning = false;
          this.process = null;
          this.currentModelPath = null;
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
            console.log('Force killing embedding server');
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
   * Restart embedding server with a different model
   * @param {string} modelPath - Path to new model file
   */
  async restart(modelPath) {
    if (this.isRestarting) {
      throw new Error('Embedding server is already restarting');
    }

    const fs = require('fs').promises;

    // Validate model file exists
    try {
      await fs.access(modelPath);
    } catch (error) {
      throw new Error(`Model file not found: ${modelPath}`);
    }

    this.isRestarting = true;

    try {
      console.log(`Restarting embedding server with model: ${modelPath}`);

      // Stop current server
      await this.stop();

      // Start with new model
      await this.start(modelPath);

      console.log('Embedding server restarted successfully');
      this.isRestarting = false;
    } catch (error) {
      console.error('Failed to restart embedding server:', error);
      this.isRestarting = false;
      throw error;
    }
  }

  /**
   * Get the status of embedding server
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isRestarting: this.isRestarting,
      baseUrl: this.baseUrl,
      port: config.embedding.port,
      pid: this.process ? this.process.pid : null,
      currentModelPath: this.currentModelPath,
    };
  }

  /**
   * Get base URL for embedding requests
   */
  getBaseUrl() {
    return this.baseUrl;
  }

  /**
   * Check if server is running
   */
  getIsRunning() {
    return this.isRunning;
  }

  /**
   * Get current model path
   */
  getCurrentModelPath() {
    return this.currentModelPath;
  }
}

// Singleton instance
const embeddingServerService = new EmbeddingServerService();

module.exports = embeddingServerService;
