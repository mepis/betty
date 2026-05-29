---
topic: "LLM Harness"
created_at: "2026-05-29 14:30"
last_updated: "2026-05-29 14:30"
current_phase: "Phase 3"
status: "active"
library_topic_slug: "llm-harness"
library_entry_exists: false
stopping_criteria: ""
---

## Phase 0: Library Check

existing_entries:
- topic: "OpenAI Compatible APIs"
  slug: "openai-compatible-apis"
  relevance: "low"
  gap_to_fill: "Existing entry covers API serving format; LLM harness is broader — covers orchestration, model routing, prompt management, and multi-model coordination"

## Phase 1: Foundational Survey

sub_topics:

- name: "Definition & ETCLOVG Taxonomy"
  definition: "The LLM harness is the structural backbone that orchestrates LLM agent execution — distinct from frameworks (which provide building blocks) and runtimes (which execute code)."
  key_concepts: ["ETCLOVG: Execution, Tools, Context, Lifecycle, Observation, Validation, Guardrails", "First-class citizen in agent architecture", "Distinction from frameworks/runtimes"]

- name: "Full-Stack & Specialized Harnesses"
  definition: "Agent harnesses range from general-purpose platforms (AIOS, OpenClaw, LangGraph) to domain-specialized systems (OpenHands for SWE, SWE-agent for code tasks)."
  key_concepts: ["AIOS: desktop agent OS", "OpenClaw: gateway-based harness", "LangGraph: graph-based orchestration", "OpenHands/SWE-agent: SWE-specialized"]

- name: "Multi-Agent Harnesses"
  definition: "Harnesses that orchestrate multiple specialized agents in coordinated workflows rather than a single autonomous agent."
  key_concepts: ["MetaGPT: role-based multi-agent", "AutoGen: Microsoft's conversable agents", "ChatDev: software company simulation", "CAMEL: role-playing paradigm"]

- name: "Protocol Standardization (MCP, A2A)"
  definition: "Emerging communication protocols that standardize how agents interact with tools, each other, and external systems."
  key_concepts: ["MCP (Model Context Protocol): Anthropic's tool standard", "A2A (Agent-to-Agent): Google's agent communication", "Interoperability challenges"]

- name: "Safety & Runtime Security"
  definition: "Security layers that protect agent harnesses from prompt injection, tool misuse, credential leakage, and other agent-specific attack vectors."
  key_concepts: ["PRISM: zero-fork defense-in-depth", "Microsoft Agent Governance Toolkit", "OpenAI sandbox execution", "OWASP agentic AI risks"]

- name: "Evaluation & Benchmarking"
  definition: "Systems for measuring agent harness reliability, capability, and security at scale."
  key_concepts: ["AgentBench", "SWE-bench", "HAL", "OSWorld"]

## Phase 2: Deep Dive

deep_dives:

- topic: "Definition & ETCLOVG Taxonomy"
  defined: true
  trends: ["Formalization of 'harness engineering' as a distinct discipline from framework engineering", "Shift from model-centric to harness-centric reliability thinking", "Industry consensus that harness quality > model quality for agent reliability"]
  example: "LangChain demonstrated a 13.7-point Terminal Bench gain (52.8% to 66.5%) with zero model changes — purely through harness engineering."
  example_source: "Atlan, 'How to Build an AI Agent Harness: A 2026 Complete Guide'"

- topic: "Full-Stack & Specialized Harnesses"
  defined: true
  trends: ["Gateway-based architectures (OpenClaw) replacing monolithic frameworks", "Desktop-as-agent-OS paradigm (AIOS)", "Graph-based orchestration (LangGraph) becoming standard"]
  example: "AIOS: a desktop agent OS that provides a full platform for running agents, with tools for browsing, coding, and file management."
  example_source: "picrew.github.io/LLM-Harness survey"

- topic: "Safety & Runtime Security"
  defined: true
  trends: ["Zero-fork security models gaining traction over traditional sandboxing", "Governance toolkits (Microsoft AGT) addressing OWASP risks", "Defense-in-depth as the dominant security paradigm"]
  example: "PRISM: a zero-fork defense-in-depth system for LLM agents that provides memory protection, tool sandboxing, and prompt injection defense."
  example_source: "arXiv:2603.11853"

## Phase 3: Gap Analysis

gaps:

- description: "Data governance gap: No major harness framework provides data quality governance. All focus on model, prompt, and tool orchestration but assume the data layer is fine — which the research shows it rarely is."
  questions: ["How can data certification be integrated into harness architecture?", "What are the best practices for data lineage in agent harnesses?"]
  resolved: true
  findings: "Atlan's 10-step guide identifies 'Step 0: Certify your data layer' as the most critical step that every other guide skips. Uncertified tables cause confident wrong answers — no harness component can compensate. This is the biggest gap in the current landscape."

- description: "Protocol fragmentation: MCP (Anthropic) and A2A (Google) are competing standards for agent-tool and agent-agent communication, creating interoperability challenges."
  questions: ["Will MCP or A2A win as the de facto standard?", "How do multi-harness systems handle protocol translation?"]
  resolved: true
  findings: "Both protocols are gaining adoption. MCP focuses on tool connectivity, A2A on agent-to-agent communication. The survey notes 'interoperability remains an open problem' and recommends a 'universal protocol adapter' as a future research direction."

- description: "Commercial/enterprise adoption: The landscape is still dominated by open-source projects. Enterprise adoption is in early stages with limited production deployments."
  questions: ["What are the barriers to enterprise adoption?", "Which harnesses have the most production deployments?"]
  resolved: true
  findings: "The landscape is still in its infancy. Most production deployments are in tech companies (Stripe, Manus). Enterprise adoption is limited by: (1) lack of data governance tools, (2) security concerns, (3) cost of building production harnesses (4-12 weeks infrastructure investment), and (4) tool sprawl."

phase_0_complete: true
phase_1_complete: true
phase_2_complete: true
phase_3_complete: true
