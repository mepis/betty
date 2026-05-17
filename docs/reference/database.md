# Database Reference

## Summary

Betty uses MySQL/MariaDB with the `mysql2` promise API for persistent storage of users, sessions, and conversation messages. The schema supports role-based access control, session management, and conversation history.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | MySQL server hostname |
| `DB_PORT` | `3306` | MySQL server port |
| `DB_USER` | `root` | MySQL username |
| `DB_PASSWORD` | *(empty)* | MySQL password. **Required** for non-localhost connections |
| `DB_NAME` | `betty` | Database name |
| `DB_SSL` | `false` | Enable SSL/TLS for database connections |

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  WebSocket Server │────▶│   SessionStore   │────▶│    MySQL DB      │
│  (server.ts)     │     │  (sessionStore.ts)│     │  (betty schema)  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                             ▲
┌──────────────────┐     ┌──┴──────────────────┐     ┌──────────────────┐
│  REST API        │────▶│   UserStore          │────▶│    MySQL DB      │
│  (server.ts)     │     │  (userStore.ts)      │     │                  │
└──────────────────┘     └─────────────────────┘     └──────────────────┘
```

- **Connection pooling**: `mysql2` pool with 10 connections, 10s acquire/connect timeout, 60s idle timeout
- **Initialization**: `initDatabase()` creates the database and runs `scripts/init-db.sql` on startup
- **Shutdown**: `closeDatabase()` gracefully closes all pools on `SIGINT`

## Schema

### Tables

#### `users`

Application users with role-based access control.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `CHAR(36)` | PRIMARY KEY | UUID v4 |
| `username` | `VARCHAR(64)` | UNIQUE, NOT NULL | User login name |
| `hashed_password` | `VARCHAR(255)` | NOT NULL | bcrypt hash |
| `role` | `ENUM('admin','user','viewer')` | NOT NULL, DEFAULT 'user' | Access level |
| `created_at` | `BIGINT` | NOT NULL | Unix timestamp (ms) |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE (username)` — auto-created by UNIQUE constraint

---

#### `sessions`

Tracks pi agent sessions per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `CHAR(36)` | PRIMARY KEY | UUID v4 (matches pi session ID) |
| `user_id` | `CHAR(36)` | NOT NULL, FK→users | Owner of this session |
| `pi_session_id` | `VARCHAR(255)` | NULL | pi's internal session reference |
| `name` | `VARCHAR(200)` | DEFAULT 'Untitled' | Human-readable session name |
| `model_id` | `VARCHAR(100)` | NULL | Currently selected model |
| `model_provider` | `VARCHAR(50)` | NULL | Provider (e.g., 'anthropic') |
| `thinking_level` | `VARCHAR(20)` | DEFAULT 'medium' | Thinking depth setting |
| `message_count` | `INT` | DEFAULT 0 | Total messages in session |
| `status` | `ENUM('active','compact','closed')` | DEFAULT 'active' | Session lifecycle state |
| `created_at` | `BIGINT` | NOT NULL | Session creation time |
| `updated_at` | `BIGINT` | NOT NULL | Last update time |

**Indexes:**
- `PRIMARY KEY (id)`
- `idx_sessions_user_id (user_id)` — fast lookup of user's sessions
- `idx_sessions_status (status)` — filter by session status

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE

---

#### `session_messages`

Persisted conversation messages per session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `CHAR(36)` | PRIMARY KEY | UUID v4 |
| `session_id` | `CHAR(36)` | NOT NULL, FK→sessions | Parent session |
| `role` | `ENUM('user','assistant','system')` | NOT NULL | Message sender |
| `content` | `LONGTEXT` | NOT NULL | Message body (supports long AI responses) |
| `timestamp` | `BIGINT` | NOT NULL | Message ordering timestamp |
| `is_streaming` | `TINYINT(1)` | DEFAULT 0 | Whether message is still being streamed |
| `created_at` | `BIGINT` | NOT NULL | Record creation time |

