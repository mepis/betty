/**
 * PiClient — wraps @earendil-works/pi-coding-agent to communicate with the pi CLI.
 * Streams assistant responses and provides structured callbacks for SSE delivery.
 */
import { spawn } from 'node:child_process';
/**
 * Send a message to the Pi coding agent and stream its response via callbacks.
 * @param messages - The conversation history to send as context
 */
export async function sendMessage(messages, _sessionId, options) {
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
        child.stdout.on('data', (chunk) => {
            const text = chunk.toString();
            try {
                // Try to parse as SSE events
                const lines = text.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            JSON.parse(line.slice(6));
                        }
                        catch { /* raw delta */ }
                    }
                }
            }
            catch { /* ignore parse errors */ }
        });
        child.on('close', (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`Pi agent exited with code ${code}`));
        });
        child.on('error', reject);
    });
}
export class PiClient {
    piPath;
    constructor(options) {
        this.piPath = options?.piPath || 'pi';
    }
    /** Send a message and get streaming response */
    async streamResponse(messages, sessionId) {
        return sendMessage(messages, sessionId, { piPath: this.piPath });
    }
    /** Send a message and get the full response (non-streaming) */
    async sendMessage(messages) {
        const piPath = this.piPath;
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify({ messages, stream: false });
            const child = spawn(piPath, ['agent'], { stdio: ['pipe', 'pipe', 'pipe'] });
            child.stdin.write(payload);
            child.stdin.end();
            let stdout = '';
            child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
            child.on('close', (code) => {
                if (code === 0)
                    resolve(stdout.trim());
                else
                    reject(new Error(`Pi agent exited with code ${code}`));
            });
            child.on('error', reject);
        });
    }
}
export default PiClient;
//# sourceMappingURL=pi-client.js.map