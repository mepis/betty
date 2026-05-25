# Optimize Compaction

## 1. Purpose

Improve pi's session compaction quality and efficiency for this project, based on research findings from the library's deep-dive on compaction techniques. The goal is to reduce context bloat, preserve critical coding context (file paths, error messages, decisions), and lower compaction costs.

**In scope:**
- Pi settings optimization (project-level `settings.json`)
- Custom compaction extension using `session_before_compact` hook
- External memory file for persistent critical facts (avoids compaction chain degradation)
- Context pruning via `context` event (deduplication, error purging, observation masking)

**Out of scope:**
- Modifying pi's core compaction code (it's an npm package)
- KV cache-level compression (GPU-level, not accessible via extensions)
- Commitment-based compression (Context Codec framework — too nascent)

## 2. Approach

### Architecture

Three layers, applied in order:

1. **Settings layer** — Tune `reserveTokens` and `keepRecentTokens` to reduce premature compaction while keeping budget reasonable.

2. **Context pruning layer** (`context` event) — Zero-cost structural optimizations that run before every LLM call:
   - **Tool result deduplication**: If the same file is read N times, keep only the most recent read; replace older ones with a marker.
   - **Error purging**: Once a tool call succeeds after prior failures, purge the old error messages from context.
   - **Observation masking**: Replace completed tool outputs with short placeholders (preserving path, size, timestamp).

3. **Custom compaction layer** (`session_before_compact` hook) — Replace the default compaction with a research-backed approach:
   - Use a cheaper model (Gemini Flash or similar) for summarization
   - Enforce JSON schema output for the summary (validated, required fields)
   - Include code diffs for modified files (not just paths)
   - Pin the first user message verbatim (never summarize requirements)
   - Write critical facts to an external memory file alongside the session

### Why this approach

- **Deduplication + error purging + masking** are zero-cost (no LLM call) and address the largest contributors to context bloat (repeated file reads, resolved error messages, full tool outputs).
- **JSON schema summaries** are backed by Factory.ai's benchmark: structured summaries scored 3.70/5 vs 2.19–2.45/5 for freeform narratives on artifact tracking.
- **External memory** solves the compaction chain problem identified in the research — every summary is lossy, but facts written to disk persist with full fidelity.
- **Cheaper model for summarization** reduces compaction cost directly (the research shows compaction can dominate session cost).

### Alternatives considered and rejected

| Alternative | Rejected because |
|---|---|
| Full MemGPT-style external memory | Overkill — requires heartbeat/control-flow mechanism, adds significant complexity |
| ACON task-aware compression profiles | Requires per-task classification; no clear signal in pi's events |
| Focus Agent autonomous consolidation | Requires the agent itself to signal consolidation; not actionable via extension |
| Commitment-based compression (Context Codec) | Framework is nascent (May 2026 paper, no production deployments) |

## 3. Phased Plan

### Phase 1: Settings Optimization

**Task 1.1: Create project-level settings.json**
- Create `.pi/settings.json` with optimized compaction defaults
- Set `reserveTokens: 24576` (larger buffer to reduce premature compaction)
- Set `keepRecentTokens: 30000` (keep more recent context verbatim)
- Acceptance: File exists with valid JSON, compaction settings present

### Phase 2: Context Pruning Extension

**Task 2.1: Implement tool result deduplication**
- Subscribe to `context` event
- Track file paths seen in `read` tool results
- When a file is read again, replace older tool results with `[read: path — N lines, from step X]`
- Keep only the most recent read of each file
- Acceptance: Same file read 3 times → 2 results replaced with markers, 1 full result kept

**Task 2.2: Implement error purging**
- Track tool calls by path/command
- When a tool call succeeds after prior failures on the same target, replace prior error results with `[error resolved: path, was "error message"]`
- Acceptance: Failed read followed by successful read → error message replaced with one-line marker

**Task 2.3: Implement observation masking**
- After a tool result has been "consumed" (agent has produced a subsequent assistant message), replace its content with a placeholder
- Preserve: tool name, path/args, output size, success/failure
- Acceptance: Completed tool results replaced with `[tool: read, path: foo.ts, 1200 chars, success]`

**Task 2.4: Wire up pruning with configuration**
- Add settings for enabling/disabling each pruning strategy
- Add a `/prune` command to manually trigger context pruning
- Acceptance: Each strategy independently toggleable, `/prune` command works

### Phase 3: Custom Compaction Extension

**Task 3.1: Implement custom compaction handler**
- Subscribe to `session_before_compact`
- Serialize all messages to summarize
- Use a cheaper model (fallback to current model if unavailable)
- Acceptance: Extension intercepts compaction, generates summary with alternative model

**Task 3.2: Enforce structured summary output**
- Use JSON schema output (if model supports it) with required fields: goal, constraints, progress, decisions, nextSteps, criticalContext, readFiles, modifiedFiles
- Validate output; fall back to default compaction if validation fails
- Acceptance: Summary conforms to schema, all fields present

**Task 3.3: Pin first user message verbatim**
- Extract the first user message from the session
- Always include it verbatim in the summary preamble, never summarized
- Acceptance: Original user prompt preserved word-for-word in every compaction

**Task 3.4: Include code diffs for modified files**
- For each modified file, generate a brief diff description (what changed, not the full code)
- Append to summary's modifiedFiles section
- Acceptance: Modified files include one-line change descriptions

**Task 3.5: Write external memory file**
- After compaction, write critical facts to `.pi/session-memory.json`
- Include: goals, constraints, key decisions, file states
- Read back at `session_start` and inject into context
- Acceptance: File persists across compactions, facts survive multiple compaction cycles

### Phase 4: Integration and Testing

**Task 4.1: Create combined extension file**
- Merge context pruning and custom compaction into a single `.pi/extensions/optimize-compaction.ts`
- Ensure both hooks coexist without conflict
- Acceptance: Single extension file, both hooks active

**Task 4.2: Manual testing**
- Run pi with the extension, trigger a long session
- Verify: deduplication works, errors purged, compaction uses structured format, external memory persists
- Acceptance: All features observable in a test session

## 4. Validation

### Phase 1
- L1: `cat .pi/settings.json | jq .compaction` outputs valid settings

### Phase 2
- L1: Extension loads without errors (`pi -e` or auto-discovery)
- L2: Read same file 3 times → check context has 2 markers + 1 full result
- L2: Failed tool → successful tool → check error message replaced

### Phase 3
- L1: Extension intercepts `session_before_compact` (notify fires)
- L2: Compaction produces valid JSON summary with all required fields
- L2: First user message preserved verbatim in summary
- L3: After 3+ compactions, external memory file still contains original goals/constraints

### Phase 4
- L3: Full session test — long coding session with multiple compactions, verify quality

## 5. Progress Tracker

- [x] Task 1.1: Create project-level settings.json
- [x] Task 2.1: Implement tool result deduplication
- [x] Task 2.2: Implement error purging
- [x] Task 2.3: Implement observation masking
- [x] Task 2.4: Wire up pruning with configuration (`/prune` command)
- [x] Task 3.1: Implement custom compaction handler
- [x] Task 3.2: Enforce structured summary output (JSON schema, falls back to raw text)
- [x] Task 3.3: Pin first user message verbatim
- [x] Task 3.4: Include code diffs for modified files (one-line change descriptions)
- [x] Task 3.5: Write external memory file (`.pi/session-memory.json`)
- [x] Task 4.1: Create combined extension file (`.pi/extensions/optimize-compaction.ts`)
- [ ] Task 4.2: Manual testing (requires interactive pi session)
