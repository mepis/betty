/**
 * Optimize Compaction Extension
 *
 * Research-backed compaction optimizations for pi sessions:
 * - Context pruning: deduplication, error purging, observation masking (zero-cost)
 * - Custom compaction: structured summaries, pinned requirements, external memory
 *
 * Based on findings from the compaction research library topic.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { complete, type Model } from "@earendil-works/pi-ai";
import { convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// Configuration
// ============================================================================

interface PruningConfig {
  deduplication: boolean;
  errorPurging: boolean;
  observationMasking: boolean;
}

const DEFAULT_PRUNING: PruningConfig = {
  deduplication: true,
  errorPurging: true,
  observationMasking: true,
};

interface CompactionConfig {
  useCheaperModel: boolean;
  cheaperModelProvider: string;
  cheaperModelId: string;
  pinFirstMessage: boolean;
  externalMemory: boolean;
  maxSummaryTokens: number;
}

const DEFAULT_COMPACTION: CompactionConfig = {
  useCheaperModel: true,
  cheaperModelProvider: "google",
  cheaperModelId: "gemini-2.5-flash",
  pinFirstMessage: true,
  externalMemory: true,
  maxSummaryTokens: 4096,
};

// ============================================================================
// External Memory
// ============================================================================

interface ExternalMemory {
  goals: string[];
  constraints: string[];
  decisions: Array<{ decision: string; rationale: string }>;
  fileStates: Array<{ path: string; status: "read" | "modified" | "created" | "deleted" }>;
  lastUpdated: number;
  compactionCount: number;
}

function loadExternalMemory(cwd: string): ExternalMemory | null {
  const memPath = path.join(cwd, ".pi", "session-memory.json");
  try {
    const data = fs.readFileSync(memPath, "utf-8");
    return JSON.parse(data) as ExternalMemory;
  } catch {
    return null;
  }
}

function saveExternalMemory(cwd: string, memory: ExternalMemory): void {
  const memPath = path.join(cwd, ".pi", "session-memory.json");
  fs.mkdirSync(path.dirname(memPath), { recursive: true });
  fs.writeFileSync(memPath, JSON.stringify(memory, null, 2));
}

function createExternalMemory(): ExternalMemory {
  return {
    goals: [],
    constraints: [],
    decisions: [],
    fileStates: [],
    lastUpdated: Date.now(),
    compactionCount: 0,
  };
}

function formatExternalMemoryForContext(memory: ExternalMemory): string {
  const parts: string[] = [];

  parts.push("## Persistent Session Memory");
  parts.push(`(Updated ${new Date(memory.lastUpdated).toISOString()}, survived ${memory.compactionCount} compaction(s))`);

  if (memory.goals.length > 0) {
    parts.push("\n### Goals");
    for (const goal of memory.goals) {
      parts.push(`- ${goal}`);
    }
  }

  if (memory.constraints.length > 0) {
    parts.push("\n### Constraints");
    for (const constraint of memory.constraints) {
      parts.push(`- ${constraint}`);
    }
  }

  if (memory.decisions.length > 0) {
    parts.push("\n### Key Decisions");
    for (const d of memory.decisions) {
      parts.push(`- **${d.decision}**: ${d.rationale}`);
    }
  }

  if (memory.fileStates.length > 0) {
    parts.push("\n### File States");
    for (const f of memory.fileStates) {
      parts.push(`- \`${f.path}\` — ${f.status}`);
    }
  }

  return parts.join("\n");
}

// ============================================================================
// Context Pruning
// ============================================================================

/**
 * Prune messages before sending to the LLM.
 * Handles deduplication, error purging, and observation masking.
 *
 * Messages are typed from the context event (AgentMessage[]).
 * We use 'any' for internal tracking to avoid circular type dependencies.
 */
