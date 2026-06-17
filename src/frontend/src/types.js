/**
 * Shared JSDoc type definitions for the chat interface.
 * Used across composables, renderers, and components.
 */

/**
 * @typedef {Object} BaseMessage
 * @property {string} id - Unique message identifier
 * @property {'user'|'assistant'} role - Message role
 * @property {string} timestamp - ISO timestamp string
 */

/**
 * @typedef {Object} TextBlock
 * @property {'text'} type
 * @property {string} text
 */

/**
 * @typedef {Object} ImageBlock
 * @property {'image'} type
 * @property {string} imageUrl
 */

/**
 * @typedef {Object} ThinkingBlock
 * @property {'thinking'} type
 * @property {string} thinking
 */

/**
 * @typedef {Object} ToolCallBlock
 * @property {'toolCall'} type
 * @property {string} name - Tool name
 * @property {Object} [arguments] - Tool arguments
 * @property {string} [status] - 'pending'|'running'|'completed'|'error'
 * @property {*} [result] - Tool result
 * @property {*} [details] - Additional details
 */

/**
 * @typedef {TextBlock|ImageBlock|ThinkingBlock|ToolCallBlock} ContentBlock
 */

/**
 * @typedef {Object} UserMessage
 * @property {string} id
 * @property {'user'} role
 * @property {string} timestamp
 * @property {ContentBlock[]} content - Array of text and image blocks
 */

/**
 * @typedef {Object} ToolCallState
 * @property {string} toolCallId - Unique tool call identifier
 * @property {string} name - Tool name
 * @property {Object} [args] - Tool arguments
 * @property {'running'|'completed'|'error'} status - Current status
 * @property {*} [result] - Tool result data
 * @property {*} [details] - Additional result details
 * @property {boolean} [isError] - Whether the tool call errored
 */

/**
 * @typedef {Object} AssistantStreamingMessage
 * @property {string} id
 * @property {'assistant'} role
 * @property {string} timestamp
 * @property {string} content - Streaming text content (plain string)
 * @property {string} thinking - Streaming thinking content
 * @property {ToolCallState[]} toolCalls - Active tool calls
 * @property {true} isStreaming
 */

/**
 * @typedef {Object} AssistantFinalMessage
 * @property {string} id
 * @property {'assistant'} role
 * @property {string} timestamp
 * @property {ContentBlock[]} content - Final rendered content blocks
 */

/**
 * @typedef {UserMessage|AssistantStreamingMessage|AssistantFinalMessage} ChatMessage
 */

/**
 * @typedef {Object} Session
 * @property {string} id - Session identifier
 * @property {string} name - Display name
 * @property {number} createdAt - Unix timestamp
 * @property {number} updatedAt - Unix timestamp
 * @property {number} [messageCount] - Number of messages in session
 */

/**
 * @typedef {Object} ModelInfo
 * @property {string} id - Model identifier
 * @property {string} provider - Provider name
 * @property {string} name - Display name
 */
