import { EventEmitter } from "events";
import {
  createAgentSession,
  SessionManager,
  AuthStorage,
  ModelRegistry,
} from "@earendil-works/pi-coding-agent";

/**
 * PiSession manages a Pi agent session using the SDK directly.
 *
 * Using the SDK gives us direct access to agent state, including
 * the ability to delete messages from the context window.
 */
export class PiSession extends EventEmitter {
  constructor() {
    super();
    this.session = null;
    this.authStorage = null;
    this.modelRegistry = null;
    this.isRunning = false;
    this.isStreaming = false;
    this.currentAssistantContent = "";
    this._unsubscribe = null;
  }

  /**
   * Start a Pi agent session using the SDK.
   */
  async start() {
    this.emit("status", "starting");

    try {
      this.authStorage = AuthStorage.create();
      this.modelRegistry = ModelRegistry.create(this.authStorage);

      const result = await createAgentSession({
        sessionManager: SessionManager.inMemory(),
        authStorage: this.authStorage,
        modelRegistry: this.modelRegistry,
      });

      this.session = result.session;
      this.isRunning = true;

      // Subscribe to agent events
      this._unsubscribe = this.session.subscribe((event) => {
        this._handleEvent(event);
      });

      this.emit("status", "ready");
    } catch (err) {
      this.emit("error", `Failed to start Pi: ${err.message}`);
      throw err;
    }
  }

  /**
   * Handle an agent session event from the SDK
   */
  _handleEvent(event) {
    if (!event || typeof event !== "object") return;

    // Extension UI requests — handle via the session's extension runtime
    if (event.type === "extension_ui_request") {
      // The SDK handles extension UI requests internally when using createAgentSession
      // We don't need to respond to them here
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
          if (evt.type === "text_delta" && evt.delta !== undefined && evt.delta !== null) {
            this.currentAssistantContent += evt.delta;
            this.emit("stream", evt.delta);
          }
        }
        break;

      case "message_end":
        // Use accumulated content from streaming, or fall back to message_end content
        const finalContent =
          this.currentAssistantContent ||
          (event.message?.content && typeof event.message.content === "string"
            ? event.message.content
            : Array.isArray(event.message?.content)
              ? event.message.content
                  .filter((c) => c.type === "text")
                  .map((c) => c.text)
                  .join("\n")
              : "");
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
   * Send a prompt to Pi
   */
  async prompt(message) {
    if (!this.session || !this.isRunning) return false;
    try {
      await this.session.prompt(message);
      return true;
    } catch (err) {
      this.emit("error", `Prompt failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Send a steering message (delivered after current turn)
   */
  steer(message) {
    if (!this.session || !this.isRunning) return false;
    try {
      this.session.steer(message);
      return true;
    } catch (err) {
      this.emit("error", `Steer failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Follow up on the last response
   */
  followUp(message) {
    if (!this.session || !this.isRunning) return false;
    try {
      this.session.followUp(message);
      return true;
    } catch (err) {
      this.emit("error", `Follow-up failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Abort the current turn
   */
  async abort() {
    if (!this.session || !this.isRunning) return false;
    try {
      await this.session.abort();
      return true;
    } catch (err) {
      this.emit("error", `Abort failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Delete a message from the context window entirely.
   *
   * Finds the message matching the given role and content in the agent's
   * message state and removes it, freeing up context window space.
   *
   * @param {string} role - "user" or "assistant"
   * @param {string} content - The message content to match
   * @returns {boolean} true if a message was found and removed
   */
  deleteMessage(role, content) {
    if (!this.session || !this.isRunning) return false;

    const messages = this.session.agent.state.messages;
    const initialLength = messages.length;

    // Find and remove the matching message
    const filtered = messages.filter((msg) => {
      if (msg.role !== role) return true;

      // Compare content - handle both string and array content formats
      let msgContent = "";
      if (typeof msg.content === "string") {
        msgContent = msg.content;
      } else if (Array.isArray(msg.content)) {
        msgContent = msg.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n");
      }

      // Match by content (trim both sides for comparison)
      if (msgContent.trim() === content.trim()) {
        return false; // Remove this message
      }
      return true;
    });

    if (filtered.length === initialLength) {
      return false; // No message was found
    }

    // Replace the messages array to remove the deleted message
    this.session.agent.state.messages = filtered;
    return true;
  }

  /**
   * Start a new session
   */
  async newSession() {
    if (!this.session) return false;

    // Stop current session
    this.stop();

    // Create a new session
    try {
      const result = await createAgentSession({
        sessionManager: SessionManager.inMemory(),
        authStorage: this.authStorage,
        modelRegistry: this.modelRegistry,
      });

      this.session = result.session;
      this.isRunning = true;
      this.isStreaming = false;
      this.currentAssistantContent = "";

      // Subscribe to agent events
      this._unsubscribe = this.session.subscribe((event) => {
        this._handleEvent(event);
      });

      this.emit("status", "ready");
      return true;
    } catch (err) {
      this.emit("error", `New session failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Stop the Pi session
   */
  stop() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }

    if (this.session) {
      try {
        this.session.dispose();
      } catch {
        // Session already disposed
      }
      this.session = null;
    }

    this.isRunning = false;
    this.isStreaming = false;
    this.currentAssistantContent = "";
  }

  /**
   * Check if Pi is still running
   */
  isAlive() {
    return this.isRunning && this.session !== null;
  }
}
