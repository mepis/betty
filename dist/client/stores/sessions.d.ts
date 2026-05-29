import type { SessionListItem, SessionDetail, Message } from '../../shared/types.js';
export declare const useSessionsStore: import("pinia").StoreDefinition<"sessions", Pick<{
    sessions: import("vue").Ref<{
        id: string;
        title: string;
        branchPointId?: string | null | undefined;
        parentBranchId?: string | null | undefined;
        ancestorIds: string[];
        createdAt: string;
        updatedAt: string;
        firstMessage?: string | null | undefined;
        lastMessage?: string | null | undefined;
    }[], SessionListItem[] | {
        id: string;
        title: string;
        branchPointId?: string | null | undefined;
        parentBranchId?: string | null | undefined;
        ancestorIds: string[];
        createdAt: string;
        updatedAt: string;
        firstMessage?: string | null | undefined;
        lastMessage?: string | null | undefined;
    }[]>;
    currentSession: import("vue").Ref<{
        session: {
            id: string;
            createdAt: string;
            title: string;
            branchPointId?: string | null | undefined;
            parentBranchId?: string | null | undefined;
            ancestorIds: string[];
            updatedAt: string;
        };
        messages: {
            id: string;
            sessionId: string;
            role: import("../../shared/types.js").MessageRole;
            content: string;
            status: import("../../shared/types.js").MessageStatus;
            metadata?: Record<string, unknown> | undefined;
            createdAt: string;
        }[];
    } | null, SessionDetail | {
        session: {
            id: string;
            createdAt: string;
            title: string;
            branchPointId?: string | null | undefined;
            parentBranchId?: string | null | undefined;
            ancestorIds: string[];
            updatedAt: string;
        };
        messages: {
            id: string;
            sessionId: string;
            role: import("../../shared/types.js").MessageRole;
            content: string;
            status: import("../../shared/types.js").MessageStatus;
            metadata?: Record<string, unknown> | undefined;
            createdAt: string;
        }[];
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    hasMore: import("vue").ComputedRef<boolean>;
    fetchSessions: (page?: number, pageSize?: number) => Promise<void>;
    fetchSession: (id: string) => Promise<SessionDetail | null>;
    createSession: (title?: string, branchFrom?: string) => Promise<string>;
    updateSessionTitle: (id: string, title: string) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
    setCurrentSession: (session: SessionDetail | null) => void;
    sendMessage: (content: string, sessionId?: string) => Promise<Message>;
    addAssistantMessage: (sessionId: string, content: string) => void;
    clearCurrentSession: () => void;
}, "error" | "sessions" | "currentSession" | "loading">, Pick<{
    sessions: import("vue").Ref<{
        id: string;
        title: string;
        branchPointId?: string | null | undefined;
        parentBranchId?: string | null | undefined;
        ancestorIds: string[];
        createdAt: string;
        updatedAt: string;
        firstMessage?: string | null | undefined;
        lastMessage?: string | null | undefined;
    }[], SessionListItem[] | {
        id: string;
        title: string;
        branchPointId?: string | null | undefined;
        parentBranchId?: string | null | undefined;
        ancestorIds: string[];
        createdAt: string;
        updatedAt: string;
        firstMessage?: string | null | undefined;
        lastMessage?: string | null | undefined;
    }[]>;
    currentSession: import("vue").Ref<{
        session: {
            id: string;
            createdAt: string;
            title: string;
            branchPointId?: string | null | undefined;
            parentBranchId?: string | null | undefined;
            ancestorIds: string[];
            updatedAt: string;
        };
        messages: {
            id: string;
            sessionId: string;
            role: import("../../shared/types.js").MessageRole;
            content: string;
            status: import("../../shared/types.js").MessageStatus;
            metadata?: Record<string, unknown> | undefined;
            createdAt: string;
        }[];
    } | null, SessionDetail | {
        session: {
            id: string;
            createdAt: string;
            title: string;
            branchPointId?: string | null | undefined;
            parentBranchId?: string | null | undefined;
            ancestorIds: string[];
            updatedAt: string;
        };
        messages: {
            id: string;
            sessionId: string;
            role: import("../../shared/types.js").MessageRole;
            content: string;
            status: import("../../shared/types.js").MessageStatus;
            metadata?: Record<string, unknown> | undefined;
            createdAt: string;
        }[];
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    hasMore: import("vue").ComputedRef<boolean>;
    fetchSessions: (page?: number, pageSize?: number) => Promise<void>;
    fetchSession: (id: string) => Promise<SessionDetail | null>;
    createSession: (title?: string, branchFrom?: string) => Promise<string>;
    updateSessionTitle: (id: string, title: string) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
    setCurrentSession: (session: SessionDetail | null) => void;
    sendMessage: (content: string, sessionId?: string) => Promise<Message>;
    addAssistantMessage: (sessionId: string, content: string) => void;
    clearCurrentSession: () => void;
}, "hasMore">, Pick<{
    sessions: import("vue").Ref<{
        id: string;
        title: string;
        branchPointId?: string | null | undefined;
        parentBranchId?: string | null | undefined;
        ancestorIds: string[];
        createdAt: string;
        updatedAt: string;
        firstMessage?: string | null | undefined;
        lastMessage?: string | null | undefined;
    }[], SessionListItem[] | {
        id: string;
        title: string;
        branchPointId?: string | null | undefined;
        parentBranchId?: string | null | undefined;
        ancestorIds: string[];
        createdAt: string;
        updatedAt: string;
        firstMessage?: string | null | undefined;
        lastMessage?: string | null | undefined;
    }[]>;
    currentSession: import("vue").Ref<{
        session: {
            id: string;
            createdAt: string;
            title: string;
            branchPointId?: string | null | undefined;
            parentBranchId?: string | null | undefined;
            ancestorIds: string[];
            updatedAt: string;
        };
        messages: {
            id: string;
            sessionId: string;
            role: import("../../shared/types.js").MessageRole;
            content: string;
            status: import("../../shared/types.js").MessageStatus;
            metadata?: Record<string, unknown> | undefined;
            createdAt: string;
        }[];
    } | null, SessionDetail | {
        session: {
            id: string;
            createdAt: string;
            title: string;
            branchPointId?: string | null | undefined;
            parentBranchId?: string | null | undefined;
            ancestorIds: string[];
            updatedAt: string;
        };
        messages: {
            id: string;
            sessionId: string;
            role: import("../../shared/types.js").MessageRole;
            content: string;
            status: import("../../shared/types.js").MessageStatus;
            metadata?: Record<string, unknown> | undefined;
            createdAt: string;
        }[];
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    hasMore: import("vue").ComputedRef<boolean>;
    fetchSessions: (page?: number, pageSize?: number) => Promise<void>;
    fetchSession: (id: string) => Promise<SessionDetail | null>;
    createSession: (title?: string, branchFrom?: string) => Promise<string>;
    updateSessionTitle: (id: string, title: string) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
    setCurrentSession: (session: SessionDetail | null) => void;
    sendMessage: (content: string, sessionId?: string) => Promise<Message>;
    addAssistantMessage: (sessionId: string, content: string) => void;
    clearCurrentSession: () => void;
}, "fetchSessions" | "fetchSession" | "createSession" | "updateSessionTitle" | "deleteSession" | "setCurrentSession" | "sendMessage" | "addAssistantMessage" | "clearCurrentSession">>;
