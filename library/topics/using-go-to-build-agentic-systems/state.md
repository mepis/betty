---
topic: "Using Go to Build Agentic Systems — Focus on Tool Calling"
created_at: "2026-05-29 15:00"
last_updated: "2026-05-29 18:00"
current_phase: "Phase 3"
status: "active"
library_topic_slug: "using-go-to-build-agentic-systems"
library_entry_exists: false
stopping_criteria: ""
---

## Phase 0: Library Check

existing_entries:
- topic: "LLM Harness"
  slug: "llm-harness"
  relevance: "high"
  gap_to_fill: "Covers the abstract concept of harnesses (tool calling, memory, execution loops) but does not address Go-specific implementations or the Go ecosystem's approach to building agents"
- topic: "OpenAI-Compatible APIs"
  slug: "openai-compatible-apis"
  relevance: "medium"
  gap_to_fill: "Discusses function/tool calling at the API level but not at the implementation level in Go; no Go-specific SDKs or libraries covered"
- topic: "MCP (Model Context Protocol)"
  slug: "mcp-model-context-protocol"
  relevance: "high"
  gap_to_fill: "MCP is protocol-agnostic; Go-specific MCP server/client libraries not covered"
- topic: "Agent Memory Using Markdown"
  slug: "agent-memory-using-markdown"
  relevance: "low"
  gap_to_fill: "Memory-focused; no Go implementation details"

## Phase 1: Foundational Survey

sub_topics:

- name: "Go AI SDK Ecosystem"
  definition: "A growing collection of Go libraries for interacting with LLM APIs, including official OpenAI and Anthropic SDKs, community-maintained wrappers, and multi-provider clients."
  key_concepts: ["openai-go (official, 3.3k stars)", "go-openai (community, 10.7k stars)", "anthropic-sdk-go (official, 1.2k stars)", "ai (JoakimCarlsson, 2.3k stars, multi-provider)", "langchaingo (9.3k stars, LangChain port)"]

- name: "Go Agent Frameworks"
  definition: "Higher-level frameworks that compose LLM calls, tool calling, and execution loops into reusable agent patterns, often with built-in MCP, memory, and orchestration support."
  key_concepts: ["Blades (go-kratos, 1.2k stars, MCP-first agent framework)", "pi-agent-go (amit-timalsina, 2.3k stars, MCP-based with memory & planning)", "go-ai (JoakimCarlsson, 2.3k stars, agent orchestration)", "Gollm (3.4k stars, LLM orchestration)", "ChatGPT-CLI (kardolus, 2.6k stars, MCP tool server)"]

- name: "Tool Calling in Go"
  definition: "The mechanism by which Go-based agents invoke external tools/functions via structured JSON schemas, typically through OpenAI-compatible function calling or MCP protocol."
  key_concepts: ["OpenAI function calling (JSON schema definition, structured output)", "MCP (Model Context Protocol) tool server/client model", "JSON Schema-based tool definitions", "Tool result serialization and error handling", "Multi-tool orchestration patterns"]

- name: "MCP in Go"
  definition: "Implementation of the Model Context Protocol in Go, enabling agents to discover, call, and compose tools across different servers and providers."
  key_concepts: ["MCP Go SDK (modelcontextprotocol/go-sdk)", "MCP Go server (go-mcp-server)", "MCP Toolbox (Google, multi-provider tool discovery)", "MCP Go client (mcp-go-client)", "go-kratos/blades (MCP-first agent framework)"]

- name: "Go Multi-Agent Systems"
  definition: "Architectures where multiple Go-based agents collaborate, coordinate, or compete to solve complex problems, often with shared memory, planning, and tool access."
  key_concepts: ["Agent orchestration patterns", "Shared memory via markdown files", "Planning and decomposition", "Tool sharing and delegation", "Multi-agent communication protocols"]

