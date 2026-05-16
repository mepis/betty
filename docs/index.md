# Betty — Documentation Index

## Overview

**Betty** is a web-based AI coding assistant built as a thin UI layer over [pi](https://pi.dev), the minimal terminal coding harness. It translates pi's RPC mode into a real-time WebSocket chat interface built with Vue 3, Vite, Pinia, and WebSocket communication.

## Documentation

### Architecture

| Page | Summary |
|------|---------|
| [[Architecture Deep Dive]] | System design, data flow, component relationships, and module map |

### Reference

| Page | Summary |
|------|---------|
| [[Server (`server.ts`)]] | Node.js backend: WebSocket server, RPC client wrapper, command handlers |
| [[Frontend (`src/`)]] | Vue 3 frontend: App.vue, main.ts, Vite configuration, theming |
| [[Chat Store (`stores/chat.ts`)]] | Pinia store: WebSocket client, state management, event handling |
| [[Type Definitions (`types.ts`)]] | TypeScript interfaces for the WebSocket protocol and frontend types |
| [[WebSocket Protocol Reference]] | Complete client-server message protocol specification |

### Features

| Page | Summary |
|------|---------|
| [[Chat Interface]] | Core chat UI: streaming, tool calls, markdown rendering, keyboard shortcuts |
| [[Session Management]] | Session lifecycle: create, switch, fork, clone, compact |
| [[Model Selection]] | Model switching: selector modal, badge, cycling |
| [[Thinking Level]] | Thinking control: levels, cycling, settings panel |
| [[Tool Calls]] | Tool execution visualization: bash, read, edit, write, status cards |

### QA

| Page | Summary |
|------|---------|
| [[Quick Start & QA]] | Setup guide, usage examples, troubleshooting, WebSocket testing |

### Review

| Page | Summary |
|------|---------|
| [[Repository Audit]] | Security findings, code quality assessment, recommendations |

## Quick Links

- **Getting started**: [[Quick Start & QA]]
- **How it works**: [[Architecture Deep Dive]]
- **Protocol spec**: [[WebSocket Protocol Reference]]
- **Server code**: [[Server (`server.ts`)]]
- **Frontend code**: [[Frontend (`src/`)]]
- **WebSocket store**: [[Chat Store (`stores/chat.ts`)]]
- **Type definitions**: [[Type Definitions (`types.ts`)]]
- **Audit report**: [[Repository Audit]]

## Project Structure

```
betty/
├── server.ts              # Node.js backend (WebSocket + RPC wrapper)
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
├── index.html              # Entry HTML
├── .env                    # Environment variables
├── dist/                   # Production build output
├── src/
│   ├── main.ts             # Vue app entry point
│   ├── App.vue             # Main component (chat UI + modals)
│   ├── types.ts            # TypeScript types for WS protocol
│   └── stores/
│       └── chat.ts         # Pinia store (WebSocket + state)
└── docs/                   # This documentation
    ├── index.md            # This file
    ├── architecture.md     # Architecture deep dive
    ├── tags.md             # Tag index
    ├── audit.md            # Repository audit report
    ├── reference/
    │   ├── server.md       # Server documentation
    │   ├── frontend.md     # Frontend documentation
    │   ├── store/
    │   │   └── chat.md     # Chat store documentation
    │   ├── types.md        # Type definitions
    │   └── protocol.md     # Protocol reference
    ├── features/
    │   ├── chat.md         # Chat interface
    │   ├── session-management.md  # Session management
    │   ├── model-selection.md     # Model selection
    │   ├── thinking-level.md      # Thinking level
    │   └── tool-calls.md         # Tool calls
    └── qa/
        └── quickstart.md   # Quick start & QA
```

## Tags

- **category**: index, overview
- **audience**: all
- **component**: documentation
- **pattern**: project-structure
