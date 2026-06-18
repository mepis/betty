---
name: deep-research
description: "Execute deep, multi-phase, structured research on a topic ($TOPIC) using web search and browser automation. Produces a comprehensive analytical report with citations, and automatically archives findings to the library."
allowed-tools: Bash(playwright-cli:*) Bash(jq:*) Bash(grep:*) Bash(git:*)
---

# Deep Research Skill

Run a 3-phase research workflow on the given topic and produce a formal analytical report with MLA citations. **After completion, automatically archive the research to the library** for persistent knowledge accumulation.

## WHEN TO USE

- Comprehensive competitive analyses
- Technical due diligence on unfamiliar subjects
- Whitepapers requiring cross-source verification
- Any task where depth and source triangulation matter more than speed
- Any topic that could benefit from persistent archival in the library

## LIBRARY INTEGRATION

The library is located at `library/` (a Git repo). The skill performs **five library operations**:

### 1. Pre-Research Library Check (Phase 0)

Before starting research, check the library for existing entries on related topics:

```bash
# Read the master index
cat library/INDEX.md

# Check for existing topic entries
ls library/topics/

# Read a specific topic entry if it exists
cat library/topics/<topic-slug>/index.md 2>/dev/null

# Check tags for related topics
ls library/tags/
```

**Action:** If related entries exist, reference them during Phase 1 scoping to avoid duplication and build on prior research. Note any gaps in existing entries that your research should fill.

### 2. Topic Slug Generation

Generate a consistent topic slug from the topic name:

- Lowercase, hyphen-separated
- Remove special characters
- Example: "Wiki-Style RAG Systems" → `wiki-style-rag-systems`
- Example: "Quantum Error Correction Methods" → `quantum-error-correction-methods`

### 3. Post-Research Library Write

After research completes, create/update the library entry:

```bash
# Create topic directory
mkdir -p library/topics/<topic-slug>/entries

# Copy report
cp .agents/deep-research/REPORT.md library/topics/<topic-slug>/report.md

# Copy state
cp .agents/deep-research/STATE.md library/topics/<topic-slug>/state.md

# Create/update topic index
# (write a concise index.md summarizing key findings, sub-topics, and file links)

# Update master INDEX.md
# (add new entry to the table, add detail section)

# Update/create tag files
# (add link to each relevant tag file)

# Commit
cd library && git add -A && git commit -m "Add <topic> research" && git push
```

### 4. Library Cleanup

During Phase 3 gap analysis, check for and address:
- Stale state files in `.agents/deep-research/` (clean up after library write)
- Duplicate or outdated entries in the library (flag for manual review)
- Missing tag files for new tags discovered during research

### 5. Library Reference During Research

When searching for information, check the library first before doing web searches:

```bash
# Library has relevant info?
grep -r "keyword" library/topics/ 2>/dev/null

# Library already covers this sub-topic?
cat library/topics/<topic-slug>/index.md 2>/dev/null
```

If the library already has comprehensive coverage of a sub-topic, skip redundant research and instead focus on gaps or updates.

## TOOLS

All searches use **playwright-cli** in headed mode. Use the following fallback chain for search queries:

**Fallback order:** SearxNG → Bing → Brave → Yahoo → Ecosia → Qwant

### Search Provider Fallback Chain

When any provider returns no results or an error, move to the next provider in the chain.

**Before giving up on a provider, attempt to solve CAPTCHAs** (see CAPTCHA Solving section below). Only skip to the next provider if CAPTCHA solving fails or is impossible.

#### 1. SearxNG (Primary)

```bash
# Open SearxNG search page (headed)
playwright-cli open "http://100.91.131.108/searxng/search?q=QUERY&format=json"
playwright-cli snapshot

# Extract results as JSON
playwright-cli --raw eval "JSON.stringify(JSON.parse(document.body.innerText).results.map(r => ({title: r.title, url: r.url, content: r.content})))"

# Site-specific search
playwright-cli open "http://100.91.131.108/searxng/search?q=QUERY+site:github.com&format=json"
playwright-cli --raw eval "JSON.stringify(JSON.parse(document.body.innerText).results.map(r => ({title: r.title, url: r.url, content: r.content})))"
```

