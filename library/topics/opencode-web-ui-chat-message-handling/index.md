# Opencode Web UI Chat Message Handling

**Research date:** 2026-06-12
**Status:** Complete (codebase analysis)
**Tags:** opencode, web-ui, chat, message-handling, SolidJS, streaming, virtualization, agent-harness

## Overview

Analysis of how OpenCode.ai (by Anomaly, github.com/anomalyco/opencode) handles chat messages in its web UI. Covers the full stack from SDK message types through WebSocket event-driven sync, optimistic UI updates, virtualized timeline rendering, and part-specific tool rendering.

## Key Findings

1. **Event-driven real-time sync via WebSocket** — Server pushes `message.updated`, `message.part.updated`, `message.part.delta` (streaming), and lifecycle events; client-side event reducer applies them to Solid.js stores using binary search for O(log n) upserts.
2. **Optimistic UI updates** — Messages are rendered immediately before server confirmation via `applyOptimisticAdd`, then reconciled with server responses.
3. **User messages as timeline anchors** — Only `UserMessage[]` drives the virtualized timeline; assistant messages are grouped under their parent user message via `parentID` linking.
4. **Rich part system with tool-specific rendering** — 11 part types (text, reasoning, tool, file, subtask, step-start/finish, snapshot, patch, agent, retry, compaction) each with dedicated renderers; tool calls further dispatch to a `ToolRegistry` with 12+ specialized renderers.
5. **Context tool grouping** — Consecutive `read`, `glob`, `grep`, `list` calls are collapsed into a single "Gathering Context" collapsible for cleaner display.
6. **Paced streaming** — Text streams at ~24ms intervals snapping to word boundaries; auto-scroll with 90-frame grace period keeps view anchored during active turns.

## Sub-Topics Covered

- SDK message/part type definitions
- WebSocket event system and event reducer
- Directory sync layer with caching and pagination
- Timeline construction and virtualized rendering
- Part grouping and rendering
- Streaming behavior and auto-scroll

## Files

- [Research notes](report.md)

## Related Topics

- [Opencode.ai Directory Restriction Mechanisms](../opencode-ai-directory-restriction/index.md)
