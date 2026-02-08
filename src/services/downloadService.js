const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { URL } = require('url');

class Download extends EventEmitter {
  constructor(id, url, targetPath, options = {}) {
    super();
    this.id = id;
    this.url = url;
    this.targetPath = targetPath;
    this.partialPath = targetPath + '.partial';
    this.timeout = options.timeout || 3600000; // 1 hour default

    this.status = 'pending';
    this.bytesDownloaded = 0;
    this.totalBytes = 0;
    this.startTime = null;
    this.request = null;
    this.fileStream = null;
    this.error = null;
  }

  /**
   * Start the download
   */
  async start() {
    this.status = 'downloading';
    this.startTime = Date.now();
    this.emit('start', { id: this.id });

    try {
      await this.performDownload();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Perform the HTTP(S) download
   */
  performDownload() {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(this.url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      // Create write stream for partial file
      this.fileStream = fs.createWriteStream(this.partialPath);

      this.fileStream.on('error', (error) => {
        reject(new Error(`File write error: ${error.message}`));
      });

      // Make HTTP(S) request
      this.request = client.get(this.url, { timeout: this.timeout }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          this.fileStream.close();
          fs.unlinkSync(this.partialPath);
          this.url = response.headers.location;
          this.performDownload().then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        this.totalBytes = parseInt(response.headers['content-length'] || '0', 10);

        // Track download progress
        response.on('data', (chunk) => {
          this.bytesDownloaded += chunk.length;
          this.emitProgress();
        });

        // Pipe response to file
        response.pipe(this.fileStream);

        this.fileStream.on('finish', () => {
          this.fileStream.close(() => {
            // Rename partial to final filename
            fs.rename(this.partialPath, this.targetPath, (err) => {
              if (err) {
                reject(new Error(`Failed to rename file: ${err.message}`));
              } else {
                this.status = 'complete';
                this.emit('complete', {
                  id: this.id,
                  path: this.targetPath,
                  size: this.bytesDownloaded,
                });
                resolve();
              }
            });
          });
        });
      });

      this.request.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      this.request.on('timeout', () => {
        this.request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Emit progress event
   */
  emitProgress() {
    const progress = this.totalBytes > 0
      ? Math.round((this.bytesDownloaded / this.totalBytes) * 100)
      : 0;

    const elapsed = Date.now() - this.startTime;
    const speed = elapsed > 0 ? (this.bytesDownloaded / elapsed) * 1000 : 0;

    this.emit('progress', {
      id: this.id,
      status: this.status,
      progress,
      bytesDownloaded: this.bytesDownloaded,
      totalBytes: this.totalBytes,
      speed: Math.round(speed),
    });
  }

  /**
   * Cancel the download
   */
  cancel() {
    if (this.status !== 'downloading') {
      return;
    }

    this.status = 'cancelled';

    // Abort request
    if (this.request) {
      this.request.destroy();
    }

    // Close file stream
    if (this.fileStream) {
      this.fileStream.close();
    }

    // Delete partial file
    if (fs.existsSync(this.partialPath)) {
      fs.unlinkSync(this.partialPath);
    }

    this.emit('cancelled', { id: this.id });
  }

  /**
   * Handle download error
   * @param {Error} error - Error object
   */
  handleError(error) {
    this.status = 'error';
    this.error = error.message;

    // Close streams
    if (this.fileStream) {
      this.fileStream.close();
    }

    // Delete partial file
    if (fs.existsSync(this.partialPath)) {
      fs.unlinkSync(this.partialPath);
    }

    this.emit('error', {
      id: this.id,
      error: error.message,
    });
  }

  /**
   * Get download status
   * @returns {Object} Download status
   */
  getStatus() {
    const progress = this.totalBytes > 0
      ? Math.round((this.bytesDownloaded / this.totalBytes) * 100)
      : 0;

    return {
      id: this.id,
      status: this.status,
      progress,
      bytesDownloaded: this.bytesDownloaded,
      totalBytes: this.totalBytes,
      error: this.error,
    };
  }
}

class DownloadService {
  constructor() {
    this.downloads = new Map();
    this.nextId = 1;
  }

  /**
   * Start a new download
   * @param {string} url - Download URL
   * @param {string} targetPath - Target file path
   * @param {Object} options - Download options
   * @returns {string} Download ID
   */
  async startDownload(url, targetPath, options = {}) {
    const downloadId = `dl_${this.nextId++}`;
    const download = new Download(downloadId, url, targetPath, options);

    this.downloads.set(downloadId, download);

    // Start download (non-blocking)
    download.start().finally(() => {
      // Clean up completed/error downloads after a delay
      setTimeout(() => {
        if (download.status !== 'downloading') {
          this.downloads.delete(downloadId);
        }
      }, 60000); // Keep for 1 minute after completion
    });

    return downloadId;
  }

  /**
   * Get download by ID
   * @param {string} downloadId - Download ID
   * @returns {Download|null} Download instance
   */
  getDownload(downloadId) {
    return this.downloads.get(downloadId) || null;
  }

  /**
   * Cancel a download
   * @param {string} downloadId - Download ID
   */
  cancelDownload(downloadId) {
    const download = this.downloads.get(downloadId);
    if (download) {
      download.cancel();
    }
  }

  /**
   * Get all active downloads
   * @returns {Array} List of download statuses
   */
  getActiveDownloads() {
    return Array.from(this.downloads.values())
      .filter(dl => dl.status === 'downloading')
      .map(dl => dl.getStatus());
  }

  /**
   * Check available disk space
   * @param {string} dirPath - Directory path
   * @param {number} requiredBytes - Required bytes
   * @returns {boolean} True if enough space available
   */
  async checkDiskSpace(dirPath, requiredBytes) {
    // Note: This is a simplified check. For production, consider using a library
    // like 'check-disk-space' for accurate cross-platform disk space checking.
    return true; // Placeholder - implement proper disk space checking if needed
  }
}

// Singleton instance
const downloadService = new DownloadService();

module.exports = downloadService;