#### 2. Bing (Fallback #1)

```bash
playwright-cli open "https://www.bing.com/search?q=QUERY"
playwright-cli snapshot
playwright-cli --raw eval "[...document.querySelectorAll('li.b_algo')].map(li => ({title: li.querySelector('h2 a')?.textContent?.trim(), url: li.querySelector('h2 a')?.href}))"
playwright-cli close
```

#### 3. Brave (Fallback #2)

```bash
playwright-cli open "https://search.brave.com/search?q=QUERY"
playwright-cli snapshot
playwright-cli --raw eval "[...document.querySelectorAll('result').slice(0,10)].map(r => ({title: r.querySelector('div.title')?.textContent?.trim(), url: r.querySelector('a')?.href}))"
playwright-cli close
```

**CAPTCHA handling:** Brave rarely shows CAPTCHAs. If one appears, wait 10 seconds and retry.

#### 4. Yahoo (Fallback #3)

```bash
playwright-cli open "https://search.yahoo.com/search?p=QUERY"
playwright-cli snapshot
playwright-cli --raw eval "[...document.querySelectorAll('#web .rule').slice(0,10)].map(r => ({title: r.querySelector('h3')?.textContent?.trim(), url: r.querySelector('h3 a')?.href}))"
playwright-cli close
```

#### 5. Ecosia (Fallback #4)

```bash
playwright-cli open "https://www.ecosia.org/search?q=QUERY"
playwright-cli snapshot
playwright-cli --raw eval "[...document.querySelectorAll('li.result').slice(0,10)].map(r => ({title: r.querySelector('.result__title')?.textContent?.trim(), url: r.querySelector('.result__title a')?.href}))"
playwright-cli close
```

#### 6. Qwant (Fallback #5)

```bash
playwright-cli open "https://www.qwant.com/?q=QUERY&t=web"
playwright-cli snapshot
playwright-cli --raw eval "[...document.querySelectorAll('.result').slice(0,10)].map(r => ({title: r.querySelector('.result__title')?.textContent?.trim(), url: r.querySelector('a')?.href}))"
playwright-cli close
```

### CAPTCHA Solving

Before abandoning a search provider due to a CAPTCHA, attempt the following strategies in order:

1. **Wait and retry** — Some CAPTCHAs (especially Cloudflare challenges) auto-solve after a delay:
   ```bash
   playwright-cli --raw eval "new Promise(r => setTimeout(r, 15000))"
   playwright-cli snapshot
   playwright-cli --raw eval "..."
   ```

2. **Identify the CAPTCHA type:**
   ```bash
   playwright-cli --raw eval "document.querySelector('iframe[src*=recaptcha], iframe[src*=hcaptcha], .cf-challenge, #challenge-form')"
   ```

3. **For reCAPTCHA/hCaptcha** — Image/text-based challenges:
   ```bash
   playwright-cli screenshot
   playwright-cli snapshot
   playwright-cli click e15
   ```

4. **For Cloudflare challenges** — Usually resolve with waiting:
   ```bash
   playwright-cli --raw eval "new Promise(r => setTimeout(r, 30000))"
   playwright-cli snapshot
   playwright-cli --raw eval "document.title"
   ```

5. **For image-based CAPTCHAs** — Select images based on the prompt:
   ```bash
   playwright-cli screenshot
   playwright-cli snapshot
   playwright-cli click e22
   playwright-cli click e25
   ```

6. **If CAPTCHA solving fails** after 2-3 attempts, move to the next provider. Document which provider failed and why in the state file.

### Best Practices

