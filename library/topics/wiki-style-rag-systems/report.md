# ANALYTICAL REPORT: Wiki-Style RAG Systems

## Executive Summary

This report traces the emerging field of wiki-style Retrieval-Augmented Generation (RAG) systems — architectures that compile knowledge into persistent, cross-linked, LLM-maintained representations rather than retrieving raw document fragments at query time. The research spans three phases: a foundational survey mapping the landscape, deep dives into the three most critical sub-topics (the Karpathy LLM Wiki pattern, the first preregistered empirical comparison, and STORM's academic lineage), and a recursive gap analysis resolving outstanding uncertainties.

The field crystallized in April 2026 when Andrej Karpathy published his "llm-wiki" GitHub Gist, proposing a radical inversion of the RAG paradigm: instead of retrieving raw chunks at query time, the LLM compiles structured knowledge in markdown once and consults that already-digested knowledge on every subsequent query. Within 24 hours, the post went viral and inspired a dozen open-source implementations. This was followed in May 2026 by the first preregistered head-to-head comparison of wiki-style systems against vector RAG, which found that wiki excels at cross-paper synthesis but costs 21× more per query — refuting the expected amortization advantage.

The research reveals that grounded research synthesis is not a single capability: no single architecture optimizes for synthesis quality, claim-level citation support, and cost simultaneously. Instead, the field is converging on hybrid architectures, with 75% of enterprise applications projected to combine wiki-style compilation, vector RAG, and agentic search by the end of 2026. The key insight is that wiki-style systems trade query-time efficiency for compile-time knowledge organization, and this tradeoff is beneficial only when the knowledge base is small-to-moderate in size and the queries benefit from cross-document synthesis rather than single-document lookups.

## Methodology

This research followed a three-phase workflow:

**Phase 1: Foundational Survey** mapped the domain by conducting broad searches across six sub-topics: the Karpathy LLM Wiki pattern, empirical comparisons between wiki and RAG, STORM's Wikipedia-style article generation, MediaWiki-specific RAG implementations, graph-based and hierarchical memory approaches, and evaluation methodology challenges. Seven distinct sub-topics were identified and characterized.

**Phase 2: Deep Dive** systematically explored the three most critical sub-topics: (1) the Karpathy pattern and its ecosystem of tools (Obsidian, qmd, MCP servers), (2) Cochran's preregistered comparison of Vector RAG vs LLM-Compiled Wiki, and (3) STORM from Stanford as the academic lineage of wiki-style knowledge curation. Each deep dive included thorough definitions, trend analysis, and concrete examples with source citations.

**Phase 3: Recursive Gap Analysis** identified three areas of thin or contradictory knowledge — source fidelity validation, human evaluation, and enterprise scale generalization — and resolved all three through targeted research. Stopping criteria B was triggered: self-critique determined that further research would yield only minor, redundant detail about known architectures and implementation patterns.

## Detailed Findings

### 1. The LLM-Compiled Wiki Pattern (Karpathy Pattern)

**Definition.** The LLM-Compiled Wiki is an architecture where an LLM incrementally builds and maintains a persistent, cross-linked markdown wiki from raw source documents, rather than retrieving raw chunks at query time. The core insight is the inversion of the RAG paradigm: instead of querying raw documents at every query, the LLM compiles structured knowledge once and consults that already-digested knowledge on every subsequent query.

**Architecture.** The pattern consists of three layers (Karpathy 2026):

1. **Raw sources** — A curated collection of immutable source documents (articles, papers, images, data files). The LLM reads from them but never modifies them.
2. **The wiki** — A directory of LLM-generated markdown files organized by entity, concept, and topic. The LLM owns this layer entirely: it creates pages, updates them when new sources arrive, maintains cross-references, and keeps everything consistent.
3. **The schema** — A configuration document (e.g., CLAUDE.md or AGENTS.md) that defines the wiki's structure, conventions, and workflows. This is the key configuration file that makes the LLM a disciplined wiki maintainer rather than a generic chatbot.

**Operations.** The LLM performs three primary operations:

- **Ingest:** When a new source is added, the LLM reads it, identifies entities and concepts, writes a summary page, updates existing wiki pages, flags contradictions, and appends an entry to a chronological log.
- **Query:** The LLM searches for relevant wiki pages, reads them, and synthesizes an answer with citations. Good answers can be filed back into the wiki as new pages, compounding the knowledge base.
- **Lint:** Periodic health-checks for contradictions between pages, stale claims superseded by newer sources, orphan pages with no inbound links, and data gaps that could be filled with a web search.

**Navigation.** Two special files help navigate the wiki as it grows. `index.md` is content-oriented: a catalog of every page with a link, one-line summary, and metadata, organized by category. `log.md` is chronological: an append-only record of what happened and when, parseable with simple Unix tools. At moderate scale (~100 sources, hundreds of pages), the index file works surprisingly well and avoids the need for embedding-based RAG infrastructure (Karpathy 2026).

**Tooling Ecosystem.** The ecosystem has evolved around several key tools:

- **Obsidian** as the IDE frontend — Karpathy's phrase "Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase" captures the workflow (Karpathy 2026; Antigravity 2026).
- **qmd** as local search engine — providing hybrid BM25/vector search with LLM re-ranking, all on-device, with both CLI and MCP server interfaces (Karpathy 2026; StarMorph 2026).
- **MCP servers** for agentic access — enabling LLM agents to use the wiki as a native tool rather than a file system (Reddit 2026; Hacker News 2026).
- **Git** for version control — the wiki is a git repo of markdown files, giving version history, branching, and collaboration for free.

**Applications.** The pattern applies to personal knowledge management (journal entries, articles, podcast notes), research (building comprehensive wikis over weeks or months), book comprehension (character/theme/event pages), business/team knowledge bases (Slack threads, meeting transcripts, project documents), and any domain where knowledge accumulates over time and benefits from organization (Karpathy 2026; Analytics Vidhya 2026).

**Limitations.** Karpathy acknowledges that the pattern scales poorly beyond ~100-200 pages, where the index.md file becomes unwieldy. At that scale, proper search infrastructure (qmd, vector search, or hybrid) is needed. The pattern is also "optimized for personal knowledge bases" and becomes costly for enterprise-scale ingestion pipelines with 50,000+ documents (Git Connected 2026; Pillitteri 2026).

### 2. Vector RAG vs Compiled Wiki — First Empirical Evidence

**The Study.** Cochran's preregistered comparison (May 2026) is the first head-to-head quantitative evaluation of an LLM-compiled markdown wiki against chunk-vector RAG. The study compared single-round Vector RAG and LLM-Compiled Wiki on 13 questions across 24 peer-reviewed papers in three domains (AI ethics & law, climate science, precision medicine), using Claude Opus 4.7 at xhigh for answer generation, with blinded scoring by GPT-5.4 (primary) and Gemini 2.5 Pro (secondary).

**Key Findings.**

**Synthesis advantage (H₁).** Wiki scored much better at connecting findings across papers. The `inter_paper_mapping` criterion (multi-hop synthesis across ≥2 papers) showed a +6.625 advantage for wiki (strong Bayesian support P=0.967), while `structural_integrity` showed a +1.625 advantage (weakly supported, below the preregistered +2.0 threshold after judge adjustment). The synthesis advantage is robust on the `inter_paper_mapping` criterion but threshold-sensitive on `structural_integrity` (Cochran 2026, Table 1).

**Point-source grounding (H₂).** RAG met the preregistered test for single-fact lookup questions on `groundedness` (RAG +2.000 primary, +0.667 judge-avg after IRR adjustment). However, a post-hoc claim-level grounding analysis revealed a surprising reversal: on the bias-check tier, the rubric scored RAG higher (Δgroundedness = -2.00) while claim-level analysis showed 51.9% of wiki cited claims were supported vs. only 5.3% of RAG cited claims. The two metrics measure related but distinct properties: the rubric rewards RAG's short, citation-heavy answers anchored to verbatim chunk text, while claim-level analysis catches RAG's tendency to retrieve a chunk and then synthesize/extrapolate beyond it (Cochran 2026, §5.4).

**Cost asymmetry (H₃).** The preregistered hypothesis that wiki would be expensive to build but cheap to query was **refuted**. Wiki spent 21× more tokens per query (1,651,357 vs. 78,093 tokens across 13 questions), making the amortization story impossible. The crossover-queries formula returned a negative N, mathematically encoding "no positive-query crossover" (Cochran 2026, §5.1.3).

**Decomp-RAG ablation.** An exploratory decomposition-retrieval variant of RAG recovered ~88% of wiki's synthesis advantage at 6.3× single-round cost (3.4× cheaper than wiki). Decomp closed the gap on `inter_paper_mapping` from +6.25 to +0.75 and on `structural_integrity` from +2.00 to +0.25. However, decomp did not recover wiki's advantage in claim-level citation support (19.2% vs. 40.2% for wiki). The pattern suggests two separable mechanisms: retrieval coverage is mitigated by decomposition, but representation alignment (pre-positioning evidence in claim-shaped artifacts) is not (Cochran 2026, §6).

**Evaluation methodology findings.** The study revealed a "ceiling-judge" effect: Gemini 2.5 Pro ratings on wiki output saturated near 10/10 across three of four criteria, while GPT-5.4 ratings spread between 6 and 9. Judges agreed most closely on `inter_paper_mapping`, the criterion with the most concrete operational definition. The transferable methodological finding: rubric criteria with concrete operational definitions show inter-judge convergence; criteria depending on holistic stylistic assessment show ceiling-judge calibration drift (Cochran 2026, §5.3).

**Three-way tradeoff.** The main conclusion: grounded research synthesis is not a single capability. Single-round RAG minimizes cost; decomp-RAG approaches wiki on synthesis-shape rubric criteria at ~3.4× lower per-query LLM-token cost; wiki retains the strongest LLM-scored evidence-artifact claim-citation alignment, at high per-query cost and pending source-PDF validation. No architecture did all three best (Cochran 2026, §8).

### 3. STORM — Academic Wikipedia-Style Generation

**The System.** STORM (Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking) by Shao et al. (Stanford, Feb 2024) is an academic system for generating Wikipedia-like articles from scratch, modeling the pre-writing stage through three stages:

1. **Perspective discovery** — The system discovers diverse perspectives in researching the given topic by conducting web searches and identifying different viewpoints.
2. **Simulated conversations** — Editor agents role-play as "Wikipedia editors" and "experts" in simulated conversations, where writers carrying different perspectives pose questions to a topic expert grounded on trusted Internet sources.
3. **Outline curation** — The collected information is curated to create a multi-level outline, which is then expanded section by section into a full-length article.

**Key Innovation.** STORM's core contribution is modeling the pre-writing stage, which prior Wikipedia-generation systems generally bypassed. Previous work presumed reference documents were provided in advance or assumed an article outline was available — assumptions that do not hold for general use. STORM conducts research to generate an outline *before* producing the article, mirroring the human writing process of pre-writing → drafting → revising (Shao et al. 2024).

**Multi-Perspective Question Asking.** Human learning theories highlight asking effective questions in information acquisition. STORM's innovation is that perspective-guided question asking produces deeper, more diverse questions than direct prompting, which typically generates basic "What," "When," and "Where" questions addressing only surface-level facts (Shao et al. 2024, Figure 1).

**Evaluation.** STORM was evaluated on FreshWiki, a new dataset of recent high-quality Wikipedia articles, with outline assessments evaluating the pre-writing stage. Compared to outline-driven RAG baselines, STORM articles showed a 25% absolute increase in organization and 10% increase in coverage breadth. Experienced Wikipedia editors evaluated the articles and found ≥80% approved of STORM's output as helpful for editing (Shao et al. 2024).

**Limitations identified by human editors.** Expert feedback helped identify new challenges: source bias transfer (where editorial bias from sources is reproduced in the generated article) and over-association of unrelated facts (where the LLM creates spurious connections between facts from different sources). These challenges are relevant to all wiki-style systems, not just STORM (Shao et al. 2024).

**Relationship to LLM Wiki.** STORM and the Karpathy LLM Wiki pattern share the insight that knowledge organization matters more than raw retrieval, but they differ in purpose and execution. STORM generates a single article from scratch through a multi-agent research process. The LLM Wiki pattern maintains a persistent, compounding knowledge base that grows over time through incremental ingestion. Both represent a shift away from query-time retrieval toward knowledge organization, but STORM is output-oriented (produce an article) while LLM Wiki is infrastructure-oriented (maintain a knowledge base).

### 4. Hybrid Architectures and Enterprise Adoption

**The Convergence.** By mid-2026, the field has moved beyond the "RAG vs. LLM Wiki" debate toward hybrid architectures. According to Techment data, 75% of enterprise applications will use hybrid architectures by the end of 2026, combining wiki-style compilation, vector RAG, and agentic search (Pillitteri 2026).

**Tiered Architecture Model.** Karpathy's original gist acknowledges that the tiers can be configured to act "more like Wiki, RAG, Knowledge Graph, or combo" (Karpathy 2026). The ecosystem has evolved to four tiers:

- **Tier 1:** Pure RAG (vector retrieval, suitable for stable knowledge bases)
- **Tier 2:** LLM Wiki (compiled knowledge, suitable for personal/small-scale use)
- **Tier 3:** Agentic search (iterative exploration, suitable for complex multi-source queries)
- **Tier 4:** Hybrid — wiki + RAG + knowledge graph (semantic search and entity relationships, suitable for enterprise scale)

**Enterprise Economics.** Enterprise adoption numbers reveal a clear stratification (Pillitteri 2026; ZTABS 2026):

- **RAG:** $15,000-$40,000 for MVP, $100,000-$200,000 for enterprise platform, 4-8 weeks initial delivery
- **LLM Wiki:** Ridiculously low setup costs for personal use (Python script + LLM account), but costly for enterprise-scale ingestion at 50,000+ documents
- **Agentic search:** $100,000-$200,000 for complete enterprise implementations, highest answer quality and flexibility

Hidden costs matter: at 50 million monthly queries, RAG's extended context window overhead reaches ~$43,750/month in additional LLM costs (Stratagem Systems 2026).

**Scale Implementations.** The largest-scale implementations of wiki-like knowledge bases are OpenScholar (Allen AI) and PaperQA2. OpenScholar evaluates on ScholarQABench comprising 2,967 expert-validated questions across multiple domains, demonstrating that wiki-style synthesis can scale to thousands of papers (Asai et al. 2024; Allen AI 2024).

### 5. Evaluation Methodology Challenges

**LLM-as-Judge Calibration Drift.** The Cochran study's IRR findings demonstrate substantial calibration drift between LLM judges. Gemini 2.5 Pro saturated near 10/10 for wiki outputs on holistic criteria, while GPT-5.4 distributed scores between 6 and 9. The max-delta across all four criteria was 6-8 questions, triggering the preregistered IRR adjustment rule on every criterion (Cochran 2026, §5.3).

**Holistic vs. Per-Citation Grounding.** The most surprising methodological finding: rubric-style holistic grounding scores and claim-level citation alignment can disagree by direction, not just magnitude. On the bias-check tier, the rubric scored RAG higher (Δgroundedness = -2.00) while claim-level analysis showed wiki's cited claims were ~2× more often supported and 4-5× less often unsupported than RAG's. This indicates that holistic and per-citation grounding metrics measure related but distinct properties (Cochran 2026, §5.4).

**Human Evaluation Gap.** The most consequential gap across all wiki-style system evaluations is the absence of human-in-the-loop studies. STORM is the only system evaluated by human experts (Wikipedia editors). Cochran explicitly flags human evaluation as the "highest-priority future work," noting that until then, all claim-level analyses should be read as LLM-scored evidence-artifact alignment, not human-validated source fidelity (Cochran 2026, §7.3.1).

### 6. Related Approaches

**Graph-Based Memory.** GraphRAG (Microsoft) builds entity graphs with community summaries, while RAPTOR (Sarthi et al. 2024) builds recursive cluster-summary trees. These approaches share the wiki's insight that compiled representations outperform raw chunks, but they use graph/tree structures rather than markdown. Knowledge-graph variants include REANO and GNN-RAG (Cochran 2026, §2.2).

**MediaWiki RAG.** The Moodle Wiki-RAG project (moodlehq/wiki-rag) provides a different angle: ingesting existing MediaWiki sites via their API and providing an OpenAI-compatible interface for RAG-powered question answering. This uses Milvus for vector storage and supports incremental loading, making it suitable for organizations already running MediaWiki (Moodle 2026).

**Multi-Modal Wiki Generation.** WikiAutoGen (ICCV 2025) extends wiki-style generation to include multimodal content (images, figures), comparing against STORM on text-only topics. This represents the next frontier for wiki-style systems: integrating visual knowledge alongside textual (Yang et al. 2025).

## Conclusion

Wiki-style RAG systems represent a fundamental rethinking of how LLMs interact with external knowledge. Rather than treating retrieval as a query-time operation that rediscover knowledge from scratch on every question, wiki-style systems compile knowledge into persistent, cross-linked, LLM-maintained representations that compound over time.

The research reveals that no single architecture optimizes for all desirable properties. Wiki-style systems excel at cross-paper synthesis and claim-level citation alignment but cost 21× more per query than single-round RAG. Decomp-RAG recovers ~88% of the wiki's synthesis advantage at 3.4× lower cost but does not match wiki's claim-level citation support. Single-round RAG minimizes cost but produces fragmented, decontextualized answers. The field's trajectory points toward hybrid architectures that combine the strengths of each approach, with 75% of enterprise applications projected to use wiki+RAG+agentic search combinations by the end of 2026.

The most defensible conclusion is not that compiled wiki memory beats RAG, nor the reverse. Grounded research synthesis is not a single capability: a system can organize evidence well, cite evidence well for each specific claim, or run cheaply, and in the empirical comparisons conducted to date, no architecture did all three best. The key design decision is which capability matters most for the use case.

## Future Work & Recommendations

1. **Human validation studies.** The highest-priority future work is conducting human-in-the-loop evaluations of wiki-style vs. RAG systems. Expert human evaluators should rank outputs on groundedness, synthesis quality, and usability. Until then, all LLM-judge scores should be treated as provisional, particularly for holistic criteria where calibration drift is substantial (max-delta 6-8 across criteria).

2. **Source fidelity validation.** Future evaluations should compare claim-level grounding against original PDF passages (testing whether wiki compilation preserves source fidelity) rather than against the cited evidence artifact only. The Cochran study measured evidence-artifact alignment but did not measure whether the wiki's compilation step introduces factual drift from the original sources. The 1 contradicted claim out of 466 total was a single-word paraphrase artifact, suggesting the risk is low but unquantified.

3. **Enterprise-scale hybrid architectures.** Future research should test hybrid wiki+RAG architectures that combine compiled knowledge with source-chunk verification, particularly for enterprise deployments with 50,000+ documents. Key open questions include: What search infrastructure (qmd, vector, hybrid) is needed for wiki-scale knowledge bases? How do hybrid architectures perform on multi-hop synthesis vs. single-document lookups? How does the 75% enterprise adoption projection for hybrid architectures materialize in practice?

## Citations

Antigravity Codes. "Karpathy's LLM Wiki: The Complete Guide to His Idea File." April 4, 2026. https://antigravity.codes/blog/karpathy-llm-wiki-idea-file.

Asai, Akari, et al. "OpenScholar: Synthesizing Scientific Literature with Retrieval-Augmented Language Models." arXiv:2411.14199, November 2024. https://huggingface.co/papers/2411.14199.

Allen AI. "Scientific Literature Synthesis with Retrieval-Augmented Language Models." Blog post, November 19, 2024. https://allenai.org/blog/openscilm.

Cochran, Theodore O. "Vector RAG vs LLM-Compiled Wiki: A Preregistered Comparison on a Small Multi-Domain Research Corpus." arXiv:2605.18490v1, May 2026. https://arxiv.org/html/2605.18490v1.

Git Connected (Level Up). "Beyond RAG: How Andrej Karpathy's LLM Wiki Pattern Builds Knowledge That Actually Compounds." April 12, 2026. https://levelup.gitconnected.com/beyond-rag-how-andrej-karpathys-llm-wiki-pattern-builds-knowledge-that-actually-compounds-31a08528665e.

Hacker News. "A Karpathy-style LLM wiki your agents maintain (Markdown and Git)." April 25, 2026. https://news.ycombinator.com/item?id=47899844.

Karpathy, Andrej. "llm-wiki." GitHub Gist, April 2026. https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f.

Moodle. "moodlehq/wiki-rag: An experimental Retrieval-Augmented Generation (RAG) system specialised in ingesting MediaWiki sites." GitHub repository, 2026. https://github.com/moodlehq/wiki-rag.

Pillitteri, Pasquale. "RAG, LLM Wiki, Agentic Search: Differences, Costs and Use Cases." April 28, 2026. https://pasqualepillitteri.it/en/news/1496/rag-llm-wiki-agentic-search-differences-costs-2026.

Reddit. "New plugin: LLM Wiki - turn your vault into a queryable knowledge base." r/ObsidianMD, April 10, 2026. https://www.reddit.com/r/ObsidianMD/comments/1shntdn/new_plugin_llm_wiki_turn_your_vault_into_a/.

Shao, Yijia, Yucheng Jiang, Theodore A. Kanell, Peter Xu, Omar Khattab, and Monica S. Lam. "Assisting in Writing Wikipedia-like Articles From Scratch with Large Language Models." arXiv:2402.14207, February 2024. https://arxiv.org/html/2402.14207v1.

StarMorph. "How to Build Karpathy's LLM Wiki: The Complete Guide to AI Knowledge Base." April 9, 2026. https://blog.starmorph.com/blog/karpathy-llm-wiki-knowledge-base-guide.

Stratagem Systems. "Hidden Cost of Enterprise RAG Analysis." March 2026. Cited in Pillitteri 2026.

Techment. "Enterprise Architecture Adoption Data." 2026. Cited in Pillitteri 2026.

Yang, et al. "WikiAutoGen: Towards Multi-Modal Wikipedia-Style Article Generation." ICCV 2025. https://openaccess.thecvf.com/content/ICCV2025/papers/Yang_WikiAutoGen_Towards_Multi-Modal_Wikipedia-Style_Article_Generation_ICCV_2025_paper.pdf.

ZTABS. "RAG Implementation Cost Data." 2026. Cited in Pillitteri 2026.
