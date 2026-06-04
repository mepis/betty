import { Router } from 'express';
import { SessionManager } from '@earendil-works/pi-coding-agent';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

function getSessionDir(): string {
  const cwd = process.env.CWD || process.cwd();
  const agentDir = process.env.HOME + '/.pi/agent';
  return path.join(agentDir, 'sessions');
}

// GET /api/sessions - List all sessions
router.get('/', (_req, res) => {
  try {
    const sessionDir = getSessionDir();
    const sessions: any[] = [];

    if (!fs.existsSync(sessionDir)) {
      return res.json({ sessions: [] });
    }

    const files = fs.readdirSync(sessionDir).filter((f) => f.endsWith('.jsonl'));

    for (const file of files) {
      const filePath = path.join(sessionDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim());
        if (lines.length === 0) continue;

        // Parse the header line
        const header = JSON.parse(lines[0]);
        const sessionName = header.name || file.replace('.jsonl', '');
        const createdAt = header.createdAt || Date.now();
        const updatedAt = header.updatedAt || createdAt;
        const model = header.model || 'unknown';

        // Count messages (skip header)
        const messageCount = lines.length - 1;

        sessions.push({
          id: file.replace('.jsonl', ''),
          name: sessionName,
          sessionFile: filePath,
          createdAt,
          updatedAt,
          model,
          messageCount,
        });
      } catch {
        // Skip invalid files
      }
    }

    // Sort by updatedAt descending
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);

    res.json({ sessions });
  } catch (err: any) {
    console.error('Failed to list sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions - Create a new session (placeholder)
router.post('/', (_req, res) => {
  // Session creation is handled via WebSocket (new_session command)
  // This endpoint is for REST-based session creation
  const sessionDir = getSessionDir();
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const sessionId = crypto.randomUUID();
  const sessionFile = path.join(sessionDir, `${sessionId}.jsonl`);

  // Write header
  const header = {
    name: 'New Session',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: 'default',
  };

  fs.writeFileSync(sessionFile, JSON.stringify(header) + '\n');

  res.json({
    id: sessionId,
    sessionFile,
    ...header,
  });
});

// DELETE /api/sessions/:id - Delete a session
router.delete('/:id', (req, res) => {
  try {
    const sessionDir = getSessionDir();
    const sessionFile = path.join(sessionDir, `${req.params.id}.jsonl`);

    if (!fs.existsSync(sessionFile)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    fs.unlinkSync(sessionFile);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete session:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
