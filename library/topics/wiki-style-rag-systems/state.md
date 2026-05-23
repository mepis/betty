---
topic: "Wiki-Style RAG Systems"
created_at: "2026-05-21 12:00"
last_updated: "2026-05-21 13:30"
current_phase: "Complete"
status: "completed"
stopping_criteria: "B — Self-critique determines the next step yields only minor, redundant detail. The three-phase research has covered: (1) the Karpathy LLM Wiki pattern and its ecosystem, (2) the first preregistered empirical comparison showing wiki's synthesis advantage vs cost disadvantage, (3) STORM's academic lineage in wiki-style article generation, (4) hybrid architecture trends showing 75% of enterprises will combine wiki+RAG+agentic search by end of 2026, (5) enterprise-scale implementations from PaperQA2 and OpenScholar. Further research would only refine implementation details of known architectures."
---

## Phase 1: Foundational Survey

sub_topics:

- name: "LLM-Compiled Wiki (Karpathy Pattern)"
  definition: An architecture where an LLM incrementally builds and maintains a persistent, cross-linked markdown wiki from raw source documents, rather than retrieving raw chunks at query time.
  key_concepts: ["incremental knowledge compilation", "persistent cross-linked markdown", "Obsidian as IDE", "index.md + log.md navigation", "compile-once query-later paradigm"]

- name: "Vector RAG vs Compiled Wiki Comparison"
  definition: A preregistered head-to-head comparison showing that wiki-style systems excel at cross-paper synthesis but cost 21× more per query than single-round vector RAG.
  key_concepts: ["preregistered comparison (Cochran 2026)", "inter_paper_mapping advantage (+6.625)", "cost asymmetry refuted", "claim-level citation support", "decomp-RAG as third option"]

- name: "STORM — Wikipedia-Style Article Generation"
  definition: A Stanford system where LLM agents role-play as "Wikipedia editors" and "experts" to generate Wikipedia-like articles from scratch, integrating RAG for source retrieval.
  key_concepts: ["multi-agent editor/expert role-play", "Shao et al. 2024 (arXiv:2402.14207)", "outline-first then expand", "FreshWiki benchmark", "80% editor approval rate"]

- name: "MediaWiki RAG (Wiki-RAG)"
  definition: An experimental system by Moodle that ingests MediaWiki sites via their API and provides an OpenAI-compatible interface for RAG-powered question answering over wiki content.
  key_concepts: ["MediaWiki API ingestion", "Milvus vector store", "incremental loading", "MCP server integration", "OpenAI API compatibility"]

- name: "Graph-Based and Hierarchical Memory RAG"
  definition: Related approaches that use entity graphs, recursive summary trees, or knowledge graphs as intermediate representations between raw documents and query-time retrieval.
  key_concepts: ["GraphRAG (Microsoft)", "RAPTOR (recursive trees)", "PaperQA2", "OpenScholar", "compiled abstractive memory"]

- name: "WikiAutoGen — Multi-Modal Wiki Generation"
  definition: An ICCV 2025 system for automatically generating Wikipedia-style articles that integrate both text and multimodal content (images, figures).
  key_concepts: ["ICCV 2025", "multi-modal article generation", "comparison with STORM", "text and image synthesis", "automated encyclopedia creation"]

- name: "Evaluation Challenges for Wiki-Style Systems"
  definition: Methodological challenges in evaluating wiki-style RAG systems, including LLM-as-judge calibration drift, ceiling effects, and the distinction between holistic groundedness and claim-level citation support.
  key_concepts: ["ceiling-judge finding", "inter-rater reliability", "holistic vs per-citation grounding", "rubric operational definitions", "judge calibration sensitivity"]

## Phase 2: Deep Dive

deep_dives:

- topic: "LLM-Compiled Wiki (Karpathy Pattern)"
  defined: true
  trends: ["Obsidian as the IDE frontend with LLM agent writing/maintaining the wiki", "qmd as local search engine providing BM25+vector+LLM re-ranking", "MCP server integration enabling agentic access to the wiki", "Git-based version control for the wiki as a knowledge codebase", "Personal/research/business applications expanding from niche to mainstream"]
  example: "Karpathy's original gist (April 2026) describes a three-layer architecture: raw sources (immutable), the wiki (LLM-maintained cross-linked markdown), and the schema (configuration file). The LLM performs three operations: Ingest (read source, write summary, update pages), Query (search index, read pages, synthesize answer), and Lint (health-check for contradictions, stale claims, orphan pages). Tools mentioned: Obsidian Web Clipper, qmd, Marp, Dataview."
  example_source: "Karpathy, Andrej. 'llm-wiki.' GitHub Gist, April 2026. https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"

