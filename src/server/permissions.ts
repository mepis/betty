// ─── Types ──────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "user" | "viewer";

// All command types that the server handlerMap processes
export type Command =
  | "prompt"
  | "abort"
  | "set_model"
  | "set_thinking_level"
  | "get_state"
  | "get_messages"
  | "get_available_models"
  | "new_session"
  | "compact"
  | "get_session_stats"
  | "get_fork_messages"
  | "fork"
  | "clone"
  | "switch_session"
  | "set_session_name"
  | "get_commands"
  | "steer"
  | "follow_up"
  | "bash"
  | "set_steering_mode"
  | "set_follow_up_mode"
  | "set_auto_compaction"
  | "set_auto_retry"
  | "cycle_model"
  | "cycle_thinking_level"
  | "get_last_assistant_text";

// ─── Permissions Map ────────────────────────────────────────────────────────
// Each role gets a Set of allowed commands. Admin and user share the full set;
// viewer is restricted to read-only + safety commands (abort, cycle).

const allCommands: Set<Command> = new Set([
  "prompt",
  "abort",
  "set_model",
  "set_thinking_level",
  "get_state",
  "get_messages",
  "get_available_models",
  "new_session",
  "compact",
  "get_session_stats",
  "get_fork_messages",
  "fork",
  "clone",
  "switch_session",
  "set_session_name",
  "get_commands",
  "steer",
  "follow_up",
  "bash",
  "set_steering_mode",
  "set_follow_up_mode",
  "set_auto_compaction",
  "set_auto_retry",
  "cycle_model",
  "cycle_thinking_level",
  "get_last_assistant_text",
]);

const viewerCommands: Set<Command> = new Set([
  // Read-only access
  "get_state",
  "get_messages",
  "get_available_models",
  "switch_session",
  "set_session_name",
  "get_commands",
  "get_session_stats",
  "get_last_assistant_text",
  // Allow cycling without needing to set explicitly
  "cycle_model",
  "cycle_thinking_level",
  // Abort is always allowed (safety)
  "abort",
]);

export const ROLE_PERMISSIONS: Record<UserRole, Set<Command>> = {
  admin: new Set(allCommands),
  user: new Set(allCommands),
  viewer: viewerCommands,
};

// ─── Permission Check ───────────────────────────────────────────────────────

/**
 * Check whether a role is allowed to execute a given command.
 * Returns `false` for unknown roles (fail-closed).
 */
export function hasPermission(role: UserRole, command: Command): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms !== undefined && perms.has(command);
}

/** Check if a role has admin privileges. */
export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}
