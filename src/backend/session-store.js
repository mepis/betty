import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync } from "node:fs";

// SESSIONS_ENABLED=false disables all session persistence (no disk I/O)
const SESSIONS_ENABLED = process.env.SESSIONS_ENABLED !== "false";

const SESSIONS_DIR = join(process.env.HOME || "/tmp", ".betty", "sessions");

// Ensure sessions directory exists (only when persistence is enabled)
if (SESSIONS_ENABLED && !existsSync(SESSIONS_DIR)) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

function getFilePath(sessionId) {
  return join(SESSIONS_DIR, `${sessionId}.json`);
}

function loadSession(sessionId) {
  if (!SESSIONS_ENABLED) return null;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("sessionId must be a non-empty string");
  }
  const filePath = getFilePath(sessionId);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (!SESSIONS_ENABLED) return;
  const filePath = getFilePath(session.id);
  try {
    writeFileSync(filePath, JSON.stringify(session, null, 2));
  } catch (err) {
    console.error(`[session-store] Failed to save session ${session.id}: ${err.message}`);
    throw err;
  }
}

function deleteSession(sessionId) {
  if (!SESSIONS_ENABLED) return false;
  const filePath = getFilePath(sessionId);
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
    } catch (err) {
      console.error(`[session-store] Failed to delete session ${sessionId}: ${err.message}`);
      return false;
    }
    return true;
  }
  return false;
}

function listSessions() {
  if (!SESSIONS_ENABLED || !existsSync(SESSIONS_DIR)) return [];
  const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith(".json"));
  const sessions = [];
  for (const file of files) {
    const session = loadSession(file.replace(".json", ""));
    if (session) sessions.push(session);
  }
  return sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function createSession() {
  const now = Date.now();
  const session = {
    id: randomUUID(),
    name: `Session ${new Date().toISOString()}`,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  saveSession(session);
  return session;
}

function updateSession(sessionId, updates) {
  const session = loadSession(sessionId);
  if (!session) return null;
  // Whitelist allowed fields to prevent corruption
  const allowedFields = ["name", "messageCount", "messages"];
  for (const key of allowedFields) {
    if (key in updates) {
      session[key] = updates[key];
    }
  }
  session.updatedAt = Date.now();
  saveSession(session);
  return session;
}

export {
  SESSIONS_ENABLED,
  SESSIONS_DIR,
  loadSession,
  saveSession,
  deleteSession,
  listSessions,
  createSession,
  updateSession,
};