- topic: "Vector RAG vs Compiled Wiki — Empirical Evidence"
  defined: true
  trends: ["First preregistered head-to-head comparison (Cochran, May 2026)", "Wiki wins on cross-paper synthesis (inter_paper_mapping +6.625) but loses on cost (21× per query)", "Decomp-RAG recovers 88% of wiki's synthesis advantage at 3.4× lower cost", "Claim-level grounding analysis reverses rubric groundedness verdict", "Evaluation methodology reveals ceiling-judge effects in LLM-as-judge scoring"]
  example: "Cochran's study compared single-round Vector RAG and LLM-Compiled Wiki on 13 questions across 24 papers in three domains. Wiki scored much better at connecting findings across papers (inter_paper_mapping +6.625, strong Bayesian support P=0.967), but the wiki spent 21× more tokens per query (1,651,357 vs 78,093), refuting the amortization hypothesis. A decomp-RAG ablation recovered ~88% of the wiki's synthesis advantage at 6.3× single-round cost (3.4× cheaper than wiki)."
  example_source: "Cochran, Theodore O. 'Vector RAG vs LLM-Compiled Wiki: A Preregistered Comparison on a Small Multi-Domain Research Corpus.' arXiv:2605.18490v1, May 2026. https://arxiv.org/html/2605.18490v1"

- topic: "STORM — Academic Wikipedia-Style Generation"
  defined: true
  trends: ["Multi-agent role-play: editor agents + expert agents in simulated conversations", "Perspective-guided question asking discovers diverse viewpoints", "Outline-first then expand: pre-writing stage separated from drafting", "FreshWiki dataset created for evaluation of recent Wikipedia articles", "Human evaluation by experienced Wikipedia editors shows 80% approval rate"]
  example: "STORM (Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking) by Shao et al. (Stanford, Feb 2024) models the pre-writing stage through: (1) discovering diverse perspectives via research, (2) simulating conversations where writers carrying different perspectives pose questions to a topic expert grounded on trusted Internet sources, and (3) curating collected information to create an outline. Compared to outline-driven RAG baselines, STORM articles showed 25% absolute increase in organization and 10% increase in coverage breadth."
  example_source: "Shao, Yijia et al. 'Assisting in Writing Wikipedia-like Articles From Scratch with Large Language Models.' arXiv:2402.14207, Feb 2024. https://arxiv.org/html/2402.14207v1"

## Phase 3: Gap Analysis

gaps:

- description: "Source fidelity validation gap: Cochran's study measures evidence-artifact alignment but does not validate whether wiki compilation preserves original PDF source fidelity."
  questions: ["Does the wiki compilation step introduce factual drift from the original source documents?", "How does paraphrase quality in wiki pages compare to verbatim RAG chunks for claim-level grounding?"]
  resolved: true
  findings: "Cochran explicitly identifies this as the primary follow-up: future work should compare claim-level grounding against original PDF passages rather than against the cited evidence artifact only. The paper notes that wiki's compilation step pre-positions evidence in 'claim-shaped artifacts' but does not measure whether this transformation preserves source fidelity. The 1 contradicted claim out of 466 total was a single-word paraphrase artifact (95% → over 95%). Karpathy himself notes the wiki is 'conceptually an LLM-built version' of compiled abstractive memory, implying the transformation loss is acknowledged."

- description: "Human evaluation gap: All evaluations to date use LLM-as-judge scoring with known calibration drift issues."
  questions: ["How do expert human evaluators rank wiki-style vs RAG outputs on groundedness and synthesis quality?", "Do human editors prefer wiki-style or RAG-style output formats for research synthesis?"]
  resolved: true
  findings: "STORM is the only system evaluated by human experts: experienced Wikipedia editors found 80% of STORM articles helpful for editing, and STORM articles showed 25% absolute increase in organization and 10% increase in coverage breadth compared to RAG baselines. Cochran explicitly flags human evaluation as 'the most consequential gap' and the 'highest-priority future work.' No other wiki-style or RAG comparison has conducted human-in-the-loop evaluation. The IRR findings (max-delta of 6-8 across criteria) demonstrate LLM-judge calibration drift is substantial enough that human validation would be transformative."

- description: "Enterprise scale generalization: All empirical comparisons use small corpora (24 papers, 13 questions). Wiki-style systems have not been tested at enterprise scale."
  questions: ["How does the wiki architecture scale beyond 100-200 pages where index.md becomes unwieldy?", "What search infrastructure is needed for wiki-scale knowledge bases?"]
  resolved: true
  findings: "Karpathy acknowledges wiki scales poorly beyond ~100-200 pages and recommends qmd for larger wikis. The ecosystem has evolved to Tier 4 architectures combining 'wiki + RAG + knowledge graph' for enterprise scale. Techment data shows 75% of enterprise applications will use hybrid architectures by end of 2026. OpenScholar (Allen AI) and PaperQA2 represent the largest-scale implementations of wiki-like knowledge bases, with OpenScholar evaluating on ScholarQABench comprising 2,967 expert-validated questions. Enterprise RAG implementations cost $100,000-$200,000 for complete systems, and LLM Wiki setup costs are 'ridiculously low' for personal use but 'costly for enterprise-scale ingestion pipelines' at 50,000+ documents."

phase_1_complete: true
phase_2_complete: true
phase_3_complete: true
