# Type Definitions (`types.ts`)

TypeScript interfaces defining the WebSocket protocol and frontend data structures.

## Summary

`types.ts` defines all TypeScript interfaces for the Betty project, organized into four sections: WebSocket protocol types, server-to-client event types, agent message types, and frontend-facing types.

## WebSocket Protocol Types

### Client → Server Messages

| Interface | Required Fields | Description |
|-----------|----------------|-------------|
| `WsPromptMessage` | `type: "prompt"`, `message` | Send a prompt with optional images |
| `WsAbortMessage` | `type: "abort"` | Abort the current streaming response |
| `WsSetModelMessage` | `type: "set_model"`, `provider`, `modelId` | Switch LLM model |
| `WsSetThinkingLevelMessage` | `type: "set_thinking_level"`, `level` | Change thinking level |
| `WsGetStateMessage` | `type: "get_state"` | Query current server state |
| `WsGetMessagesMessage` | `type: "get_messages"` | Fetch message history |
| `WsGetAvailableModelsMessage` | `type: "get_available_models"` | List available models |
| `WsNewSessionMessage` | `type: "new_session"` | Start a new conversation |
| `WsCompactMessage` | `type: "compact"`, `customInstructions?` | Compress conversation context |
| `WsGetSessionStatsMessage` | `type: "get_session_stats"` | Get session statistics |
| `WsGetForkMessagesMessage` | `type: "get_fork_messages"` | Get messages available for forking |
| `WsForkMessage` | `type: "fork"`, `entryId` | Fork conversation at a specific entry |
| `WsCloneMessage` | `type: "clone"` | Clone current session |
| `WsSwitchSessionMessage` | `type: "switch_session"`, `sessionPath` | Switch to another session |
| `WsSetSessionNameMessage` | `type: "set_session_name"`, `name` | Rename the current session |
| `WsGetCommandsMessage` | `type: "get_commands"` | List available pi commands |
| `WsSteerMessage` | `type: "steer"`, `message`, `images?` | Send a steer command |
| `WsFollowUpMessage` | `type: "follow_up"`, `message`, `images?` | Send a follow-up message |
| `WsBashMessage` | `type: "bash"`, `command` | Execute a bash command |
| `WsCycleModelMessage` | `type: "cycle_model"` | Cycle to the next model |
| `WsCycleThinkingLevelMessage` | `type: "cycle_thinking_level"` | Cycle thinking level |

### Server → Client Events

| Interface | Required Fields | Description |
|-----------|----------------|-------------|
| `WsMessageUpdate` | `type: "message_update"`, `message`, `assistantMessageEvent` | Streaming text/thinking/tool delta |
| `WsAgentStart` | `type: "agent_start"` | Agent has started processing |
| `WsAgentEnd` | `type: "agent_end"`, `messages` | Agent finished, includes new messages |
| `WsTurnStart` | `type: "turn_start"` | Turn started |
| `WsTurnEnd` | `type: "turn_end"`, `message?`, `toolResults?` | Turn ended |
| `WsToolCallStart` | `type: "tool_execution_start"`, `toolCallId`, `toolName`, `args` | Tool execution started |
| `WsToolCallUpdate` | `type: "tool_execution_update"`, `toolCallId`, `toolName`, `args`, `partialResult?` | Tool execution progress update |
| `WsToolCallEnd` | `type: "tool_execution_end"`, `toolCallId`, `toolName`, `result?`, `isError` | Tool execution completed |
| `WsQueueUpdate` | `type: "queue_update"`, `steering?`, `followUp?` | Queue status update |
| `WsCompactionStart` | `type: "compaction_start"`, `reason` | Compaction started |
| `WsCompactionEnd` | `type: "compaction_end"`, `reason`, `result?`, `aborted?`, `willRetry?` | Compaction finished |
| `WsError` | `type: "error"`, `message` | Error occurred |
| `WsState` | `type: "state"`, `data` | Server state update |
| `WsMessages` | `type: "messages"`, `data` | Message history response |
| `WsModels` | `type: "models"`, `data` | Available models response |
| `WsStats` | `type: "stats"`, `data` | Session stats response |
| `WsForkMessages` | `type: "fork_messages"`, `data` | Forkable messages response |
| `WsCommands` | `type: "commands"`, `data` | Available commands response |
| `WsUiRequest` | `type: "ui_request"`, `id`, `method` | Extension UI request from pi |
| `WsSessionSwitched` | `type: "session_switched"`, `data` | Session switch completed |
| `WsConnected` | `type: "connected"` | Connection acknowledged |
| `WsModelChanged` | `type: "model_changed"`, `data?` | Model change notification |
| `WsThinkingLevelChanged` | `type: "thinking_level_changed"`, `data?` | Thinking level change notification |
| `WsLastAssistantText` | `type: "last_assistant_text"`, `data` | Last assistant text response |
| `WsBashResult` | `type: "bash_result"`, `data` | Bash command result |

## Data Type Definitions

### WsStateData

```typescript
interface WsStateData {
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
```

### WsStatsData

```typescript
interface WsStatsData {
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
```

### WsModel

```typescript
interface WsModel {
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
```

### WsAgentMessage

```typescript
interface WsAgentMessage {
  role: string;
  content?: string | Array<WsContentBlock>;
  timestamp?: number;
  [key: string]: unknown;
}
```

### WsContentBlock

```typescript
interface WsContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  arguments?: string;
  [key: string]: unknown;
}
```

### WsToolResult

```typescript
interface WsToolResult {
  role: string;
  toolCallId: string;
  toolName: string;
  content: Array<{ type: string; text?: string }>;
  isError: boolean;
  timestamp?: number;
}
```

## Frontend Types

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
}
```

### ToolCallInfo

```typescript
interface ToolCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  isError?: boolean;
  isComplete?: boolean;
}
```

### ModelOption

```typescript
interface ModelOption {
  id: string;
  name: string;
  provider: string;
  isScoped?: boolean;
}
```

## Base Type

### WsMessage

```typescript
interface WsMessage {
  type: string;
  [key: string]: unknown;
}
```

The base interface for all WebSocket messages. Used for parsing before narrowing to specific interfaces.

## Tags

- **category**: types, protocol
- **component**: types.ts
- **pattern**: TypeScript interfaces, discriminated unions
- **audience**: developers, engineers
