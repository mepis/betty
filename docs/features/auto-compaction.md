# Auto Compaction

## Summary

Auto compaction controls whether the pi agent automatically compresses conversation context when approaching the context window limit. Users can enable or disable this behavior and also trigger manual compaction with custom instructions.

## Concepts

### Manual Compaction

Users trigger compaction manually through the Settings panel. This compresses the conversation to reduce token usage while preserving key information.

### Auto Compaction

When enabled, the pi agent automatically compacts the conversation when context usage approaches the window limit. This prevents context overflow errors.

## User Interface

### Manual Compaction (Settings Panel)

```
┌──────────────────────────────────┐
│ Settings                   ✕     │
├──────────────────────────────────┤
│ Session                          │
│ [New Session] [Clear Messages]   │
│ [Compact Context]                │
│                                  │
│ [Custom compaction instructions] │
└──────────────────────────────────┘
```

### Auto Compaction Toggle

Accessible via the store action `setAutoCompaction(enabled)`. The current state is reflected in the server's `state` event:

```json
{ "type": "state", "data": { "autoCompactionEnabled": true } }
```

## Protocol

### Manual Compaction

```json
{ "type": "compact", "customInstructions": "Focus on preserving code logic" }
```

### Auto Compaction Toggle

```json
{ "type": "set_auto_compaction", "enabled": true }
{ "type": "set_auto_compaction", "enabled": false }
```

## Events

### Compaction Start

```json
{ "type": "compaction_start", "reason": "context window full" }
```

Emitted when compaction begins. The `reason` field explains why compaction was triggered (manual or automatic).

### Compaction End

```json
{
  "type": "compaction_end",
  "reason": "context window full",
  "result": { "tokensBefore": 50000, "tokensAfter": 15000 },
  "aborted": false,
  "willRetry": false
}
```

Emitted when compaction completes. Fields:
- `result`: Token counts before and after compaction
- `aborted`: Whether compaction was interrupted
- `willRetry`: Whether the agent will retry the interrupted operation

## Store Actions

| Action | Description |
|--------|-------------|
| `compact(customInstructions?)` | Trigger manual context compaction |
| `send({ type: "set_auto_compaction", enabled })` | Enable or disable auto compaction |

## Compaction Instructions

Custom instructions guide how the pi agent should compress the conversation:

```json
{
  "type": "compact",
  "customInstructions": "Preserve all code snippets and technical decisions. Summarize debugging steps."
}
```

Without custom instructions, the agent uses default compaction behavior.

## Compaction Events in the Store

The `handleWsMessage()` function in `stores/chat.ts` handles compaction events:

```typescript
case "compaction_start": {
  console.log("[ws] Compaction started:", m.reason);
  break;
}

case "compaction_end": {
  console.log("[ws] Compaction ended:", m.reason, m.aborted);
  break;
}
```

Currently, these events are logged but not reflected in the UI. Future improvements could show a compaction progress indicator.

## Tags

- **category**: feature, compaction
- **component**: stores/chat.ts, server.ts
- **pattern**: context-management, auto-compaction
- **audience**: developers, users
