/**
 * Session routes: list, create, get, update, delete with branching/forking support.
 */

 
import type { Request, Response } from 'express-serve-static-core';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/client.js';
import type { SessionDetail, SessionListItem } from '../../shared/types.js';

const router = Router();
type AnyRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function getUserId(req: Request): string {
  const uid = (req as unknown as Record<string, unknown>).userId;
  if (!uid || typeof uid !== 'string') throw new Error('Authentication required');
  return uid;
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

function normalizeAncestors(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return [];
}

 
function toMessage(m: any): SessionDetail['messages'][number] {
  let meta: Record<string, unknown> | undefined;
  if (m.metadata) { try { meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata as Record<string, unknown>; } catch { /* ignore */ } }
  return {
    id: String(m.id ?? ''), sessionId: String(m.sessionId ?? ''),
    role: (m.role as SessionDetail['messages'][number]['role']) ?? 'user',
    content: String(m.content ?? ''), status: (m.status as SessionDetail['messages'][number]['status']) ?? 'pending',
    metadata: meta, createdAt: String(m.createdAt ?? new Date().toISOString()),
  };
}

// ---------------------------------------------------------------------------
// GET /api/sessions — list user's sessions with message previews
// ---------------------------------------------------------------------------

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(_req);
    const page = Math.max(1, parseInt((_req.query.page as string | undefined) || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((_req.query.pageSize as string | undefined) || '25', 10)));
    const offset = (page - 1) * pageSize;

     
    const result: any = await db.listUserSessions(userId, offset, pageSize);
    if (!result || typeof result !== 'object' || !Array.isArray(result.items)) {
      return res.json({ items: [], total: 0, page, pageSize, hasMore: false });
    }

     
    const sessionRows = result.items as any[];

    // Enrich with first/last message previews
     
    const items: SessionListItem[] = await Promise.all(
      sessionRows.map(async (session) => {
        try {
           
          const msgs = await db.getMessagesBySession(session.id) as any[];
          const msgArr = Array.isArray(msgs) ? msgs : [];
          const firstMsg = msgArr[0];
          const lastMsg = msgArr[msgArr.length - 1];
          return {
            id: session.id, title: String(session.title || 'New Chat'),
            branchPointId: (session.branchPointId != null) ? String(session.branchPointId) : null,
            parentBranchId: (session.parentBranchId != null) ? String(session.parentBranchId) : null,
            ancestorIds: normalizeAncestors(session.ancestorIds),
            createdAt: session.createdAt || '', updatedAt: session.updatedAt || '',
            firstMessage: (firstMsg?.content != null && typeof firstMsg.content === 'string') ? firstMsg.content.substring(0, 120) : null,
            lastMessage: (lastMsg?.content != null && typeof lastMsg.content === 'string') ? lastMsg.content.substring(0, 120) : null,
          };
        } catch {
          return {
            id: session.id, title: String(session.title || 'New Chat'),
            branchPointId: (session.branchPointId != null) ? String(session.branchPointId) : null,
            parentBranchId: (session.parentBranchId != null) ? String(session.parentBranchId) : null,
            ancestorIds: normalizeAncestors(session.ancestorIds),
            createdAt: session.createdAt || '', updatedAt: session.updatedAt || '',
            firstMessage: null, lastMessage: null,
          };
        }
      }),
    );

    return res.json({ items, total: sessionRows.length, page, pageSize, hasMore: (result as AnyRecord).hasMore === true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list sessions';
    return res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/sessions/:id — get a session with all its messages
// ---------------------------------------------------------------------------

router.get('/:id', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(_req);
     
    const sessionId = String((_req.params as any).id);

     
    const sessionResult: any = await db.getSession(sessionId);
    if (!sessionResult || typeof sessionResult !== 'object') {
      return res.status(404).json({ error: 'Session not found' });
    }

     
    const sessionRow: any = sessionResult;
    if (sessionRow.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

     
    const rawMessages = await db.getMessagesBySession(sessionId) as any[];
    const messages = Array.isArray(rawMessages) ? rawMessages.map(toMessage) : [];

    return res.json({
      session: {
        id: String(sessionRow.id), title: String(sessionRow.title || 'New Chat'),
        branchPointId: (sessionRow.branchPointId != null && typeof sessionRow.branchPointId === 'string') ? sessionRow.branchPointId : null,
        parentBranchId: (sessionRow.parentBranchId != null && typeof sessionRow.parentBranchId === 'string') ? sessionRow.parentBranchId : null,
        ancestorIds: normalizeAncestors(sessionRow.ancestorIds),
        createdAt: String(sessionRow.createdAt || ''), updatedAt: String(sessionRow.updatedAt || ''),
      }, messages,
    } as SessionDetail);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch session';
    return res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/sessions — create a new session (optionally branch/fork)
// ---------------------------------------------------------------------------

router.post('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(_req);
     
    const rawBody: any = _req.body || {};
    const title = typeof rawBody.title === 'string' ? rawBody.title.trim() : '';
     
    const branchFrom = typeof rawBody.branchFrom === 'string' ? rawBody.branchFrom : undefined;

    let result: unknown;

    if (branchFrom) {
      // --- Branching/Forking logic ---
      // Fetch all user sessions to find the source session containing this message
       
      const allSessionsResult: any = await db.listUserSessions(userId, 0, 100);
       
      const allSessions = Array.isArray(allSessionsResult?.items) ? (allSessionsResult.items as any[]) : [];

      let parentSession: AnyRecord | null = null;
      for (const s of allSessions) {
        try {
           
          const msgs = await db.getMessagesBySession(s.id) as any[];
          if (Array.isArray(msgs)) {
            for (const msg of msgs) {
              if ((msg as AnyRecord).id === branchFrom) {
                parentSession = s as unknown as AnyRecord;
                break;
              }
            }
          }
        } catch { /* skip sessions we can't load */ }
        if (parentSession) break;
      }

      if (!parentSession) {
        return res.status(404).json({ error: 'Source session or message not found' });
      }

      const parentAncestors = normalizeAncestors(parentSession.ancestorIds);
      const newAncestorIds = [...parentAncestors, String((parentSession as AnyRecord).id)];

      result = await db.createSession({
        id: randomUUID(), userId, title: title || 'New Chat',
        branchPointId: branchFrom, parentBranchId: String((parentSession as AnyRecord).id), ancestorIds: newAncestorIds,
      });
    } else {
      result = await db.createSession({ id: randomUUID(), userId, title: title || 'New Chat' });
    }

    return res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create session';
    return res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/sessions/:id — update a session's title
// ---------------------------------------------------------------------------

router.put('/:id', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(_req);
     
    const sessionId = String((_req.params as any).id);
     
    const body: any = _req.body || {};

    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
    }

     
    const sessionResult: any = await db.getSession(sessionId);
    if (!sessionResult || typeof sessionResult !== 'object') {
      return res.status(404).json({ error: 'Session not found' });
    }

     
    const sessionRow: any = sessionResult;
    if (sessionRow.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.updateSession({ id: sessionId, title: body.title.trim() });
    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update session';
    return res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/sessions/:id — delete a session and all its messages
// ---------------------------------------------------------------------------

router.delete('/:id', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(_req);
     
    const sessionId = String((_req.params as any).id);

     
    const sessionResult: any = await db.getSession(sessionId);
    if (!sessionResult || typeof sessionResult !== 'object') {
      return res.status(404).json({ error: 'Session not found' });
    }

     
    const sessionRow: any = sessionResult;
    if (sessionRow.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.deleteSession(sessionId);
    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete session';
    return res.status(500).json({ error: message });
  }
});

export default router;