- **Check the library first** — Before researching, check `library/INDEX.md` for existing entries on related topics
- Use advanced operators: `site:`, `filetype:`, `intitle:`, exact phrases, date ranges
- Cross-verify claims across **3+ independent sources**
- Prioritize authoritative sources: .edu, .gov, peer-reviewed journals, official documentation, well-regarded industry blogs
- Check for publication dates — flag stale information for the topic
- Use lateral reading: verify source credibility independently
- Flag when AI-generated answers may reproduce historical biases

### Search Provider Reliability

| Provider | Reliable? | Notes |
|---|---|---|
| **SearxNG** | ✅ Yes | Primary provider. Fast, returns clean JSON. Use first. |
| **Bing** | ✅ Yes | Most reliable browser-based fallback. Always works. |
| **Brave** | ⚠️ Sometimes | Works most of the time. May return fewer results. |
| **Yahoo** | ⚠️ Sometimes | Underlying results may be Bing-sourced. |
| **Ecosia** | ⚠️ Sometimes | May have rate limits. Similar to Bing. |
| **Qwant** | ⚠️ Sometimes | European provider. May have incomplete results. |

#### Providers that frequently show CAPTCHAs

| Provider | CAPTCHA Frequency | Notes |
|---|---|---|
| **Google** | Very High | Blocks headless browsers. Attempt solving once; if it fails, skip. |
| **DuckDuckGo** | Very High | Detects headless browsers immediately. Attempt solving once; if it fails, skip. |

## STATE MANAGEMENT

### State File Location

`.agents/deep-research/STATE.md`

### State Schema

```markdown
---
topic: "$TOPIC"
created_at: "YYYY-MM-DD HH:MM"
last_updated: "YYYY-MM-DD HH:MM"
current_phase: "Phase 0|Phase 1|Phase 2|Phase 3|Complete"
status: "active|paused|completed"
library_topic_slug: "<topic-slug>"
library_entry_exists: true|false
stopping_criteria: ""
---

## Phase 0: Library Check

existing_entries:
- topic: ""
  slug: ""
  relevance: "high|medium|low"
  gap_to_fill: ""

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

phase_0_complete: false
phase_1_complete: false
phase_2_complete: false
phase_3_complete: false
```

### State Operations

| Event | Action |
|---|---|
| Skill activated | Read state file. If `status: "active"`, resume from `current_phase`. Otherwise initialize new state. |
| After each phase | Populate section, set completion flag, update timestamp, write file |
| On completion | Set `status: "completed"`, record `stopping_criteria`, create checkpoint copy, **write to library** |

### Cross-Session Continuity

State persists automatically. On next session start, the skill reads the state file, displays a summary, and continues from the checkpoint.

## EXECUTION PLAN

Always run phases sequentially. Proceed to the next phase **only** when the current phase's objectives are fully met.

### Phase 0: Library Check (NEW)

**Objective:** Check the library for existing entries on this topic or related topics. Reference prior research to avoid duplication.

**Action:**

1. Read `library/INDEX.md` and check `library/topics/` for existing entries
2. For each existing entry, assess relevance and identify gaps your research should fill
3. Record findings in the state file under `## Phase 0: Library Check`
4. Set `phase_0_complete: true`

**Example:**
```bash
cat library/INDEX.md
ls library/topics/ 2>/dev/null
cat library/topics/existing-topic/index.md 2>/dev/null
```

---

### Phase 1: Foundational Survey & Scoping

**Objective:** Map the domain landscape — terminology, context, and sub-topics.

**Action:**

1. Search broadly for the topic using 2-3 different query formulations
2. Identify **5-7 distinct sub-topics** or angles
3. For each sub-topic, provide:
   - One-sentence definition
   - 2-3 key concepts
4. **Cross-reference with library** — if a sub-topic is already covered in the library, note it and focus on gaps

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

### Phase 4: Report Generation

**Objective:** Generate the final analytical report.