function pruneMessages(
  messages: any[],
  config: PruningConfig,
): any[] {
  if (!config.deduplication && !config.errorPurging && !config.observationMasking) {
    return messages;
  }

  const pruned: any[] = [];

  // Track state across messages
  const fileReadContents = new Map<string, { index: number; lines: number }>();
  const toolCallStack: Array<{ name: string; path?: string; command?: string }> = [];
  const lastAssistantIndex = findLastAssistantIndex(messages);

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      // Track tool calls from assistant messages
      for (const block of msg.content) {
        if (block.type === "toolCall" && block.arguments) {
          const args = block.arguments as Record<string, unknown>;
          toolCallStack.push({
            name: block.name,
            path: typeof args.path === "string" ? args.path : undefined,
            command: typeof args.command === "string" ? args.command : undefined,
          });
        }
      }
      pruned.push(msg);
    } else if (msg.role === "toolResult") {
      const textContent = getTextContent(msg);
      const lastCall = toolCallStack.length > 0 ? toolCallStack[toolCallStack.length - 1] : null;

      // Deduplication: if same file was read before, replace with marker
      if (config.deduplication && lastCall?.name === "read" && lastCall.path) {
        const prevRead = fileReadContents.get(lastCall.path);
        if (prevRead) {
          pruned.push({
            ...msg,
            content: [{
              type: "text",
              text: `[read: ${lastCall.path} — ${prevRead.lines} lines, from message ${prevRead.index} (deduplicated)]`,
            }],
          });
          toolCallStack.pop();
          continue;
        }
        // Record this read
        fileReadContents.set(lastCall.path, {
          index: i,
          lines: textContent.split("\n").length,
        });
      }

      // Error purging: if a prior tool call on the same target failed but a later one succeeded
      if (config.errorPurging && lastCall) {
        const targetKey = lastCall.path || lastCall.command || "";
        if (targetKey) {
          const isErrorResponse = textContent.includes("Error:") ||
            textContent.includes("ENOENT") ||
            textContent.includes("EACCES") ||
            textContent.includes("Permission denied") ||
            textContent.includes("not found");

          if (isErrorResponse) {
            const laterSuccess = findLaterSuccess(messages, i, targetKey, lastCall.name);
            if (laterSuccess) {
              pruned.push({
                ...msg,
                content: [{
                  type: "text",
                  text: `[error resolved: ${targetKey}, was "${textContent.slice(0, 100)}..."]`,
                }],
              });
              toolCallStack.pop();
              continue;
            }
          }
        }
      }

      // Observation masking: replace consumed tool results with placeholders
      if (config.observationMasking && lastAssistantIndex > i) {
        const lines = textContent.split("\n").length;
        const isSuccessful = !textContent.includes("Error:") && !textContent.includes("error:");
        const toolName = lastCall?.name || "unknown";

        pruned.push({
          ...msg,
          content: [{
            type: "text",
            text: `[tool: ${toolName}, ${lines} lines, ${textContent.length} chars, ${isSuccessful ? "success" : "error"}]`,
          }],
        });
      } else {
        pruned.push(msg);
      }

      toolCallStack.pop();
    } else {
      pruned.push(msg);
    }
  }

  return pruned;
}

function findLastAssistantIndex(messages: any[]): number {
  let lastIdx = -1;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "assistant") {
      lastIdx = i;
    }
  }
  return lastIdx;
}

function findLaterSuccess(
  messages: any[],
  errorIndex: number,
  targetKey: string,
  toolName: string,
): boolean {
  let sawToolCall = false;
  for (let i = errorIndex + 1; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "toolCall" && block.name === toolName && block.arguments) {
          const args = block.arguments as Record<string, unknown>;
          const p = typeof args.path === "string" ? args.path : undefined;
          const c = typeof args.command === "string" ? args.command : undefined;
          if ((p === targetKey) || (c && c.startsWith(targetKey))) {
            sawToolCall = true;
          }
        }
      }
    }
    if (sawToolCall && msg.role === "toolResult") {
      const text = getTextContent(msg);
      if (!text.includes("Error:") && !text.includes("ENOENT") && text.length > 0) {
        return true;
      }
    }
  }
  return false;
}

function getTextContent(msg: any): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((c: any): c is { type: "text"; text: string } => c.type === "text")
      .map((c: { type: "text"; text: string }) => c.text)
      .join("\n");
  }
  return "";
}

// ============================================================================
// Custom Compaction
// ============================================================================

interface StructuredSummary {
  goal: string[];
  constraints: string[];
  progress: {
    done: string[];
    inProgress: string[];
    blocked: string[];
  };
  keyDecisions: Array<{ decision: string; rationale: string }>;
  nextSteps: string[];
  criticalContext: string[];
  readFiles: string[];
  modifiedFiles: Array<{ path: string; change: string }>;
}

const SUMMARIZATION_SYSTEM_PROMPT = `You are a context summarization assistant. Your task is to read a conversation between a user and an AI coding assistant, then produce a structured summary as JSON following the exact schema specified.

Do NOT continue the conversation. Do NOT respond to any questions in the conversation. ONLY output the structured JSON summary.

Preserve exact file paths, function names, error messages, and technical specifics. Do not paraphrase technical details.`;

