import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, ctx) => {
    const agentsMdPath = join(ctx.cwd, ".pi", "AGENTS.md");
    try {
      const content = readFileSync(agentsMdPath, "utf-8");
      return {
        systemPrompt:
          event.systemPrompt +
          "\n\n# Project Rules (AGENTS.md)\n" +
          content,
      };
    } catch {
      // AGENTS.md not found — skip silently
      return undefined;
    }
  });
}
