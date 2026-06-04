export interface WSMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export function isValidWSMessage(data: unknown): data is WSMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as WSMessage;
  if (typeof msg.type !== 'string') return false;
  if (msg.payload !== undefined && (typeof msg.payload !== 'object' || msg.payload === null)) return false;
  return true;
}

export const VALID_COMMAND_TYPES = [
  'auth',
  'prompt',
  'abort',
  'new_session',
  'switch_session',
  'fork',
  'clone',
  'navigate_tree',
  'set_model',
  'set_thinking_level',
  'set_session_name',
  'compact',
  'get_fork_messages',
  'get_messages',
  'get_last_assistant_text',
  'extension_ui_response',
] as const;

export function isValidCommandType(type: string): boolean {
  return (VALID_COMMAND_TYPES as readonly string[]).includes(type);
}
