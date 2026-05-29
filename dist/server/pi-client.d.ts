/**
 * PiClient — wraps @earendil-works/pi-coding-agent to communicate with the pi CLI.
 * Streams assistant responses and provides structured callbacks for SSE delivery.
 */
import type { MessageRole } from '../shared/types.js';
interface PiClientOptions {
    /** Path to pi CLI (defaults to first entry in PATH) */
    piPath?: string;
}
/**
 * Send a message to the Pi coding agent and stream its response via callbacks.
 * @param messages - The conversation history to send as context
 */
export declare function sendMessage(messages: Array<{
    role: MessageRole;
    content: string;
}>, _sessionId?: string, options?: PiClientOptions): Promise<void>;
export declare class PiClient {
    private readonly piPath;
    constructor(options?: PiClientOptions);
    /** Send a message and get streaming response */
    streamResponse(messages: Array<{
        role: MessageRole;
        content: string;
    }>, sessionId?: string): Promise<void>;
    /** Send a message and get the full response (non-streaming) */
    sendMessage(messages: Array<{
        role: MessageRole;
        content: string;
    }>): Promise<string>;
}
export default PiClient;
