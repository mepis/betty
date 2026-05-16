# Commands

## Summary

The commands feature allows querying the list of available pi commands (tools) that the agent can execute. This includes built-in tools like `read`, `write`, `edit`, `bash`, and any custom commands defined in the pi configuration.

## Protocol

### Get Commands

```json
{ "type": "get_commands" }
```

### Commands Response

```json
{
  "type": "commands",
  "data": {
    "commands": [
      {
        "name": "bash",
        "description": "Execute a bash command",
        "source": "builtin",
        "path": "/pi/tools/bash"
      },
      {
        "name": "read",
        "description": "Read file contents",
        "source": "builtin",
        "path": "/pi/tools/read"
      },
      {
        "name": "edit",
        "description": "Edit file contents",
        "source": "builtin",
        "path": "/pi/tools/edit"
      },
      {
        "name": "write",
        "description": "Write file contents",
        "source": "builtin",
        "path": "/pi/tools/write"
      }
    ]
  }
}
```

Response fields per command:
| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Command/tool name |
| `description` | `string?` | Human-readable description |
| `source` | `string` | Source type (e.g., `builtin`, `custom`) |
| `path` | `string?` | File path to the command implementation |

## Store Actions

| Action | Description |
|--------|-------------|
| `getCommands()` | Fetch available commands from pi |
| `handleWsMessage("commands")` | Process the commands response |

## UI Integration

Currently, the `commands` response is received by the store but not displayed in the UI. The `WsCommands` handler in `handleWsMessage()` is a no-op:

```typescript
case "commands": {
  const m = msg as unknown as WsCommands;
  // Commands response handled by caller
  break;
}
```

Future UI enhancements could display available commands in a sidebar panel or settings section.

## Tags

- **category**: feature, tools
- **component**: stores/chat.ts, server.ts
- **pattern**: tool-discovery
- **audience**: developers, users