const SUMMARIZATION_PROMPT = `The messages below are a conversation to summarize. Create a structured context checkpoint.

<conversation>
{conversation}
</conversation>

{previousSummary}

Output ONLY valid JSON matching this schema:
{{
  "goal": string[],
  "constraints": string[],
  "progress": {{ "done": string[], "inProgress": string[], "blocked": string[] }},
  "keyDecisions": [{{ "decision": string, "rationale": string }}],
  "nextSteps": string[],
  "criticalContext": string[],
  "readFiles": string[],
  "modifiedFiles": [{{ "path": string, "change": string }}]
}}

Rules:
- Preserve exact file paths, function names, and error messages verbatim
- For modifiedFiles, describe the key change in one line per file
- Keep each section concise but technically specific
- "none" arrays are fine if a section has no entries`;

const UPDATE_SUMMARIZATION_PROMPT = `The messages below are NEW conversation messages to incorporate into the existing summary.

<conversation>
{conversation}
</conversation>

<previous-summary>
{previousSummary}
</previous-summary>

Update the existing summary with new information. RULES:
- PRESERVE all existing information from the previous summary
- ADD new progress, decisions, and context from the new messages
- UPDATE the Progress section: move items from "inProgress" to "done" when completed
- PRESERVE exact file paths, function names, and error messages
- For modifiedFiles, describe the key change in one line per file

Output ONLY valid JSON matching the same schema as before.`;

function formatStructuredSummary(summary: StructuredSummary, pinnedMessage?: string): string {
  const parts: string[] = [];

  if (pinnedMessage) {
    parts.push("## Original Request (preserved verbatim)");
    parts.push(pinnedMessage);
    parts.push("");
  }

  parts.push("## Goal");
  for (const g of summary.goal) {
    parts.push(`- ${g}`);
  }
  parts.push("");

  if (summary.constraints.length > 0) {
    parts.push("## Constraints & Preferences");
    for (const c of summary.constraints) {
      parts.push(`- ${c}`);
    }
    parts.push("");
  }

  parts.push("## Progress");
  parts.push("### Done");
  for (const d of summary.progress.done) {
    parts.push(`- [x] ${d}`);
  }
  parts.push("### In Progress");
  for (const ip of summary.progress.inProgress) {
    parts.push(`- [ ] ${ip}`);
  }
  if (summary.progress.blocked.length > 0) {
    parts.push("### Blocked");
    for (const b of summary.progress.blocked) {
      parts.push(`- ${b}`);
    }
  }
  parts.push("");

  if (summary.keyDecisions.length > 0) {
    parts.push("## Key Decisions");
    for (const d of summary.keyDecisions) {
      parts.push(`- **${d.decision}**: ${d.rationale}`);
    }
    parts.push("");
  }

  if (summary.nextSteps.length > 0) {
    parts.push("## Next Steps");
    summary.nextSteps.forEach((s, i) => parts.push(`${i + 1}. ${s}`));
    parts.push("");
  }

  if (summary.criticalContext.length > 0) {
    parts.push("## Critical Context");
    for (const c of summary.criticalContext) {
      parts.push(`- ${c}`);
    }
    parts.push("");
  }

  if (summary.readFiles.length > 0) {
    parts.push("<read-files>");
    for (const f of summary.readFiles) {
      parts.push(f);
    }
    parts.push("</read-files>");
    parts.push("");
  }

  if (summary.modifiedFiles.length > 0) {
    parts.push("<modified-files>");
    for (const f of summary.modifiedFiles) {
      parts.push(`${f.path} — ${f.change}`);
    }
    parts.push("</modified-files>");
  }

  return parts.join("\n");
}

