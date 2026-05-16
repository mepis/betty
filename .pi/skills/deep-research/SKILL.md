---
name: deep-research
description: "Execute deep, multi-phase, structured research on a topic ($TOPIC) using web search and browser automation. Produces a comprehensive analytical report with citations."
allowed-tools: Bash(playwright-cli:*) Bash(curl:*) Bash(jq:*) Bash(grep:*) Bash(git:*)
---

# Deep Research Skill

Run a 3-phase research workflow on the given topic and produce a formal analytical report with MLA citations.

## WHEN TO USE

- Comprehensive competitive analyses
- Technical due diligence on unfamiliar subjects
- Whitepapers requiring cross-source verification
- Any task where depth and source triangulation matter more than speed

## TOOLS

Prefer **SearxNG** (fast, JSON, no browser overhead) over browser-based search. Fall back to **Bing via playwright-cli** when needed.

### SearxNG (Preferred)

```bash
# Quick search — returns JSON with title, url, content
curl -s "http://100.91.131.108/searxng/search?q=QUERY&format=json" | jq '.results[:5][] | {title, url, content}'

# Filter by category (news, images, etc.)
curl -s "http://100.91.131.108/searxng/search?q=QUERY&format=json&categories=news" | jq '.results[:3]'

# Site-specific search
curl -s "http://100.91.131.108/searxng/search?q=QUERY+site:github.com&format=json" | jq '.results[:3]'

# Use the helper script
cd /root/git/betty/.pi/skills/playwright-cli && ./scripts/web-search.sh "QUERY" 5 searxng
```

### Bing via Playwright (Fallback)

```bash
playwright-cli open "https://www.bing.com/search?q=QUERY"
playwright-cli snapshot
playwright-cli --raw eval "[...document.querySelectorAll('li.b_algo')].map(li => ({title: li.querySelector('h2 a')?.textContent?.trim(), url: li.querySelector('h2 a')?.href}))"
playwright-cli close
```

### Best Practices

- Use advanced operators: `site:`, `filetype:`, `intitle:`, exact phrases, date ranges
- Cross-verify claims across **3+ independent sources**
- Prioritize authoritative sources: .edu, .gov, peer-reviewed journals, official documentation, well-regarded industry blogs
- Check for publication dates — flag stale information for the topic
- Use lateral reading: verify source credibility independently rather than trusting on-page indicators
- Flag when AI-generated answers may reproduce historical biases or underrepresented perspectives

## STATE MANAGEMENT

### State File Location

`.agents/deep-research/STATE.md` (create directory on first use)

### State Schema

```markdown
---
topic: "$TOPIC"
created_at: "YYYY-MM-DD HH:MM"
last_updated: "YYYY-MM-DD HH:MM"
current_phase: "Phase 1|Phase 2|Phase 3|Complete"
status: "active|paused|completed"
stopping_criteria: ""
---

## Phase 1: Foundational Survey
sub_topics:
- name: ""
  definition: ""
  key_concepts: [""]

## Phase 2: Deep Dive
deep_dives:
- topic: ""
  defined: true|false
  trends: [""]
  example: ""
  example_source: ""

## Phase 3: Gap Analysis
gaps:
- description: ""
  questions: [""]
  resolved: true|false
  findings: ""

phase_1_complete: false
phase_2_complete: false
phase_3_complete: false
```

### State Operations

| Event | Action |
|---|---|
| Skill activated | Read state file. If `status: "active"`, resume from `current_phase`. Otherwise initialize new state. |
| After each phase | Populate section, set completion flag, update timestamp, write file |
| On completion | Set `status: "completed"`, record `stopping_criteria` (A or B), create checkpoint copy `STATE_YYYYMMDD_HHMMSS.md` |

### Cross-Session Continuity

State persists automatically. On next session start, the skill reads the state file, displays a summary ("Resuming research on $TOPIC from Phase X"), and continues from the checkpoint.

## EXECUTION PLAN

Always run phases sequentially. Proceed to the next phase **only** when the current phase's objectives are fully met.

### INITIALIZATION

1. Check for state file at `.agents/deep-research/STATE.md`
2. If active state exists → resume from `current_phase`
3. Otherwise → create new state with `current_phase: "Phase 1"`

---

### Phase 1: Foundational Survey & Scoping

**Objective:** Map the domain landscape — terminology, context, and sub-topics.

**Action:**
1. Search broadly for the topic using 2-3 different query formulations
2. Identify **5-7 distinct sub-topics** or angles
3. For each sub-topic, provide:
   - One-sentence definition
   - 2-3 key concepts

**State Update:** Write sub-topics to state, set `phase_1_complete: true`

---

### Phase 2: Deep Dive & Synthesis

**Objective:** Systematically explore the **3 most critical** sub-topics from Phase 1.

**Action (for each of the 3 sub-topics):**
1. Research with 2-3 targeted searches, consulting 2-3 authoritative sources each
2. **Define** — thorough explanation (150-200 words, expert tone)
3. **Trends** — list 3 major current trends or advances
4. **Example** — provide 1 concrete, verifiable example with source citation

**State Update:** Populate deep-dives section, set `phase_2_complete: true`

---

### Phase 3: Recursive Gap Analysis & Expansion

**Objective:** Challenge the knowledge base and resolve remaining uncertainties.

**Action:**
1. **Critique** — identify 2-3 areas where knowledge is thin, contradictory, or unexplored
2. **Generate** — for each gap, formulate 2 focused follow-up questions
3. **Research** — search for answers to these questions (up to 6 questions total)
4. **Integrate** — add findings to the existing structure, mark gaps as resolved

**State Update:** Document gaps with findings, set `phase_3_complete: true`

---

### Stopping Criteria (Guardrail)

Halt when Phase 3 is complete **and** one condition is met:

- **(A)** All gaps addressed — no obvious weak spots remain
- **(B)** Self-critique determines the next step yields only minor, redundant detail (incremental vs. breakthrough knowledge)

Record which criteria triggered the stop in the state file.

## FINAL DELIVERABLE

Once stopping criteria are met, generate this report:

```markdown
# ANALYTICAL REPORT: $TOPIC

## Executive Summary
(Max 3 paragraphs. Summarize the research journey, then the findings.)

## Methodology
(Describe the 3-phase process and which stopping criteria applied.)

## Detailed Findings
(Consolidated structure from Phases 1, 2, and 3 — this is the core content.)

## Conclusion
(A definitive statement answering the core research question.)

## Future Work & Recommendations
(3 actionable next steps for a human researcher.)

## Citations
(MLA-formatted citations for all sources referenced.)
```

## USAGE EXAMPLES

```
Research "quantum error correction methods"
→ Skill initializes state, begins Phase 1

Continue research
→ Skill reads state, resumes from last phase

What's the research status?
→ Skill reads state, displays phase progress, gaps, and next actions
```
