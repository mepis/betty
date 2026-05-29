/**
 * SQLite worker thread — all DB operations run here so the event loop stays free.
 * Uses a message-passing IPC channel (parent ↔ child via `process`).
 */

 
import DatabaseModule from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { User, MessageRole, Session, Message } from '../../shared/types.js';

// ---------------------------------------------------------------------------
// Schema (auto-created on first connect)
// ---------------------------------------------------------------------------

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  displayName TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id             TEXT PRIMARY KEY,
  userId         TEXT NOT NULL REFERENCES users(id),
  title          TEXT NOT NULL DEFAULT 'New Chat',
  branchPointId  TEXT,
  parentBranchId TEXT,
  ancestorIds    TEXT NOT NULL DEFAULT '[]',
  createdAt      TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  sessionId  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
  content    TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','error')),
  metadata   TEXT,
  createdAt  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(sessionId);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(userId);
`;

// ---------------------------------------------------------------------------
// Internal row types
// ---------------------------------------------------------------------------

interface UserRow extends Omit<User, 'createdAt'> { createdAt: string; }
interface SessionRow {
  id: string; userId: string; title: string;
  branchPointId: string | null; parentBranchId: string | null;
  ancestorIds: string;
  createdAt: string; updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers — convert raw rows → clean types
// ---------------------------------------------------------------------------

function userFromRow(r: UserRow): User { return { ...r }; }

function sessionFromRow(r: SessionRow): Session {
  return {
    ...r,
    ancestorIds: JSON.parse(r.ancestorIds) as string[],
  };
}

/** Convert a raw DB row (Record<string, unknown>) into a message object */
 
function toMessage(row: Record<string, any>): Message {
  let metadata: Record<string, unknown> | undefined;
  if (row.metadata) {
    try { metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata; }
    catch { /* ignore */ }
  }
  return {
    id: String(row.id),
    sessionId: String(row.sessionId),
    role: (row.role as MessageRole) ?? 'user',
    content: String(row.content ?? ''),
    status: (row.status as Message['status']) ?? 'pending',
    metadata,
    createdAt: String(row.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Prepared statements — use `any` to avoid better-sqlite3 type conflicts
// since the IPC layer serializes everything to JSON anyway.
// ---------------------------------------------------------------------------

type DBStmt = { run: (...a: unknown[]) => Record<string, unknown>; get: (...a: unknown[]) => Record<string, unknown> | undefined; all: (...a: unknown[]) => Record<string, unknown>[] };

interface Statements {
  createUser: DBStmt; getUserById: DBStmt; getUserByUsername: DBStmt; listUsers: DBStmt;
  createSession: DBStmt; getSession: DBStmt; updateSession: DBStmt; deleteSession: DBStmt;
  listUserSessions: DBStmt; listSiblingBranches: DBStmt;
  createMessage: DBStmt; getMessage: DBStmt; getMessagesBySession: DBStmt; upsertMessage: DBStmt;
  deleteMessagesBySession: DBStmt;
}

 
function prepareStatements(db: any): Statements {
  const stmt = (sql: string) => db.prepare(sql);

  return {
    createUser: stmt(`INSERT INTO users (id, username, displayName, passwordHash, createdAt) VALUES (@id,@username,@displayName,@passwordHash,datetime('now'))`),
    getUserById: stmt('SELECT * FROM users WHERE id = ? LIMIT 1'),
    getUserByUsername: stmt('SELECT * FROM users WHERE username = ? LIMIT 1'),
    listUsers: stmt(`SELECT * FROM users ORDER BY createdAt DESC LIMIT @limit OFFSET @offset`),

    createSession: stmt(`INSERT INTO sessions (id,userId,title,branchPointId,parentBranchId,ancestorIds) VALUES (@id,@userId,COALESCE(@title,'New Chat'),@branchPointId,@parentBranchId,@ancestorIds)`),
    getSession: stmt('SELECT * FROM sessions WHERE id = ? LIMIT 1'),
    updateSession: stmt(`UPDATE sessions SET title=COALESCE(@title,title),updatedAt=COALESCE(@updatedAt,datetime('now')) WHERE id=?`),
    deleteSession: stmt('DELETE FROM sessions WHERE id = ?'),
    listUserSessions: stmt(`SELECT * FROM sessions WHERE userId=@userId ORDER BY updatedAt DESC LIMIT @limit OFFSET @offset`),
    listSiblingBranches: stmt(`SELECT * FROM sessions WHERE parentBranchId=(SELECT id FROM sessions WHERE id=?) OR branchPointId=(SELECT branchPointId FROM sessions WHERE id=? AND branchPointId IS NOT NULL) ORDER BY createdAt DESC`),

    createMessage: stmt(`INSERT INTO messages (id,sessionId,role,content,status,metadata,createdAt) VALUES (@id,@sessionId,@role,COALESCE(@content,''),pending,@metadata,datetime('now'))`),
    getMessage: stmt('SELECT * FROM messages WHERE id = ? LIMIT 1'),
    getMessagesBySession: stmt(`SELECT * FROM messages WHERE sessionId=@sessionId ORDER BY createdAt ASC`),
    upsertMessage: stmt(`INSERT INTO messages (id,sessionId,role,content,status,metadata) VALUES (@id,@sessionId,@role,COALESCE(@content,''),COALESCE(@status,pending),@metadata) ON CONFLICT(id) DO UPDATE SET content=COALESCE(excluded.content,messages.content),status=COALESCE(excluded.status,messages.status),metadata=COALESCE(excluded.metadata,messages.metadata)`),
    deleteMessagesBySession: stmt('DELETE FROM messages WHERE sessionId = ?'),
  };
}

// ---------------------------------------------------------------------------
// Worker message handler (parent → child)
// ---------------------------------------------------------------------------

interface DBMessage { id: string; action: string; params?: Record<string, unknown>; }

 
const ACTION_HANDLERS: Record<string, any> = {};

function registerAction(action: string, fn: (...args: any[]) => unknown): void {
  ACTION_HANDLERS[action] = fn;
}

// ---------------------------------------------------------------------------
// User actions
// ---------------------------------------------------------------------------

registerAction('createUser', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  const id = (p?.id as string) ?? randomUUID();
  const username = String(p!.username);
  const displayName = String(p!.displayName);
  const passwordHash = String(p!.passwordHash);

  const existing = s.getUserByUsername.get({ username }) as UserRow | undefined;
  if (existing) throw new Error(`User '${username}' already exists`);

  s.createUser.run({ id, username, displayName, passwordHash });
  return { id };
});

registerAction('getUserById', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  const row = s.getUserById.get({ id: String(p!.id) }) as UserRow | undefined;
  return row ? userFromRow(row) : null;
});

registerAction('getUserByUsername', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  const row = s.getUserByUsername.get({ username: String(p!.username) }) as UserRow | undefined;
  return row ? userFromRow(row) : null;
});

// ---------------------------------------------------------------------------
// Session actions
// ---------------------------------------------------------------------------

registerAction('createSession', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  const id = (p?.id as string) ?? randomUUID();
  const userId = String(p!.userId);
  const title = typeof p?.title === 'string' ? p.title : undefined;

  let ancestorIds: string[] = [];
  if (p?.ancestorIds) {
    ancestorIds = Array.isArray(p.ancestorIds) ? p.ancestorIds as string[] : JSON.parse(String(p.ancestorIds));
  }

  s.createSession.run({
    id, userId, title: title ?? 'New Chat',
    branchPointId: (p?.branchPointId as string | null) || null,
    parentBranchId: (p?.parentBranchId as string | null) || null,
    ancestorIds: JSON.stringify(ancestorIds),
  });

  return { id };
});

registerAction('getSession', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  const row = s.getSession.get({ id: String(p!.id) }) as SessionRow | undefined;
  return row ? sessionFromRow(row) : null;
});

registerAction('updateSession', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  const id = String(p!.id);
  const title = typeof p?.title === 'string' ? p.title : undefined;
  s.updateSession.run({ id, title });
  return true;
});

registerAction('deleteSession', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  s.deleteMessagesBySession.run({ sessionId: String(p!.id) });
  s.deleteSession.run({ id: String(p!.id) });
  return true;
});

registerAction('listUserSessions', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  const userId = String(p!.userId);
  const offset = (p?.offset as number) ?? 0;
  const limit = Math.min((p?.limit as number) ?? 25, 100);

   
  const rawRows = s.listUserSessions.all({ userId, offset, limit }) as unknown as any[];
  return {
    items: rawRows.map((r) => sessionFromRow(r as SessionRow)),
    total: rawRows.length,
    hasMore: rawRows.length === limit,
  };
});

// ---------------------------------------------------------------------------
// Message actions
// ---------------------------------------------------------------------------

registerAction('createMessage', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  const id = (p?.id as string) ?? randomUUID();
  const sessionId = String(p!.sessionId);
  const role = (p!.role as MessageRole) ?? 'user';
  const content = typeof p?.content === 'string' ? p.content : '';

  s.createMessage.run({ id, sessionId, role, content: content || '', metadata: JSON.stringify(p?.metadata) });
  return { id };
});

registerAction('getMessage', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  const row = s.getMessage.get({ id: String(p!.id) }) as Record<string, unknown> | undefined;
  return row ? toMessage(row) : null;
});

registerAction('getMessagesBySession', (_db: any, s: Statements, p?: Record<string, unknown>) => {
   
  const rows: Record<string, any>[] = s.getMessagesBySession.all({ sessionId: String(p!.sessionId) }) as unknown as any[];
  return rows.map(toMessage);
});

registerAction('upsertMessage', (_db: any, s: Statements, p?: Record<string, unknown>) => {
  const id = (p?.id as string) ?? randomUUID();
  s.upsertMessage.run({
    id, sessionId: String(p!.sessionId), role: (p!.role as MessageRole),
    content: typeof p?.content === 'string' ? p.content : null,
    status: typeof p?.status === 'string' ? p.status : null,
    metadata: JSON.stringify(p?.metadata),
  });
  return { id };
});

// ---------------------------------------------------------------------------
// Worker bootstrap — listen for parent messages
// ---------------------------------------------------------------------------

const rawDb = new DatabaseModule(':memory:') as unknown as { prepare: (sql: string) => any; exec: (sql: string) => void; pragma: (p: string) => string | undefined };
rawDb.pragma('journal_mode = WAL');
rawDb.pragma('foreign_keys = ON');
rawDb.exec(SCHEMA);

const db = rawDb as unknown as DatabaseModule & { prepare(sql: string): any; exec(sql: string): void };
const stmts = prepareStatements(db);

process.on('message', (msg: DBMessage) => {
  const handler = ACTION_HANDLERS[msg.action];
  if (!handler) {
    process!.send!({ requestId: msg.id, ok: false, error: `Unknown action: ${msg.action}` });
    return;
  }

  try {
    const data = handler(db, stmts, msg.params);
    process!.send!({ requestId: msg.id, ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process!.send!({ requestId: msg.id, ok: false, error: message });
  }
});

process.stdin.resume();
