import { Router } from 'express';
import { ModelRegistry, AuthStorage } from '@earendil-works/pi-coding-agent';

const router = Router();

// Create a shared model registry instance
let modelRegistry: ModelRegistry | null = null;

function getModelRegistry(): ModelRegistry {
  if (!modelRegistry) {
    const agentDir = process.env.HOME + '/.pi/agent';
    const authStorage = AuthStorage.create(agentDir);
    modelRegistry = ModelRegistry.create(authStorage, `${agentDir}/models.json`);
  }
  return modelRegistry;
}

router.get('/', async (_req, res) => {
  try {
    const registry = getModelRegistry();
    const models = await registry.getAvailable();

    if (models.length === 0) {
      // Check if API keys are configured
      const allModels = registry.getAll();
      if (allModels.length === 0) {
        return res.json({
          models: [],
          message: 'No models available. Configure API keys in your environment or auth.json.',
        });
      }
      return res.json({
        models: [],
        message: 'No models with configured API keys. Available models: ' + allModels.length,
      });
    }

    const modelList = models.map((m: any) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      reasoning: m.reasoning,
      contextWindow: m.contextWindow,
      cost: m.cost,
    }));

    res.json({ models: modelList });
  } catch (err: any) {
    console.error('Failed to get models:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
