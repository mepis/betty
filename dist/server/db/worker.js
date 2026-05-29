/**
 * SQLite worker thread — all DB operations run here so the event loop stays free.
 * Uses a message-passing IPC channel (parent ↔ child via `process`).
 */
import DatabaseModule from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
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
// Helpers — convert raw rows → clean types
// ---------------------------------------------------------------------------
function userFromRow(r) { return { ...r }; }
function sessionFromRow(r) {
    return {
        ...r,
        ancestorIds: JSON.parse(r.ancestorIds),
    };
}
/** Convert a raw DB row (Record<string, unknown>) into a message object */
function toMessage(row) {
    let metadata;
    if (row.metadata) {
        try {
            metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        }
        catch { /* ignore */ }
    }
    return {
        id: String(row.id),
        sessionId: String(row.sessionId),
        role: row.role ?? 'user',
        content: String(row.content ?? ''),
        status: row.status ?? 'pending',
        metadata,
        createdAt: String(row.createdAt),
    };
}
function prepareStatements(db) {
    const stmt = (sql) => db.prepare(sql);
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
const ACTION_HANDLERS = {};
function registerAction(action, fn) {
    ACTION_HANDLERS[action] = fn;
}
// ---------------------------------------------------------------------------
// User actions
// ---------------------------------------------------------------------------
registerAction('createUser', (_db, s, p) => {
    const id = p?.id ?? randomUUID();
    const username = String(p.username);
    const displayName = String(p.displayName);
    const passwordHash = String(p.passwordHash);
    const existing = s.getUserByUsername.get({ username });
    if (existing)
        throw new Error(`User '${username}' already exists`);
    s.createUser.run({ id, username, displayName, passwordHash });
    return { id };
});
registerAction('getUserById', (_db, s, p) => {
    const row = s.getUserById.get({ id: String(p.id) });
    return row ? userFromRow(row) : null;
});
registerAction('getUserByUsername', (_db, s, p) => {
    const row = s.getUserByUsername.get({ username: String(p.username) });
    return row ? userFromRow(row) : null;
});
// ---------------------------------------------------------------------------
// Session actions
// ---------------------------------------------------------------------------
registerAction('createSession', (_db, s, p) => {
    const id = p?.id ?? randomUUID();
    const userId = String(p.userId);
    const title = typeof p?.title === 'string' ? p.title : undefined;
    let ancestorIds = [];
    if (p?.ancestorIds) {
        ancestorIds = Array.isArray(p.ancestorIds) ? p.ancestorIds : JSON.parse(String(p.ancestorIds));
    }
    s.createSession.run({
        id, userId, title: title ?? 'New Chat',
        branchPointId: p?.branchPointId || null,
        parentBranchId: p?.parentBranchId || null,
        ancestorIds: JSON.stringify(ancestorIds),
    });
    return { id };
});
registerAction('getSession', (_db, s, p) => {
    const row = s.getSession.get({ id: String(p.id) });
    return row ? sessionFromRow(row) : null;
});
registerAction('updateSession', (_db, s, p) => {
    const id = String(p.id);
    const title = typeof p?.title === 'string' ? p.title : undefined;
    s.updateSession.run({ id, title });
    return true;
});
registerAction('deleteSession', (_db, s, p) => {
    s.deleteMessagesBySession.run({ sessionId: String(p.id) });
    s.deleteSession.run({ id: String(p.id) });
    return true;
});
registerAction('listUserSessions', (_db, s, p) => {
    const userId = String(p.userId);
    const offset = p?.offset ?? 0;
    const limit = Math.min(p?.limit ?? 25, 100);
    const rawRows = s.listUserSessions.all({ userId, offset, limit });
    return {
        items: rawRows.map((r) => sessionFromRow(r)),
        total: rawRows.length,
        hasMore: rawRows.length === limit,
    };
});
// ---------------------------------------------------------------------------
// Message actions
// ---------------------------------------------------------------------------
registerAction('createMessage', (_db, s, p) => {
    const id = p?.id ?? randomUUID();
    const sessionId = String(p.sessionId);
    const role = p.role ?? 'user';
    const content = typeof p?.content === 'string' ? p.content : '';
    s.createMessage.run({ id, sessionId, role, content: content || '', metadata: JSON.stringify(p?.metadata) });
    return { id };
});
registerAction('getMessage', (_db, s, p) => {
    const row = s.getMessage.get({ id: String(p.id) });
    return row ? toMessage(row) : null;
});
registerAction('getMessagesBySession', (_db, s, p) => {
    const rows = s.getMessagesBySession.all({ sessionId: String(p.sessionId) });
    return rows.map(toMessage);
});
registerAction('upsertMessage', (_db, s, p) => {
    const id = p?.id ?? randomUUID();
    s.upsertMessage.run({
        id, sessionId: String(p.sessionId), role: p.role,
        content: typeof p?.content === 'string' ? p.content : null,
        status: typeof p?.status === 'string' ? p.status : null,
        metadata: JSON.stringify(p?.metadata),
    });
    return { id };
});
// ---------------------------------------------------------------------------
// Worker bootstrap — listen for parent messages
// ---------------------------------------------------------------------------
const dbPath = join(process.cwd(), 'data', 'betty.db');
mkdirSync(join(dbPath, '..'), { recursive: true });
const rawDb = new DatabaseModule(dbPath);
rawDb.pragma('journal_mode = WAL');
rawDb.pragma('foreign_keys = ON');
rawDb.exec(SCHEMA);
const db = rawDb;
const stmts = prepareStatements(db);
process.on('message', (msg) => {
    const handler = ACTION_HANDLERS[msg.action];
    if (!handler) {
        process.send({ requestId: msg.id, ok: false, error: `Unknown action: ${msg.action}` });
        return;
    }
    try {
        const data = handler(db, stmts, msg.params);
        process.send({ requestId: msg.id, ok: true, data });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.send({ requestId: msg.id, ok: false, error: message });
    }
});
process.stdin.resume();
//# sourceMappingURL=worker.js.map