function updateExternalMemory(
  cwd: string,
  summary: StructuredSummary,
): ExternalMemory {
  const existing = loadExternalMemory(cwd);
  const memory = existing || createExternalMemory();

  // Merge goals (deduplicate)
  const goalSet = new Set([...(existing?.goals || []), ...summary.goal]);
  memory.goals = [...goalSet];

  // Merge constraints (deduplicate)
  const constraintSet = new Set([...(existing?.constraints || []), ...summary.constraints]);
  memory.constraints = [...constraintSet];

  // Merge decisions (deduplicate by decision text)
  const decisionSet = new Map<string, { decision: string; rationale: string }>();
  if (existing?.decisions) {
    for (const d of existing.decisions) {
      decisionSet.set(d.decision, d);
    }
  }
  for (const d of summary.keyDecisions) {
    decisionSet.set(d.decision, d);
  }
  memory.decisions = [...decisionSet.values()];

  // Update file states
  const fileSet = new Map<string, { path: string; status: string }>();
  if (existing?.fileStates) {
    for (const f of existing.fileStates) {
      fileSet.set(f.path, f);
    }
  }
  for (const f of summary.readFiles) {
    if (!fileSet.has(f) || fileSet.get(f)?.status === "read") {
      fileSet.set(f, { path: f, status: "read" });
    }
  }
  for (const f of summary.modifiedFiles) {
    fileSet.set(f.path, { path: f.path, status: "modified" });
  }
  memory.fileStates = [...fileSet.values()];

  memory.lastUpdated = Date.now();
  memory.compactionCount = (existing?.compactionCount || 0) + 1;

  return memory;
}

// ============================================================================
// Extension
// ============================================================================

