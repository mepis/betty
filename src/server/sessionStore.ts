import { randomUUID } from "node:crypto";
import { execute, getPool } from "./db";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SessionStatus = "active" | "compact" | "closed";

export interface Session {
  id: string;
  user_id: string;
  pi_session_id: string | null;
  name: string;
  model_id: string | null;
  model_provider: string | null;
  thinking_level: string;
  message_count: number;
  status: SessionStatus;
  created_at: number;
  updated_at: number;
}

export interface SessionInsert {
  id: string;
  user_id: string;
  pi_session_id?: string | null;
  name?: string;
  model_id?: string | null;
  model_provider?: string | null;
  thinking_level?: string;
  created_at?: number;
}

export interface SessionMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  is_streaming: boolean;
  created_at: number;
}

/** Message data for insertion (without generated fields). */
export interface SessionMessageInsert {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  is_streaming: boolean;
}

export interface SessionUpdate {
  name?: string;
  model_id?: string | null;
  model_provider?: string | null;
  thinking_level?: string;
  status?: SessionStatus;
  pi_session_id?: string | null;
}

// ─── SessionStore ───────────────────────────────────────────────────────────

export class SessionStore {
  /** Register a new session for a user. */
  async registerSession(
    userId: string,
    sessionData: SessionInsert
  ): Promise<Session> {
    const {
      id,
      user_id,
      pi_session_id = null,
      name = "Untitled",
      model_id = null,
      model_provider = null,
      thinking_level = "medium",
      created_at = Date.now(),
    } = sessionData;

    const now = Date.now();
    await execute(
      `INSERT INTO sessions (id, user_id, pi_session_id, name, model_id, model_provider, thinking_level, message_count, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?)`,
      [id, user_id, pi_session_id, name, model_id, model_provider, thinking_level, created_at, now]
    );

    return {
      id,
      user_id,
      pi_session_id,
      name,
      model_id,
      model_provider,
      thinking_level,
      message_count: 0,
      status: "active",
      created_at,
      updated_at: now,
    };
  }

  /** Get session info by session ID. */
  async getSession(sessionId: string): Promise<Session | null> {
    const rows = (await execute<Session[]>(
      "SELECT * FROM sessions WHERE id = ?",
      [sessionId]
    )) as unknown as Session[];
    return rows.length > 0 ? rows[0] : null;
  }

  /** Update session metadata. */
  async updateSession(
    sessionId: string,
    updates: SessionUpdate
  ): Promise<boolean> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      params.push(updates.name);
    }
    if (updates.model_id !== undefined) {
      fields.push("model_id = ?");
      params.push(updates.model_id);
    }
    if (updates.model_provider !== undefined) {
      fields.push("model_provider = ?");
      params.push(updates.model_provider);
    }
    if (updates.thinking_level !== undefined) {
      fields.push("thinking_level = ?");
      params.push(updates.thinking_level);
    }
    if (updates.status !== undefined) {
      fields.push("status = ?");
      params.push(updates.status);
    }
    if (updates.pi_session_id !== undefined) {
      fields.push("pi_session_id = ?");
      params.push(updates.pi_session_id);
    }

    if (fields.length === 0) return false;

    fields.push("updated_at = ?");
    params.push(Date.now());
    params.push(sessionId);

    await execute(
      `UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`,
      params
    );

    return true;
  }

  /** Mark a session as closed. */
  async closeSession(sessionId: string): Promise<boolean> {
    return this.updateSession(sessionId, { status: "closed" });
  }

  /**
   * List all sessions for a user, with optional pagination.
   * @param userId - The user's ID.
   * @param limit - Maximum number of sessions to return (default: 50).
   * @param offset - Number of sessions to skip (default: 0).
   */
  async getUserSessions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Session[]> {
    // Clamp limit to a reasonable maximum
    const clampedLimit = Math.min(Math.max(limit, 1), 200);
    const clampedOffset = Math.max(offset, 0);

    return (await execute<Session[]>(
      "SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?",
      [userId, clampedLimit, clampedOffset]
    )) as unknown as Session[];
  }

  /**
   * Get the total number of sessions for a user.
   * @param userId - The user's ID.
   */
  async getUserSessionCount(userId: string): Promise<number> {
    const rows = (await execute<{ count: number }[]>(
      "SELECT COUNT(*) as count FROM sessions WHERE user_id = ?",
      [userId]
    )) as unknown as { count: number }[];
    return rows.length > 0 ? rows[0].count : 0;
  }

  /** Persist a chat message to the session messages table. */
  async saveMessage(
    sessionId: string,
    message: SessionMessageInsert
  ): Promise<SessionMessage> {
    const id = randomUUID();
    const now = Date.now();

    await execute(
      `INSERT INTO session_messages (id, session_id, role, content, timestamp, is_streaming, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sessionId,
        message.role,
        message.content,
        message.timestamp,
        message.is_streaming ? 1 : 0,
        now,
      ]
    );

    return {
      id,
      session_id: sessionId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      is_streaming: message.is_streaming,
      created_at: now,
    };
  }

  /**
   * Save multiple messages in a single transaction, and update the session's
   * message_count accordingly (M07 fix).
   */
  async saveMessages(
    sessionId: string,
    messages: SessionMessageInsert[]
  ): Promise<void> {
    const conn = await getPool().getConnection();
    try {
      await conn.beginTransaction();
      const now = Date.now();

      for (const msg of messages) {
        const id = randomUUID();
        await conn.execute(
          `INSERT INTO session_messages (id, session_id, role, content, timestamp, is_streaming, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            sessionId,
            msg.role,
            msg.content,
            msg.timestamp,
            msg.is_streaming ? 1 : 0,
            now,
          ]
        );
      }

      // M07 fix: update message_count within the same transaction
      await conn.execute(
        "UPDATE sessions SET message_count = message_count + ?, updated_at = ? WHERE id = ?",
        [messages.length, now, sessionId]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Get messages for a session with optional pagination (M19 fix).
   * @param sessionId - The session ID.
   * @param limit - Maximum messages to return (default: 100).
   * @param offset - Messages to skip (default: 0).
   */
  async getMessages(
    sessionId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<SessionMessage[]> {
    const clampedLimit = Math.min(Math.max(limit, 1), 500);
    const clampedOffset = Math.max(offset, 0);

    return (await execute<SessionMessage[]>(
      "SELECT * FROM session_messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ? OFFSET ?",
      [sessionId, clampedLimit, clampedOffset]
    )) as unknown as SessionMessage[];
  }

  /** Delete all messages for a session (used on compaction/clear). */
  async deleteMessages(sessionId: string): Promise<void> {
    await execute("DELETE FROM session_messages WHERE session_id = ?", [
      sessionId,
    ]);
  }

  /** Update the message count for a session. */
  async recordMessageCount(sessionId: string, count: number): Promise<void> {
    await execute(
      "UPDATE sessions SET message_count = ?, updated_at = ? WHERE id = ?",
      [count, Date.now(), sessionId]
    );
  }

  /** Get a count of messages for a session. */
  async getMessageCount(sessionId: string): Promise<number> {
    const rows = (await execute<{ count: number }[]>(
      "SELECT COUNT(*) as count FROM session_messages WHERE session_id = ?",
      [sessionId]
    )) as unknown as { count: number }[];
    return rows.length > 0 ? rows[0].count : 0;
  }

  /** Delete a session and all its messages. */
  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await execute(
      "DELETE FROM sessions WHERE id = ?",
      [sessionId]
    );
    // mysql2 returns { affectedRows: number }
    const affected = result as { affectedRows: number };
    return affected.affectedRows > 0;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const sessionStore = new SessionStore();
