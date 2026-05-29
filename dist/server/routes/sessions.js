/**
 * Session routes: list, create, get, update, delete with branching/forking support.
 */
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/client.js';
const router = Router();
// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
function getUserId(req) {
    const uid = req.userId;
    if (!uid || typeof uid !== 'string')
        throw new Error('Authentication required');
    return uid;
}
// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------
function normalizeAncestors(val) {
    if (Array.isArray(val))
        return val;
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        }
        catch {
            return [];
        }
    }
    return [];
}
function toMessage(m) {
    let meta;
    if (m.metadata) {
        try {
            meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
        }
        catch { /* ignore */ }
    }
    return {
        id: String(m.id ?? ''), sessionId: String(m.sessionId ?? ''),
        role: m.role ?? 'user',
        content: String(m.content ?? ''), status: m.status ?? 'pending',
        metadata: meta, createdAt: String(m.createdAt ?? new Date().toISOString()),
    };
}
// ---------------------------------------------------------------------------
// GET /api/sessions — list user's sessions with message previews
// ---------------------------------------------------------------------------
router.get('/', async (_req, res) => {
    try {
        const userId = getUserId(_req);
        const page = Math.max(1, parseInt(_req.query.page || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(_req.query.pageSize || '25', 10)));
        const offset = (page - 1) * pageSize;
        const result = await db.listUserSessions(userId, offset, pageSize);
        if (!result || typeof result !== 'object' || !Array.isArray(result.items)) {
            return res.json({ items: [], total: 0, page, pageSize, hasMore: false });
        }
        const sessionRows = result.items;
        // Enrich with first/last message previews
        const items = await Promise.all(sessionRows.map(async (session) => {
            try {
                const msgs = await db.getMessagesBySession(session.id);
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
            }
            catch {
                return {
                    id: session.id, title: String(session.title || 'New Chat'),
                    branchPointId: (session.branchPointId != null) ? String(session.branchPointId) : null,
                    parentBranchId: (session.parentBranchId != null) ? String(session.parentBranchId) : null,
                    ancestorIds: normalizeAncestors(session.ancestorIds),
                    createdAt: session.createdAt || '', updatedAt: session.updatedAt || '',
                    firstMessage: null, lastMessage: null,
                };
            }
        }));
        return res.json({ items, total: sessionRows.length, page, pageSize, hasMore: result.hasMore === true });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list sessions';
        return res.status(500).json({ error: message });
    }
});
// ---------------------------------------------------------------------------
// GET /api/sessions/:id — get a session with all its messages
// ---------------------------------------------------------------------------
router.get('/:id', async (_req, res) => {
    try {
        const userId = getUserId(_req);
        const sessionId = String(_req.params.id);
        const sessionResult = await db.getSession(sessionId);
        if (!sessionResult || typeof sessionResult !== 'object') {
            return res.status(404).json({ error: 'Session not found' });
        }
        const sessionRow = sessionResult;
        if (sessionRow.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const rawMessages = await db.getMessagesBySession(sessionId);
        const messages = Array.isArray(rawMessages) ? rawMessages.map(toMessage) : [];
        return res.json({
            session: {
                id: String(sessionRow.id), title: String(sessionRow.title || 'New Chat'),
                branchPointId: (sessionRow.branchPointId != null && typeof sessionRow.branchPointId === 'string') ? sessionRow.branchPointId : null,
                parentBranchId: (sessionRow.parentBranchId != null && typeof sessionRow.parentBranchId === 'string') ? sessionRow.parentBranchId : null,
                ancestorIds: normalizeAncestors(sessionRow.ancestorIds),
                createdAt: String(sessionRow.createdAt || ''), updatedAt: String(sessionRow.updatedAt || ''),
            }, messages,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch session';
        return res.status(500).json({ error: message });
    }
});
// ---------------------------------------------------------------------------
// POST /api/sessions — create a new session (optionally branch/fork)
// ---------------------------------------------------------------------------
router.post('/', async (_req, res) => {
    try {
        const userId = getUserId(_req);
        const rawBody = _req.body || {};
        const title = typeof rawBody.title === 'string' ? rawBody.title.trim() : '';
        const branchFrom = typeof rawBody.branchFrom === 'string' ? rawBody.branchFrom : undefined;
        let result;
        if (branchFrom) {
            // --- Branching/Forking logic ---
            // Fetch all user sessions to find the source session containing this message
            const allSessionsResult = await db.listUserSessions(userId, 0, 100);
            const allSessions = Array.isArray(allSessionsResult?.items) ? allSessionsResult.items : [];
            let parentSession = null;
            for (const s of allSessions) {
                try {
                    const msgs = await db.getMessagesBySession(s.id);
                    if (Array.isArray(msgs)) {
                        for (const msg of msgs) {
                            if (msg.id === branchFrom) {
                                parentSession = s;
                                break;
                            }
                        }
                    }
                }
                catch { /* skip sessions we can't load */ }
                if (parentSession)
                    break;
            }
            if (!parentSession) {
                return res.status(404).json({ error: 'Source session or message not found' });
            }
            const parentAncestors = normalizeAncestors(parentSession.ancestorIds);
            const newAncestorIds = [...parentAncestors, String(parentSession.id)];
            result = await db.createSession({
                id: randomUUID(), userId, title: title || 'New Chat',
                branchPointId: branchFrom, parentBranchId: String(parentSession.id), ancestorIds: newAncestorIds,
            });
        }
        else {
            result = await db.createSession({ id: randomUUID(), userId, title: title || 'New Chat' });
        }
        return res.status(201).json(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create session';
        return res.status(500).json({ error: message });
    }
});
// ---------------------------------------------------------------------------
// PUT /api/sessions/:id — update a session's title
// ---------------------------------------------------------------------------
router.put('/:id', async (_req, res) => {
    try {
        const userId = getUserId(_req);
        const sessionId = String(_req.params.id);
        const body = _req.body || {};
        if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
            return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
        }
        const sessionResult = await db.getSession(sessionId);
        if (!sessionResult || typeof sessionResult !== 'object') {
            return res.status(404).json({ error: 'Session not found' });
        }
        const sessionRow = sessionResult;
        if (sessionRow.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await db.updateSession({ id: sessionId, title: body.title.trim() });
        return res.json({ success: true });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update session';
        return res.status(500).json({ error: message });
    }
});
// ---------------------------------------------------------------------------
// DELETE /api/sessions/:id — delete a session and all its messages
// ---------------------------------------------------------------------------
router.delete('/:id', async (_req, res) => {
    try {
        const userId = getUserId(_req);
        const sessionId = String(_req.params.id);
        const sessionResult = await db.getSession(sessionId);
        if (!sessionResult || typeof sessionResult !== 'object') {
            return res.status(404).json({ error: 'Session not found' });
        }
        const sessionRow = sessionResult;
        if (sessionRow.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await db.deleteSession(sessionId);
        return res.json({ success: true });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete session';
        return res.status(500).json({ error: message });
    }
});
export default router;
//# sourceMappingURL=sessions.js.map