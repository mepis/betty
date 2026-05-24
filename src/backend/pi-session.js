import { spawn } from "child_process";
import { EventEmitter } from "events";

/**
 * PiSession manages a Pi subprocess in RPC mode.
 *
 * Protocol (strict LF-delimited JSONL):
 *   Commands (stdin):  { type: "prompt", message: "..." }
 *   Responses (stdout): { type: "response", command: "prompt", success: true }
 *   Events (stdout):    AgentSessionEvent objects (message_update, message_end, etc.)
 *   UI Requests (stdout): { type: "extension_ui_request", id, method, ... }
 *
 * We respond to all extension UI requests with defaults to avoid blocking Pi.
 */
export class PiSession extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.buffer = "";
    this.isRunning = false;
    this.isStreaming = false;
    this.currentAssistantContent = "";
  }

  /**
   * Start Pi subprocess in RPC mode.
   * Pi starts almost instantly — we just need to confirm it accepts commands.
   */
  start() {
    return new Promise((resolve, reject) => {
      this.emit("status", "starting");

      try {
        this.process = spawn("pi", ["--mode", "rpc"], {
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env },
        });

        this.process.stdout.setEncoding("utf-8");
        this.process.stderr.setEncoding("utf-8");
        this.buffer = "";

        // Handle stdout (responses + events + UI requests)
        this.process.stdout.on("data", (chunk) => {
          this.buffer += chunk.toString();
          this._processBuffer();
        });

        this.process.stderr.on("data", () => {
          // Pi's own stderr — typically empty in RPC mode
        });

        this.process.on("exit", (code, signal) => {
          this.isRunning = false;
          // Clear timers on exit to prevent dangling callbacks
          if (this._readyCheckTimer) {
            clearTimeout(this._readyCheckTimer);
            this._readyCheckTimer = null;
          }
          if (this._startTimeout) {
            clearTimeout(this._startTimeout);
            this._startTimeout = null;
          }
          if (code !== 0) {
            this.emit("error", `Pi process exited with code ${code}${signal ? ` (${signal})` : ""}`);
          }
        });

        this.process.on("error", (err) => {
          this.isRunning = false;
          // Clear timers on error to prevent dangling callbacks
          if (this._readyCheckTimer) {
            clearTimeout(this._readyCheckTimer);
            this._readyCheckTimer = null;
          }
          if (this._startTimeout) {
            clearTimeout(this._startTimeout);
            this._startTimeout = null;
          }
          this.emit("error", `Failed to start Pi: ${err.message}`);
        });

        // Pi starts almost instantly. We confirm readiness by checking
        // that the process is alive and stdout is open. The first command
        // response will confirm the LLM is reachable.
        const checkReady = () => {
          if (this.process && !this.process.killed) {
            this.isRunning = true;
            this.emit("status", "ready");
            resolve();
            return true;
          }
          return false;
        };

        this._resolved = false;
        this._readyCheckTimer = setTimeout(() => {
          if (!this._resolved && !checkReady() && this.process && !this.process.killed) {
            this._resolved = true;
            this.process.kill();
            reject(new Error("Pi process died during startup"));
          }
        }, 5000);

        // Timeout: 60 seconds for Pi to start
        this._startTimeout = setTimeout(() => {
          if (!this._resolved && !this.isRunning && this.process && !this.process.killed) {
            this._resolved = true;
            this.process.kill();
            reject(new Error("Pi failed to start within 60 seconds"));
          }
        }, 60000);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Process buffered data with strict LF-only JSONL framing
   */
  _processBuffer() {
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, "").trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (!line) continue;

      try {
        const event = JSON.parse(line);
        this._handleEvent(event);
      } catch {
        // Partial JSON line — wait for more data
      }
    }
  }

  /**
   * Handle a parsed JSON event from Pi
   */
  _handleEvent(event) {
    if (!event || typeof event !== "object") return;

    // Extension UI requests — respond with defaults
    if (event.type === "extension_ui_request") {
      this._handleExtensionUiRequest(event);
      return;
    }

    // Command responses
    if (event.type === "response") {
      if (event.command === "prompt" && !event.success) {
        this.emit("error", `Prompt failed: ${event.error}`);
      }
      return;
    }

    // Agent session events
    switch (event.type) {
      case "agent_start":
        this.currentAssistantContent = "";
        this.isStreaming = true;
        break;

      case "message_start":
        this.currentAssistantContent = "";
        break;

      case "message_update":
        if (event.assistantMessageEvent && typeof event.assistantMessageEvent === "object") {
          const evt = event.assistantMessageEvent;

          // Only stream text_delta events (incremental content)
          // text_end and message_end provide the final content
          if (evt.type === "text_delta" && evt.delta !== undefined && evt.delta !== null) {
            this.currentAssistantContent += evt.delta;
            this.emit("stream", evt.delta);
          }
          // thinking_delta — ignore (internal reasoning)
        }
        break;

      case "message_end":
        // Use accumulated content from streaming, or fall back to message_end content
        const finalContent = this.currentAssistantContent || (event.message?.content || "");
        if (finalContent) {
          this.emit("message", {
            role: "assistant",
            content: finalContent,
          });
        }
        this.isStreaming = false;
        break;

      case "tool_execution_start":
        this.emit("tool-call", {
          toolName: event.toolName,
          toolCallId: event.toolCallId,
          args: event.args,
        });
        break;

      case "tool_execution_end":
        this.emit("tool-result", {
          toolName: event.toolName,
          toolCallId: event.toolCallId,
          result: event.result,
          isError: event.isError,
        });
        break;

      case "agent_end":
        this.isStreaming = false;
        break;
    }
  }

  /**
   * Handle extension UI requests by responding with defaults
   */
  _handleExtensionUiRequest(event) {
    const { id, method } = event;
    let response;

    switch (method) {
      case "select":
      case "input":
      case "editor":
        response = { type: "extension_ui_response", id, cancelled: true };
        break;
      case "confirm":
        response = { type: "extension_ui_response", id, confirmed: false };
        break;
      case "notify":
      case "setStatus":
      case "setWidget":
      case "setTitle":
      case "set_editor_text":
        response = { type: "extension_ui_response", id, value: "" };
        break;
      default:
        response = { type: "extension_ui_response", id, cancelled: true };
    }

    this._sendLine(response);
  }

  /**
   * Write a JSON line to stdin (strict LF framing)
   */
  _sendLine(obj) {
    if (!this.isRunning || !this.process?.stdin) return false;
    const line = JSON.stringify(obj) + "\n";
    return this.process.stdin.write(line, "utf-8");
  }

  /**
   * Send a prompt to Pi
   */
  prompt(message) {
    return this._sendLine({ type: "prompt", message });
  }

  /**
   * Send a steering message (delivered after current turn)
   */
  steer(message) {
    return this._sendLine({ type: "steer", message });
  }

  /**
   * Follow up on the last response
   */
  followUp(message) {
    return this._sendLine({ type: "follow_up", message });
  }

  /**
   * Abort the current turn
   */
  abort() {
    return this._sendLine({ type: "abort" });
  }

  /**
   * Start a new session
   */
  newSession() {
    return this._sendLine({ type: "new_session" });
  }

  /**
   * Stop the Pi subprocess
   */
  stop() {
    // Clear all timers to prevent callbacks from firing after stop
    if (this._readyCheckTimer) {
      clearTimeout(this._readyCheckTimer);
      this._readyCheckTimer = null;
    }
    // Clear any pending timeout timers (60s start timeout)
    // We track them by storing the ID
    if (this._startTimeout) {
      clearTimeout(this._startTimeout);
      this._startTimeout = null;
    }

    if (this.process) {
      try {
        this.process.kill("SIGTERM");
        this.process = null;
      } catch {
        // Process already dead
      }
    }
    this.isRunning = false;
    this.isStreaming = false;
    this.currentAssistantContent = "";
    this.buffer = "";
  }

  /**
   * Check if Pi is still running
   */
  isAlive() {
    return this.isRunning && this.process && !this.process.killed;
  }
}
