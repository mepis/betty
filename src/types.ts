// ─── WebSocket Protocol Types ────────────────────────────────────────────────

export interface WsMessage {
  type: string;
  [key: string]: unknown;
}

export interface WsPromptMessage {
  type: "prompt";
  message: string;
  images?: Array<{ type: string; data: string; mimeType: string }>;
  streamingBehavior?: "steer" | "followUp";
}

export interface WsAbortMessage {
  type: "abort";
}

export interface WsSetModelMessage {
  type: "set_model";
  provider: string;
  modelId: string;
}

export interface WsSetThinkingLevelMessage {
  type: "set_thinking_level";
  level: string;
}

export interface WsGetStateMessage {
  type: "get_state";
}

export interface WsGetMessagesMessage {
  type: "get_messages";
}

export interface WsGetAvailableModelsMessage {
  type: "get_available_models";
}

export interface WsNewSessionMessage {
  type: "new_session";
}

export interface WsCompactMessage {
  type: "compact";
  customInstructions?: string;
}

export interface WsGetSessionStatsMessage {
  type: "get_session_stats";
}

export interface WsGetForkMessagesMessage {
  type: "get_fork_messages";
}

export interface WsForkMessage {
  type: "fork";
  entryId: string;
}

export interface WsCloneMessage {
  type: "clone";
}

export interface WsSwitchSessionMessage {
  type: "switch_session";
  sessionPath: string;
}

export interface WsSetSessionNameMessage {
  type: "set_session_name";
  name: string;
}

export interface WsGetCommandsMessage {
  type: "get_commands";
}

export interface WsSteerMessage {
  type: "steer";
  message: string;
  images?: Array<{ type: string; data: string; mimeType: string }>;
}

export interface WsFollowUpMessage {
  type: "follow_up";
  message: string;
  images?: Array<{ type: string; data: string; mimeType: string }>;
}

export interface WsBashMessage {
  type: "bash";
  command: string;
}

export interface WsCycleModelMessage {
  type: "cycle_model";
}

export interface WsCycleThinkingLevelMessage {
  type: "cycle_thinking_level";
}

// ─── Server → Client Event Types ────────────────────────────────────────────

export interface WsMessageUpdate {
  type: "message_update";
  message: WsAgentMessage;
  assistantMessageEvent: {
    type: "text_delta" | "thinking_delta" | "toolcall_delta" | "text_start" | "text_end" | "thinking_start" | "thinking_end" | "toolcall_start" | "toolcall_end" | "start" | "done" | "error";
    contentIndex?: number;
    delta?: string;
    content?: string;
    partial?: Record<string, unknown>;
    toolCall?: Record<string, unknown>;
    reason?: string;
  };
}

export interface WsAgentStart { type: "agent_start"; }
export interface WsAgentEnd { type: "agent_end"; messages: WsAgentMessage[]; }
export interface WsTurnStart { type: "turn_start"; }
export interface WsTurnEnd { type: "turn_end"; message?: WsAgentMessage; toolResults?: WsToolResult[]; }

export interface WsToolCallStart {
  type: "tool_execution_start";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface WsToolCallUpdate {
  type: "tool_execution_update";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  partialResult?: { content?: Array<{ type: string; text?: string }>; details?: Record<string, unknown> };
}

export interface WsToolCallEnd {
  type: "tool_execution_end";
  toolCallId: string;
  toolName: string;
  result?: { content?: Array<{ type: string; text?: string }>; details?: Record<string, unknown> };
  isError: boolean;
}

export interface WsQueueUpdate {
  type: "queue_update";
  steering?: string[];
  followUp?: string[];
}

export interface WsCompactionStart { type: "compaction_start"; reason: string; }
export interface WsCompactionEnd { type: "compaction_end"; reason: string; result?: Record<string, unknown>; aborted?: boolean; willRetry?: boolean; }

export interface WsError { type: "error"; message: string; }

export interface WsState { type: "state"; data: WsStateData; }

export interface WsStateData {
  model?: WsModel;
  thinkingLevel?: string;
  isStreaming?: boolean;
  isCompacting?: boolean;
  steeringMode?: string;
  followUpMode?: string;
  sessionFile?: string;
  sessionId?: string;
  sessionName?: string;
  autoCompactionEnabled?: boolean;
  messageCount?: number;
  pendingMessageCount?: number;
}

export interface WsMessages { type: "messages"; data: { messages: WsAgentMessage[]; }; }

export interface WsModels { type: "models"; data: { models: WsModel[]; }; }

export interface WsStats { type: "stats"; data: WsStatsData; }

export interface WsStatsData {
  sessionFile?: string;
  sessionId?: string;
  userMessages?: number;
  assistantMessages?: number;
  toolCalls?: number;
  toolResults?: number;
  totalMessages?: number;
  tokens?: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
  cost?: number;
  contextUsage?: { tokens: number; contextWindow: number; percent: number };
}

export interface WsForkMessages { type: "fork_messages"; data: { messages: Array<{ entryId: string; text: string }>; }; }

export interface WsCommands { type: "commands"; data: { commands: Array<{ name: string; description?: string; source: string; path?: string }>; }; }

export interface WsUiRequest {
  type: "ui_request";
  id: string;
  method: string;
  title?: string;
  message?: string;
  options?: string[];
  placeholder?: string;
  prefill?: string;
  notifyType?: string;
  statusKey?: string;
  statusText?: string;
  widgetKey?: string;
  widgetLines?: string[];
  widgetPlacement?: string;
  timeout?: number;
}

export interface WsSessionSwitched { type: "session_switched"; data: { cancelled: boolean }; }

export interface WsConnected { type: "connected"; }

export interface WsModelChanged { type: "model_changed"; data?: Record<string, unknown>; }
export interface WsThinkingLevelChanged { type: "thinking_level_changed"; data?: Record<string, unknown>; }
export interface WsLastAssistantText { type: "last_assistant_text"; data: { text: string | null }; }
export interface WsBashResult { type: "bash_result"; data: { output: string; exitCode: number; cancelled: boolean; truncated: boolean; fullOutputPath?: string }; }

// ─── Agent Message Types ────────────────────────────────────────────────────

export interface WsAgentMessage {
  role: string;
  content?: string | Array<WsContentBlock>;
  timestamp?: number;
  [key: string]: unknown;
}

export interface WsContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  arguments?: string;
  [key: string]: unknown;
}

export interface WsToolResult {
  role: string;
  toolCallId: string;
  toolName: string;
  content: Array<{ type: string; text?: string }>;
  isError: boolean;
  timestamp?: number;
}

// ─── Model Types ────────────────────────────────────────────────────────────

export interface WsModel {
  id: string;
  name: string;
  api: string;
  provider: string;
  baseUrl?: string;
  reasoning?: boolean;
  input?: string[];
  contextWindow?: number;
  maxTokens?: number;
  cost?: { input: number; output: number; cacheRead: number; cacheWrite: number };
}

// ─── Chat Message (frontend-facing) ─────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  isError?: boolean;
  isComplete?: boolean;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  isScoped?: boolean;
}
