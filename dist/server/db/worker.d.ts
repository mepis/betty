/**
 * SQLite worker thread — all DB operations run here so the event loop stays free.
 * Uses a message-passing IPC channel (parent ↔ child via `process`).
 */
export {};
