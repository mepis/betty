/**
 * Shared TypeScript types for Betty (frontend ↔ backend).
 */
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'pending' | 'sent' | 'error';
/** A registered user */
export interface User {
    id: string;
    username: string;
    displayName: string;
    passwordHash: string;
    createdAt: string;
}
/** A chat session (thread) with branching support */
export interface Session {
    id: string;
    userId: string;
    title: string;
    branchPointId?: string | null;
    parentBranchId?: string | null;
    ancestorIds: string[];
    createdAt: string;
    updatedAt: string;
}
/** A single message within a session */
export interface Message {
    id: string;
    sessionId: string;
    role: MessageRole;
    content: string;
    status: MessageStatus;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
/** JWT authentication response */
export interface AuthResponse {
    user: Omit<User, 'passwordHash'>;
    token: string;
}
/** Request body for creating a new session */
export interface NewSessionRequest {
    title?: string;
    branchFrom?: string;
}
/** Request body for registration */
export interface RegisterRequest {
    username: string;
    displayName: string;
    password: string;
}
/** Request body for login */
export interface LoginRequest {
    username: string;
    password: string;
}
/** Paginated list response */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
/** Shape of each SSE message for /api/sse/:sessionId */
export interface SSEMessage {
    type: 'message_start' | 'content_delta' | 'token_count' | 'tool_call' | 'tool_result' | 'message_end' | 'error' | 'done';
    sessionId?: string;
    messageId?: string;
    role?: MessageRole;
    content?: string;
    index?: number;
    metadata?: Record<string, unknown>;
    error?: string;
}
/** User shape without sensitive data */
export type UserDTO = Omit<User, 'passwordHash'>;
/** Session with first- and last-message previews */
export interface SessionListItem {
    id: string;
    title: string;
    branchPointId?: string | null;
    parentBranchId?: string | null;
    ancestorIds: string[];
    createdAt: string;
    updatedAt: string;
    firstMessage?: string | null;
    lastMessage?: string | null;
}
/** Full session with all messages */
export interface SessionDetail {
    session: Omit<Session, 'userId'>;
    messages: Message[];
}
