import { Router } from 'express';
import { DefaultResourceLoader, getAgentDir } from '@earendil-works/pi-coding-agent';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const cwd = process.env.CWD || process.cwd();
    const agentDir = getAgentDir();

    const resourceLoader = new DefaultResourceLoader({
      cwd,
      agentDir,
    });

    const result = await resourceLoader.getPrompts();
    const prompts = result.prompts || [];

    const commands = prompts.map((p: any) => ({
      name: p.name,
      description: p.description || '',
      parameters: p.parameters || [],
    }));

    res.json({ commands });
  } catch (err: any) {
    console.error('Failed to get commands:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
