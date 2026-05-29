# OpenAI Compatible APIs

**Research date:** 2026-05-29
**Status:** Complete (3-phase research)
**Tags:** openai, api, llm, protocol, llama.cpp, ollama, vllm, litellm, openwebui, mcp, gateway, enterprise

## Overview

The OpenAI-compatible API has become the de facto standard protocol for interacting with large language models across the entire ecosystem. This research maps the landscape from the underlying specification through server implementations, gateway layers, and frontend integrations, revealing a rich and rapidly evolving ecosystem that enables plug-and-play interoperability between model providers, inference engines, and client applications.

## Key Findings

1. **De facto standard without formal governance** — OpenAI maintains an official OpenAPI specification at github.com/openai/openai-openapi, but it is not formally governed as an industry standard, creating potential fragility in the ecosystem.

2. **Diverse server ecosystem** — From llama.cpp and Ollama (simple local inference) to vLLM (production-grade serving), multiple self-hosted servers expose OpenAI-compatible APIs with varying feature completeness.

3. **Gateway layer fills enterprise gaps** — LiteLLM Proxy and OpenRouter provide multi-provider routing, automatic failover, rate limiting, cost tracking, and enterprise authentication that basic implementations lack.

4. **Frontend ecosystem thrives** — OpenWebUI, LobeChat, and other chat UIs support OpenAI-compatible endpoints natively, enabling plug-and-play local model access.

5. **MCP emerging as complementary protocol** — Anthropic's Model Context Protocol provides a universal tool integration layer that could reduce reliance on OpenAI-compatible APIs for tool-calling use cases.

## Sub-Topics Covered

- OpenAI API Specification and official OpenAPI contract
- Local/On-Premise Server Implementations (llama.cpp, Ollama, vLLM, SGLang)
- AI Gateway/Proxy Layer (LiteLLM, OpenRouter, Bifrost)
- Frontend/Ecosystem Integration (OpenWebUI, LobeChat, Chatbot UI)
- Protocol Limitations & Divergence
- Model Context Protocol (MCP) as alternative/complement
- Security & Enterprise Features

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [llama.cpp](../llama.cpp/index.md) — Existing entry on the C++ inference engine
- [gRPC vs REST API Performance](../grpc-vs-rest-api-performance/index.md) — Related to API design
