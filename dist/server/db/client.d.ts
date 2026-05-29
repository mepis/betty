/**
 * DBClient — parent-side proxy that talks to the SQLite worker via IPC.
 * Every method returns a Promise that resolves with the action result.
 */
/** Start the worker thread and return a ready client */
export declare function initDBClient(): Promise<void>;
/** Shut down the worker and clean up */
export declare function closeDBClient(): void;
export declare const db: {
    createUser: (params: Record<string, unknown>) => Promise<unknown>;
    getUserById: (id: string) => Promise<unknown>;
    getUserByUsername: (username: string) => Promise<unknown>;
    createSession: (params: Record<string, unknown>) => Promise<unknown>;
    getSession: (id: string) => Promise<unknown>;
    updateSession: (params: Record<string, unknown>) => Promise<unknown>;
    deleteSession: (id: string) => Promise<unknown>;
    listUserSessions: (userId: string, offset?: number, limit?: number) => Promise<unknown>;
    createMessage: (params: Record<string, unknown>) => Promise<unknown>;
    getMessage: (id: string) => Promise<unknown>;
    getMessagesBySession: (sessionId: string) => Promise<unknown>;
    upsertMessage: (params: Record<string, unknown>) => Promise<unknown>;
    query: (action: string, params?: Record<string, unknown>) => Promise<unknown>;
};