**Action:**

1. Generate the report at `.agents/deep-research/REPORT.md`
2. Include all phases' findings, MLA citations, and references to library entries where applicable

---

### Phase 5: Library Archive (NEW)

**Objective:** Archive the completed research to the library.

**Action:**

1. **Create topic directory:**
   ```bash
   mkdir -p library/topics/<topic-slug>/entries
   ```

2. **Copy artifacts:**
   ```bash
   cp .agents/deep-research/REPORT.md library/topics/<topic-slug>/report.md
   cp .agents/deep-research/STATE.md library/topics/<topic-slug>/state.md
   ```

3. **Create topic index** (`library/topics/<topic-slug>/index.md`):
   - Topic name, research date, status
   - Tags (from the research)
   - Overview paragraph
   - Key findings (3-5 bullet points)
   - Sub-topics covered
   - Links to report.md and state.md

4. **Update master INDEX.md** (`library/INDEX.md`):
   - Add new entry to the table with topic, date, status, tags
   - Add detail section with summary and key findings

5. **Update tag files** (`library/tags/<tag>.md`):
   - Create new tag files for any new tags discovered
   - Add link to the new topic entry in existing tag files

6. **Commit and push:**
   ```bash
   cd library && git add -A && git commit -m "Add <topic> research" && git push
   ```

7. **Clean up:** Remove stale state files from `.agents/deep-research/` (keep the completed checkpoint and the main state/report)

**State Update:** Set `status: "completed"`, record `stopping_criteria`, create checkpoint copy.

---

### Stopping Criteria (Guardrail)

Halt when Phase 3 is complete **and** one condition is met:

- **(A)** All gaps addressed — no obvious weak spots remain
- **(B)** Self-critique determines the next step yields only minor, redundant detail (incremental vs. breakthrough knowledge)

Record which criteria triggered the stop in the state file.

## FINAL REPORT TEMPLATE

Generate this report at `.agents/deep-research/REPORT.md`:

```markdown
# ANALYTICAL REPORT: $TOPIC

## Executive Summary

(Max 3 paragraphs. Summarize the research journey, then the findings.)

## Methodology

(Describe the phases and which stopping criteria applied.)

## Detailed Findings

(Consolidated structure from Phases 1, 2, and 3 — this is the core content.)

## Conclusion

(A definitive statement answering the core research question.)

## Future Work & Recommendations

(3 actionable next steps for a human researcher.)

## Citations

(MLA-formatted citations for all sources referenced.)
```

## LIBRARY ENTRY TEMPLATE

When creating the library entry (Phase 5), use this structure for `topics/<topic-slug>/index.md`:

```markdown
# <Topic Name>

**Research date:** YYYY-MM-DD
**Status:** Complete (3-phase research)
**Tags:** tag1, tag2, tag3

## Overview

(Brief overview of the topic and why it matters.)

## Key Findings

1. (Finding 1)
2. (Finding 2)
3. (Finding 3)

## Sub-Topics Covered

- (Sub-topic 1)
- (Sub-topic 2)

## Files

- [Full Analytical Report](report.md)
- [Research State](state.md)

## Related Topics

([Links to other topic entries, if any])
```

## USAGE EXAMPLES

```
Research "quantum error correction methods"
→ Phase 0: Check library for existing quantum/ML entries
→ Phases 1-3: Research
→ Phase 4: Generate report
→ Phase 5: Archive to library/topics/quantum-error-correction-methods/

Continue research
→ Skill reads state, resumes from last phase
→ Phase 0: Check library for any new related entries since last session

What's the research status?
→ Skill reads state, displays phase progress, gaps, and next actions
→ Also shows library entry status (exists or pending)

Research "RAG systems" (topic already in library)
→ Phase 0: Find existing wiki-style RAG entry
→ Focus on gaps: what's new since the last research session?
→ Update library entry with new findings
```
