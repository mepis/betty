import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync } from "node:fs";

const SESSIONS_DIR = join(process.env.HOME || "/tmp", ".betty", "sessions");

// Ensure sessions directory exists
if (!existsSync(SESSIONS_DIR)) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

function getFilePath(sessionId) {
  return join(SESSIONS_DIR, `${sessionId}.json`);
}

function loadSession(sessionId) {
  const filePath = getFilePath(sessionId);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function saveSession(session) {
  const filePath = getFilePath(session.id);
  writeFileSync(filePath, JSON.stringify(session, null, 2));
}

function deleteSession(sessionId) {
  const filePath = getFilePath(sessionId);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
    return true;
  }
  return false;
}

function listSessions() {
  if (!existsSync(SESSIONS_DIR)) return [];
  const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith(".json"));
  const sessions = [];
  for (const file of files) {
    const session = loadSession(file.replace(".json", ""));
    if (session) sessions.push(session);
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

function createSession() {
  const now = Date.now();
  const session = {
    id: randomUUID(),
    name: `Session ${new Date().toLocaleString()}`,
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
  Object.assign(session, updates);
  session.updatedAt = Date.now();
  saveSession(session);
  return session;
}

export {
  SESSIONS_DIR,
  loadSession,
  saveSession,
  deleteSession,
  listSessions,
  createSession,
  updateSession,
};