export default function (pi: ExtensionAPI) {
  const pruningConfig: PruningConfig = { ...DEFAULT_PRUNING };
  const compactionConfig: CompactionConfig = { ...DEFAULT_COMPACTION };
  let firstUserMessage: string | null = null;

  // Capture the first user message
  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager.getEntries();
    for (const entry of entries) {
      if (entry.type === "message" && entry.message.role === "user") {
        const text = typeof entry.message.content === "string"
          ? entry.message.content
          : entry.message.content
              .filter((c: any): c is { type: "text"; text: string } => c.type === "text")
              .map((c: { type: "text"; text: string }) => c.text)
              .join("\n");
        if (text && !firstUserMessage) {
          firstUserMessage = text;
        }
        break;
      }
    }

    // Load external memory and notify
    const memory = loadExternalMemory(ctx.cwd);
    if (memory) {
      ctx.ui.notify(`Loaded session memory (${memory.compactionCount} compaction(s) survived)`, "info");
    }
  });

  // Capture first user message from new prompts
  pi.on("agent_start", async (event, _ctx) => {
    if (!firstUserMessage && event.prompt) {
      firstUserMessage = event.prompt;
    }
  });

  // Context pruning: run before every LLM call
  pi.on("context", async (event, _ctx) => {
    return { messages: pruneMessages(event.messages, pruningConfig) };
  });

  // Inject external memory into system prompt
  pi.on("before_agent_start", async (event, ctx) => {
    const memory = loadExternalMemory(ctx.cwd);
    if (memory && memory.goals.length > 0) {
      const memoryText = formatExternalMemoryForContext(memory);
      return {
        systemPrompt: event.systemPrompt + "\n\n" + memoryText,
      };
    }
    return undefined;
  });

  // Custom compaction
  pi.on("session_before_compact", async (event, ctx) => {
    const { preparation, signal, customInstructions } = event;
    const { messagesToSummarize, turnPrefixMessages, tokensBefore, firstKeptEntryId, previousSummary } = preparation;

    if (!firstKeptEntryId) return;

    // Combine all messages for summary
    const allMessages = [...messagesToSummarize, ...turnPrefixMessages];
    if (allMessages.length === 0) return;

    // Find summarization model
    let model: Model<any> | null = null;
    if (compactionConfig.useCheaperModel) {
      model = ctx.modelRegistry.find(compactionConfig.cheaperModelProvider, compactionConfig.cheaperModelId) ?? null;
    }
    if (!model) {
      // Fall back to current model
      model = ctx.model;
      ctx.ui.notify(`Using current model (${model.id}) for compaction`, "info");
    } else {
      ctx.ui.notify(`Compacting with ${model.provider}/${model.id}...`, "info");
    }

    // Resolve auth
    const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
    if (!auth.ok || !auth.apiKey) {
      ctx.ui.notify(`Compaction auth failed: ${auth.error || "no API key"}`, "warning");
      return;
    }

    // Serialize conversation
    const conversationText = serializeConversation(convertToLlm(allMessages));

    // Build prompt
    let promptText: string;
    if (previousSummary) {
      promptText = UPDATE_SUMMARIZATION_PROMPT
        .replace("{conversation}", conversationText)
        .replace("{previousSummary}", previousSummary);
    } else {
      promptText = SUMMARIZATION_PROMPT
        .replace("{conversation}", conversationText)
        .replace("{previousSummary}", "");
    }

    if (customInstructions) {
      promptText += `\n\nAdditional focus: ${customInstructions}`;
    }

    try {
      const response = await complete(
        model,
        {
          systemPrompt: SUMMARIZATION_SYSTEM_PROMPT,
          messages: [
            {
              role: "user" as const,
              content: [{ type: "text" as const, text: promptText }],
              timestamp: Date.now(),
            },
          ],
        },
        {
          apiKey: auth.apiKey,
          headers: auth.headers,
          maxTokens: compactionConfig.maxSummaryTokens,
          signal,
        },
      );

      const textContent = response.content
        .filter((c: any): c is { type: "text"; text: string } => c.type === "text")
        .map((c: { type: "text"; text: string }) => c.text)
        .join("\n");

      if (!textContent.trim()) {
        ctx.ui.notify("Compaction summary was empty, using default compaction", "warning");
        return;
      }

      // Try to parse as JSON for structured summary
      let structuredSummary: StructuredSummary | null = null;
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/) || textContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredSummary = JSON.parse(jsonMatch[1] || jsonMatch[0]) as StructuredSummary;
        }
      } catch {
        // Not valid JSON — use raw text as summary
      }

      let summary: string;
      if (structuredSummary) {
        // Format structured summary with pinned message
        summary = formatStructuredSummary(
          structuredSummary,
          compactionConfig.pinFirstMessage ? firstUserMessage || undefined : undefined,
        );

        // Update external memory
        if (compactionConfig.externalMemory) {
          const memory = updateExternalMemory(ctx.cwd, structuredSummary);
          saveExternalMemory(ctx.cwd, memory);
          ctx.ui.notify(`Session memory updated (${memory.compactionCount} total compaction(s))`, "info");
        }
      } else {
        // Fall back to raw text, but still pin the first message
        summary = (compactionConfig.pinFirstMessage && firstUserMessage
          ? `## Original Request (preserved verbatim)\n${firstUserMessage}\n\n`
          : "") + textContent;
      }

      ctx.ui.notify(
        `Compaction complete (${tokensBefore.toLocaleString()} → ~${summary.length / 4} tokens)`,
        "info",
      );

      return {
        compaction: {
          summary,
          firstKeptEntryId,
          tokensBefore,
          details: structuredSummary ? {
            readFiles: structuredSummary.readFiles,
            modifiedFiles: structuredSummary.modifiedFiles.map(f => f.path),
          } : undefined,
        },
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(`Compaction failed: ${message}`, "error");
      return;
    }
  });

  // Commands
  pi.registerCommand("prune", {
    description: "Show or toggle context pruning settings",
    handler: async (args, ctx) => {
      const parts = args.split(" ");
      const strategy = parts[0];
      const action = parts[1];

      if (!strategy || !action) {
        ctx.ui.notify(
          `Pruning status:\n  deduplication: ${pruningConfig.deduplication ? "on" : "off"}\n  errorPurging: ${pruningConfig.errorPurging ? "on" : "off"}\n  observationMasking: ${pruningConfig.observationMasking ? "on" : "off"}`,
          "info",
        );
        return;
      }

      const validStrategies = ["deduplication", "errorPurging", "observationMasking"];
      if (!validStrategies.includes(strategy)) {
        ctx.ui.notify(`Unknown strategy: ${strategy}. Valid: ${validStrategies.join(", ")}`, "warning");
        return;
      }

      if (action === "on") {
        pruningConfig[strategy as keyof PruningConfig] = true;
      } else if (action === "off") {
        pruningConfig[strategy as keyof PruningConfig] = false;
      } else {
        ctx.ui.notify(`Unknown action: ${action}. Use "on" or "off".`, "warning");
        return;
      }

      ctx.ui.notify(`${strategy}: ${action}`, "info");
    },
  });

  pi.registerCommand("memory", {
    description: "Show session memory status",
    handler: async (_args, ctx) => {
      const memory = loadExternalMemory(ctx.cwd);
      if (!memory) {
        ctx.ui.notify("No session memory yet (will be created on first compaction)", "info");
        return;
      }

      const lines = [
        `Session Memory (${memory.compactionCount} compaction(s) survived)`,
        `Goals: ${memory.goals.length}`,
        `Constraints: ${memory.constraints.length}`,
        `Decisions: ${memory.decisions.length}`,
        `Files tracked: ${memory.fileStates.length}`,
        `Last updated: ${new Date(memory.lastUpdated).toISOString()}`,
      ];
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}
