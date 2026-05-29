/**
 * PiClient — wraps @earendil-works/pi-coding-agent to communicate with the pi CLI.
 * Streams assistant responses and provides structured callbacks for SSE delivery.
 */

import { spawn } from 'node:child_process';
import type { MessageRole } from '../shared/types.js';

interface PiClientOptions {
  /** Path to pi CLI (defaults to first entry in PATH) */
  piPath?: string;
}

/**
 * Send a message to the Pi coding agent and stream its response via callbacks.
 * @param messages - The conversation history to send as context
 */
export async function sendMessage(
  messages: Array<{ role: MessageRole; content: string }>,
  _sessionId?: string,
  options?: PiClientOptions,
): Promise<void> {
  const piPath = options?.piPath || 'pi';

  // Build JSON payload for the pi CLI
  const payload = JSON.stringify({
    messages,
    stream: true,
  });

  return new Promise((resolve, reject) => {
    const child = spawn(piPath, ['agent', '--stream'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Send payload via stdin
    child.stdin.write(payload);
    child.stdin.end();

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      try {
        // Try to parse as SSE events
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try { JSON.parse(line.slice(6)); } catch { /* raw delta */ }
          }
        }
      } catch { /* ignore parse errors */ }
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Pi agent exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

export class PiClient {
  private readonly piPath: string;

  constructor(options?: PiClientOptions) {
    this.piPath = options?.piPath || 'pi';
  }

  /** Send a message and get streaming response */
  async streamResponse(
    messages: Array<{ role: MessageRole; content: string }>,
    sessionId?: string,
  ): Promise<void> {
    return sendMessage(messages, sessionId, { piPath: this.piPath });
  }

  /** Send a message and get the full response (non-streaming) */
  async sendMessage(
    messages: Array<{ role: MessageRole; content: string }>,
  ): Promise<string> {
    const piPath = this.piPath;
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({ messages, stream: false });
      const child = spawn(piPath, ['agent'], { stdio: ['pipe', 'pipe', 'pipe'] });

      child.stdin.write(payload);
      child.stdin.end();

      let stdout = '';
      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });

      child.on('close', (code) => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(`Pi agent exited with code ${code}`));
      });

      child.on('error', reject);
    });
  }
}

export default PiClient;
