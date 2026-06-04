import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// GET /api/sessions/:id/stats - Get session statistics
router.get('/:id/stats', (req, res) => {
  try {
    const sessionDir = process.env.HOME + '/.pi/agent/sessions';
    const sessionFile = path.join(sessionDir, `${req.params.id}.jsonl`);

    if (!fs.existsSync(sessionFile)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const content = fs.readFileSync(sessionFile, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

    if (lines.length <= 1) {
      return res.json({
        tokensUsed: 0,
        cost: 0,
        contextPercentage: 0,
        userMessages: 0,
        assistantMessages: 0,
        toolCalls: 0,
      });
    }

    // Parse entries to compute stats
    let userMessages = 0;
    let assistantMessages = 0;
    let toolCalls = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === 'user') userMessages++;
        else if (entry.type === 'assistant') assistantMessages++;
        if (entry.toolCalls) toolCalls += entry.toolCalls.length;
      } catch {
        // Skip invalid entries
      }
    }

    // Estimate tokens (rough approximation: ~4 chars per token)
    const totalChars = content.length;
    const estimatedTokens = Math.floor(totalChars / 4);

    res.json({
      tokensUsed: estimatedTokens,
      cost: estimatedTokens * 0.00001, // Rough estimate
      contextPercentage: Math.min((estimatedTokens / 128000) * 100, 100),
      userMessages,
      assistantMessages,
      toolCalls,
    });
  } catch (err: any) {
    console.error('Failed to get session stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
