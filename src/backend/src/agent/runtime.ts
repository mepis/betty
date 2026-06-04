import {
  createAgentSessionRuntime,
  createAgentSessionFromServices,
  createAgentSessionServices,
  getAgentDir,
  SessionManager,
  AuthStorage,
  ModelRegistry,
  type CreateAgentSessionRuntimeFactory,
  type AgentSessionRuntime,
  type AgentSessionRuntimeDiagnostic,
} from '@earendil-works/pi-coding-agent';

export interface RuntimeOptions {
  cwd?: string;
  agentDir?: string;
  sessionManager?: SessionManager;
  authStorage?: AuthStorage;
  modelRegistry?: ModelRegistry;
  sessionStartEvent?: Record<string, unknown>;
}

export async function createRuntime(options: RuntimeOptions = {}): Promise<{
  runtime: AgentSessionRuntime;
  diagnostics: AgentSessionRuntimeDiagnostic[];
}> {
  const cwd = options.cwd || process.cwd();
  const agentDir = options.agentDir || getAgentDir();
  const sessionManager = options.sessionManager || SessionManager.create(cwd);

  // Create auth storage
  const authStorage = options.authStorage || AuthStorage.create(agentDir);

  // Create model registry
  const modelRegistry = options.modelRegistry || ModelRegistry.create(authStorage, `${agentDir}/models.json`);

  // Create the runtime factory
  const createRuntimeFactory: CreateAgentSessionRuntimeFactory = async ({
    cwd: factoryCwd,
    sessionManager: mgr,
    sessionStartEvent,
  }) => {
    const services = await createAgentSessionServices({ cwd: factoryCwd });
    return {
      ...(await createAgentSessionFromServices({
        services,
        sessionManager: mgr,
        sessionStartEvent,
      })),
      services,
      diagnostics: services.diagnostics,
    };
  };

  const runtime = await createAgentSessionRuntime(createRuntimeFactory, {
    cwd,
    agentDir,
    sessionManager,
    sessionStartEvent: options.sessionStartEvent as any,
  });

  return { runtime, diagnostics: [...runtime.diagnostics] };
}
