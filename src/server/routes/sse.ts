/**
 * SSE streaming endpoint — /sse/:sessionId
 * Accepts a POST with user message, streams Pi agent response via Server-Sent Events.
 */

import { Router } from 'express';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Request, Response } from 'express-serve-static-core';
import { randomUUID } from 'node:crypto';
import type { MessageRole } from '../../shared/types.js';
import { sendMessage } from '../pi-client.js';
import { db } from '../db/client.js';

const router = Router();

function getUserId(req: any): string | null {
  return req.userId || null;
}

/** POST /sse/:sessionId — stream assistant response for a user message */
router.post('/:sessionId', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

     
    const body: any = req.body || {};
    const content = typeof body.content === 'string' ? body.content : '';
    const sessionId = String((req.params as any).sessionId);

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify session ownership
     
    const sessionResult: any = await db.getSession(sessionId);
    if (!sessionResult || typeof sessionResult !== 'object') {
      return res.status(404).json({ error: 'Session not found' });
    }

     
    const sessionObj: any = sessionResult;
    if (sessionObj.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch conversation history for context
     
    const rawMessages = await db.getMessagesBySession(sessionId) as unknown[];
     
    const chatHistory: Array<{ role: MessageRole; content: string }> = (Array.isArray(rawMessages) ? rawMessages : []).map((m: any) => ({
      role: m.role || 'user',
      content: m.content != null ? String(m.content) : '',
    }));

    const userMessageId = randomUUID();
    chatHistory.push({ role: 'user', content });

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Create the user message in DB as pending
    await db.createMessage({ id: userMessageId, sessionId, role: 'user', content });

    const assistantMessageId = randomUUID();

    // Send initial event
    res.write(`event: message_start\ndata: ${JSON.stringify({ type: 'message_start', sessionId, messageId: assistantMessageId, role: 'assistant' })}\n\n`);

    try {
      await sendMessage(chatHistory, sessionId, {});
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Streaming failed';
      res.write(`event: error\ndata: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`);

      await db.upsertMessage({ id: assistantMessageId, sessionId, role: 'assistant', content: null, status: 'error' });
      res.write(`event: done\ndata: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    } finally {
      await db.updateSession({ id: sessionId, title: undefined });
    }

    res.write(`event: done\ndata: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'SSE streaming failed';
    if (!res.headersSent) {
      return res.status(500).json({ error: message });
    }
    res.write(`event: error\ndata: ${JSON.stringify({ type: 'error', message })}\n\n`);
    res.end();
  }
});

export default router;
