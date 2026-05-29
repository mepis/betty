/**
 * DBClient — parent-side proxy that talks to the SQLite worker via IPC.
 * Every method returns a Promise that resolves with the action result.
 */

import { Worker } from 'node:worker_threads';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let worker: Worker | null = null;
const pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let nextId = 0;

/** Start the worker thread and return a ready client */
export async function initDBClient(): Promise<void> {
  if (worker) return;

  worker = new Worker(path.resolve(__dirname, 'worker.js'), {
    execArgv: ['--loader=tsx'], // tsx handles .ts → .js on the fly
  });

  worker.on('message', (msg: { requestId: string; ok: boolean; data?: unknown; error?: string }) => {
    const handler = pendingRequests.get(msg.requestId);
    if (!handler) return;
    pendingRequests.delete(msg.requestId);

    if (msg.ok) {
      handler.resolve(msg.data ?? null);
    } else {
      handler.reject(new Error(msg.error ?? 'Unknown DB error'));
    }
  });

  worker.on('error', (err: Error) => {
    // Reject all pending requests on fatal worker errors
    for (const [, h] of pendingRequests) h.reject(err);
    pendingRequests.clear();
  });

  await new Promise<void>((resolve, reject) => {
    worker!.once('online', resolve);
    worker!.once('error', reject);
  });
}

/** Shut down the worker and clean up */
export function closeDBClient(): void {
  if (!worker) return;
  // Reject all pending requests
  for (const [, h] of pendingRequests) h.reject(new Error('Worker shutting down'));
  pendingRequests.clear();
  worker.terminate();
  worker = null;
}

/** Send an action to the worker and await a result */
function send(action: string, params?: Record<string, unknown>): Promise<unknown> {
  if (!worker) throw new Error('DB client not initialized — call initDBClient() first');

  return new Promise((resolve, reject) => {
    const id = `req_${++nextId}_${Date.now().toString(36)}`;
    pendingRequests.set(id, { resolve, reject });
    worker!.postMessage({ id, action, params });

    // Safety timeout (5 seconds per request)
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`DB action '${action}' timed out`));
      }
    }, 5000);
  });
}

// ---------------------------------------------------------------------------
// Public API — mirrors the actions in worker.ts
// ---------------------------------------------------------------------------

export const db = {
  // Users
  createUser: (params: Record<string, unknown>) => send('createUser', params),
  getUserById: (id: string) => send('getUserById', { id }),
  getUserByUsername: (username: string) => send('getUserByUsername', { username }),

  // Sessions
  createSession: (params: Record<string, unknown>) => send('createSession', params),
  getSession: (id: string) => send('getSession', { id }),
  updateSession: (params: Record<string, unknown>) => send('updateSession', params),
  deleteSession: (id: string) => send('deleteSession', { id }),
  listUserSessions: (userId: string, offset = 0, limit = 25) =>
    send('listUserSessions', { userId, offset, limit }),

  // Messages
  createMessage: (params: Record<string, unknown>) => send('createMessage', params),
  getMessage: (id: string) => send('getMessage', { id }),
  getMessagesBySession: (sessionId: string) => send('getMessagesBySession', { sessionId }),
  upsertMessage: (params: Record<string, unknown>) => send('upsertMessage', params),

  // Utility — raw action for custom queries
  query: (action: string, params?: Record<string, unknown>) => send(action, params),
};
