# Bash Tool

## Summary

The bash tool allows the AI agent to execute shell commands on the host system. It is one of the core tools used by pi for file operations, code testing, and system interaction. Betty displays bash command results as tool call cards within the chat.

## Protocol

### Bash Command

```json
{ "type": "bash", "command": "ls -la" }
```

### Bash Result Response

```json
{
  "type": "bash_result",
  "data": {
    "output": "total 48\n-rw-r--r--  1 user  staff  1234 May 16 12:00 server.ts\n-rw-r--r--  1 user  staff   567 May 16 12:00 package.json\n",
    "exitCode": 0,
    "cancelled": false,
    "truncated": false,
    "fullOutputPath": "/tmp/betty-bash-abc123"
  }
}
```

Response fields:
| Field | Type | Description |
|-------|------|-------------|
| `output` | `string` | Command output (stdout + stderr) |
| `exitCode` | `number` | Process exit code (0 = success) |
| `cancelled` | `boolean` | Whether the command was cancelled |
| `truncated` | `boolean` | Whether output was truncated |
| `fullOutputPath` | `string?` | Path to the full output file (if truncated) |

## Store Actions

| Action | Description |
|--------|-------------|
| `send({ type: "bash", command })` | Execute a bash command |
| `handleWsMessage("bash_result")` | Process and log the result |

## Bash vs Agent-Executed Commands

| Aspect | Bash Tool (`bash` command) | Agent Tool (read/edit/write) |
|--------|---------------------------|------------------------------|
| Triggered by | Explicit `bash` WebSocket command | Agent autonomously during response |
| Displayed in UI | `bash_result` event logged | Tool call cards in messages |
| Control | User-initiated | Agent-controlled |

## Security Considerations

Bash commands execute with the same privileges as the server process. See [[docs/audit.md]] for security findings related to command execution.

### Recommendations

- Never expose the server to untrusted networks
- Use a reverse proxy with authentication
- Consider sandboxing the server process

## Tags

- **category**: feature, tools
- **component**: server.ts, stores/chat.ts
- **pattern**: command-execution, tool-visualization
- **audience**: developers, users
