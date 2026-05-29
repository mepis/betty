# LLM Harness

**Research date:** 2026-05-29
**Status:** Complete (3-phase research)
**Tags:** llm, agent-harness, orchestration, security, taxonomy, etclovg, mcp, a2a, data-governance, prism

## Overview

The LLM harness is the structural backbone that orchestrates LLM agent execution — the prompt template, tool calling, memory management, and execution loops that surround a language model. It has emerged in 2025–2026 as a distinct architectural discipline, recognized as potentially more important than the model itself for agent reliability. The industry consensus is that **harness quality matters more than model quality** for agent performance.

## Key Findings

1. **Agent = Model + Harness**: LangChain demonstrated a 13.7-point Terminal Bench gain (52.8% to 66.5%) with zero model changes — purely through harness engineering.
2. **ETCLOVG Taxonomy**: The definitive survey proposes seven layers (Execution, Tools, Context, Lifecycle, Observation, Validation, Guardrails) as the standard way to reason about harness architecture.
3. **Data governance is the biggest gap**: No major harness framework provides data quality governance. Uncertified data causes "confident wrong answers" — the single biggest source of agent failures in production (60-80%).
4. **Security is evolving**: PRISM's zero-fork defense-in-depth and Microsoft's Agent Governance Toolkit address OWASP agentic AI risks. OpenAI introduced "Model-Native Harnesses" in May 2026.
5. **Protocol fragmentation**: MCP (Anthropic) and A2A (Google) are competing standards, with interoperability remaining an open problem.

## Sub-Topics Covered

- Definition & ETCLOVG Taxonomy
- Full-Stack & Specialized Harnesses (AIOS, OpenClaw, LangGraph, OpenHands, SWE-agent)
- Multi-Agent Harnesses (MetaGPT, AutoGen, ChatDev, CAMEL)
- Protocol Standardization (MCP, A2A)
- Safety & Runtime Security (PRISM, Microsoft AGT, OpenAI Sandbox)
- Evaluation & Benchmarking (AgentBench, SWE-bench, HAL, OSWorld)
- Data Governance (the missing piece)
- Enterprise Adoption

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

- [OpenAI Compatible APIs](../openai-compatible-apis/index.md) — Related: API serving format vs. agent orchestration