**Indexes:**
- `PRIMARY KEY (id)`
- `idx_session_messages_session_id (session_id)` — fast lookup of session messages
- `idx_session_messages_timestamp (timestamp)` — ordering by conversation order
- `idx_session_messages_created_at (created_at)` — date-range queries

**Foreign Keys:**
- `session_id` → `sessions(id)` ON DELETE CASCADE

## Relationships

```
users (1) ──────── (N) sessions (1) ──────── (N) session_messages
```

- Deleting a user cascades to all their sessions and messages
- Deleting a session cascades to all its messages
- `message_count` on sessions is updated atomically with batch message inserts

## API Methods

### SessionStore (`sessionStore.ts`)

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `registerSession` | `userId, sessionData` | `Promise<Session>` | Create a new session |
| `getSession` | `sessionId` | `Promise<Session \| null>` | Get session by ID |
| `updateSession` | `sessionId, updates` | `Promise<boolean>` | Update session metadata |
| `closeSession` | `sessionId` | `Promise<boolean>` | Mark session as closed |
| `getUserSessions` | `userId, limit?, offset?` | `Promise<Session[]>` | Paginated session list |
| `getUserSessionCount` | `userId` | `Promise<number>` | Total session count |
| `saveMessage` | `sessionId, message` | `Promise<SessionMessage>` | Save single message |
| `saveMessages` | `sessionId, messages[]` | `Promise<void>` | Batch insert (transactional) |
| `getMessages` | `sessionId, limit?, offset?` | `Promise<SessionMessage[]>` | Paginated message list |
| `deleteMessages` | `sessionId` | `Promise<void>` | Clear all session messages |
| `recordMessageCount` | `sessionId, count` | `Promise<void>` | Update message count |
| `getMessageCount` | `sessionId` | `Promise<number>` | Count messages in session |
| `deleteSession` | `sessionId` | `Promise<boolean>` | Delete session and messages |

### UserStore (`userStore.ts`)

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `createUser` | `username, password, role` | `Promise<Omit<User, "hashedPassword">>` | Create user with bcrypt |
| `findUser` | `username` | `User \| undefined` | Lookup by username |
| `findUserById` | `id` | `User \| undefined` | Lookup by UUID |
| `authenticate` | `username, password` | `Promise<User \| null>` | Verify password |
| `getAllUsers` | — | `UserPublic[]` | All users (no passwords) |
| `updateUser` | `id, updates` | `Promise<User \| null>` | Update password/role |
| `deleteUser` | `id` | `Promise<boolean>` | Delete user |
| `hasUsers` | — | `boolean` | Check if any users exist |
| `seedDefaultAdmin` | — | `Promise<void>` | Create admin if no users |

## Connection Pool Configuration

| Option | Value | Purpose |
|--------|-------|---------|
| `connectionLimit` | `10` | Maximum concurrent connections |
| `connectTimeout` | `10000` ms | Timeout for new connections |
| `acquireTimeout` | `10000` ms | Timeout waiting for a connection from pool |
| `idleTimeout` | `60000` ms | Remove idle connections after 1 minute |
| `waitForConnections` | `true` | Queue excess requests instead of rejecting |
| `charset` | `utf8mb4` | Full Unicode + emoji support |
| `timezone` | `+00:00` | UTC timezone |

## Initialization

The database is initialized on server startup:

1. `initDatabase()` creates the database (if not exists) and runs `scripts/init-db.sql`
2. The SQL script uses `CREATE TABLE IF NOT EXISTS` for idempotency
3. After init, `seedDefaultAdmin()` creates an admin user if none exist
4. Auto-generated admin credentials are saved to `.admin-credentials.json`

## Health Check

The `/health` endpoint reports database status:

```json
{
  "status": "ok",
  "db": {
    "connected": true,
    "pool": {
      "connections": 2,
      "pending": 0,
      "database": "betty",
      "host": "localhost",
      "port": 3306
    }
  }
}
```

## Tags

- **category**: database, mysql
- **component**: db.ts, sessionStore.ts, userStore.ts, init-db.sql
- **pattern**: connection-pooling, foreign-keys, cascading-deletes
- **audience**: developers, engineers