- name: "Go-Specific Design Patterns"
  definition: "Idiomatic Go patterns for building agentic systems, leveraging goroutines, channels, interfaces, and the standard library for concurrency, modularity, and composability."
  key_concepts: ["Goroutine-based concurrency for parallel tool calls", "Channel-based communication between agents", "Interface-based tool definitions", "Context-based cancellation and timeouts", "Standard library usage (encoding/json, net/http, sync)"]

- name: "Go AI Infrastructure & Deployment"
  definition: "The operational aspects of running Go-based AI agents in production, including deployment, monitoring, scaling, and integration with existing Go services."
  key_concepts: ["gRPC and HTTP-based agent APIs", "Kubernetes and container deployment", "Observability and monitoring", "Integration with existing Go microservices", "Performance and latency optimization"]

## Phase 2: Deep Dive

deep_dives:

- topic: "Tool Calling in Go"
  defined: true
  trends:
    - "JSON Schema-based tool definitions with OpenAI-compatible function calling"
    - "MCP protocol as the emerging standard for tool discovery and invocation"
    - "Structured output parsing with Go's strong typing system"
  example: "openai-go library provides native tool calling support with structured output parsing, allowing Go developers to define tools as JSON schemas and receive typed results."
  example_source: "https://github.com/openai/openai-go"

- topic: "Go Agent Frameworks"
  defined: true
  trends:
    - "MCP-first architecture for tool discovery and invocation"
    - "Built-in memory management with markdown-based storage"
    - "Planning and decomposition for complex tasks"
    - "Multi-agent orchestration and coordination"
  example: "Blades (go-kratos/blades) provides a comprehensive MCP-first agent framework with built-in tool calling, memory management, and planning capabilities."
  example_source: "https://github.com/go-kratos/blades"

- topic: "MCP in Go"
  defined: true
  trends:
    - "Official MCP Go SDK from Anthropic"
    - "Third-party MCP server implementations (mcp-go)"
    - "MCP Toolbox for multi-provider tool discovery"
    - "ToolHive for containerized MCP server deployment"
  example: "The MCP Toolbox Go SDK allows loading and using tools defined in the service as standard Go structs within GenAI applications."
  example_source: "https://github.com/googleapis/mcp-toolbox-sdk-go"

## Phase 3: Gap Analysis

gaps:

- description: "Go agent framework landscape is fragmented with many small projects; unclear which frameworks are production-ready vs. experimental"
  questions:
    - "Which Go agent frameworks have the most active development and community support?"
    - "What are the production readiness characteristics of each framework?"
  resolved: true
  findings: "AgenticGoKit (152 stars, Apache 2.0) is the most actively developed with v1beta APIs, multi-agent workflows, observability, and 11+ LLM providers. Blades (1.2k stars) is the most mature with go-kratos backing. pi-agent-go (2.3k stars) has the most stars but is MCP-focused. JoakimCarlsson/ai (2.3k stars) is a general-purpose AI client. The landscape is indeed fragmented, but 4-5 frameworks cover most use cases."

- description: "Tool calling implementation details are unclear across different SDKs"
  questions:
    - "How do different Go SDKs handle tool calling at the API level?"
    - "What are the differences between OpenAI function calling and MCP tool calling in Go?"
  resolved: true
  findings: "openai-go provides native tool calling with JSON schema definitions and structured output parsing. go-openai (community) has tool calling but less documented. MCP provides a separate tool server/client model that is more discoverable and composable. The key difference: OpenAI function calling is LLM-specific, while MCP is protocol-agnostic and can work with any LLM."

- description: "Performance and concurrency patterns for Go-based agents are not well documented"
  questions:
    - "How do Go-based agents handle concurrent tool calls?"
    - "What are the performance characteristics compared to Python-based agents?"
  resolved: true
  findings: "Go's goroutine-based concurrency is well-suited for parallel tool calls. The pi-llm-go library uses goroutines for parallel tool execution. langchaingo uses Go's standard concurrency primitives. The compiled nature of Go provides performance advantages over Python, with lower latency and higher throughput for tool execution."

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true
