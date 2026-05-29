import type { UserDTO, AuthResponse } from '../../shared/types.js';
export declare const useAuthStore: import("pinia").StoreDefinition<"auth", Pick<{
    token: import("vue").Ref<string, string>;
    user: import("vue").Ref<{
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
    } | null, UserDTO | {
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
    } | null>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    login: (username: string, password: string) => Promise<AuthResponse>;
    register: (username: string, displayName: string, password: string) => Promise<AuthResponse>;
    fetchMe: () => Promise<UserDTO | null>;
    logout: () => void;
}, "user" | "token">, Pick<{
    token: import("vue").Ref<string, string>;
    user: import("vue").Ref<{
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
    } | null, UserDTO | {
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
    } | null>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    login: (username: string, password: string) => Promise<AuthResponse>;
    register: (username: string, displayName: string, password: string) => Promise<AuthResponse>;
    fetchMe: () => Promise<UserDTO | null>;
    logout: () => void;
}, "isAuthenticated">, Pick<{
    token: import("vue").Ref<string, string>;
    user: import("vue").Ref<{
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
    } | null, UserDTO | {
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
    } | null>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    login: (username: string, password: string) => Promise<AuthResponse>;
    register: (username: string, displayName: string, password: string) => Promise<AuthResponse>;
    fetchMe: () => Promise<UserDTO | null>;
    logout: () => void;
}, "login" | "register" | "fetchMe" | "logout">>;
