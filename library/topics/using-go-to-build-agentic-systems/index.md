# Using Go to Build Agentic Systems

**Research date:** 2026-05-29
**Status:** Complete (5-phase research)
**Tags:** golang, ai, agent, tool-calling, mcp, llm, framework

## Overview

This research examines the Go ecosystem for building agentic AI systems, with particular focus on tool calling mechanisms. The Go ecosystem has matured from simple LLM API wrappers to comprehensive agent frameworks with native tool calling support, MCP protocol integration, and production-ready architectures.

## Key Findings

1. **Three architectural approaches coexist:** SDK-level tool calling (OpenAI function calling), protocol-level tool discovery (MCP), and framework-level orchestration (Blades, pi-agent-go, AgenticGoKit).
2. **MCP-first architectures dominate:** The most mature Go agent frameworks (Blades, pi-agent-go) are built around the Model Context Protocol, reflecting its emergence as the de facto standard for tool discovery.
3. **Go's type system provides unique advantages:** Compile-time validation of tool definitions, automatic JSON schema generation, and structured output parsing enable both flexibility and type safety in tool calling.
4. **Robust MCP ecosystem:** Official SDKs from Anthropic and Google, plus third-party implementations (mcp-go, ToolHive, MCP Toolbox), create a comprehensive tool infrastructure for Go-based agents.
5. **Performance advantages:** Compiled execution with goroutine-based concurrency enables efficient parallel tool execution, making Go ideal for production agentic systems.

## Sub-Topics Covered

- Go AI SDK Ecosystem (openai-go, go-openai, anthropic-sdk-go, JoakimCarlsson/ai, langchaingo)
- Go Agent Frameworks (Blades, pi-agent-go, AgenticGoKit, go-ai, Gollm)
- Tool Calling in Go (JSON schema definitions, structured output, error handling)
- MCP in Go (MCP Go SDK, MCP Toolbox, ToolHive)
- Go-Specific Design Patterns (goroutines, channels, interfaces, context)
- Performance and Deployment (containers, Kubernetes, gRPC/HTTP APIs)

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [LLM Harness](../llm-harness/index.md) — Covers the abstract concept of harnesses (tool calling, memory, execution loops)
- [MCP (Model Context Protocol)](../mcp-model-context-protocol/index.md) — Protocol-agnostic MCP overview; this entry covers Go-specific implementations
- [OpenAI-Compatible APIs](../openai-compatible-apis/index.md) — API-level tool calling; this entry covers Go implementation details
