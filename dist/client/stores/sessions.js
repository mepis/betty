import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
export const useSessionsStore = defineStore('sessions', () => {
    // State
    const sessions = ref([]);
    const currentSession = ref(null);
    const loading = ref(false);
    const error = ref(null);
    // Getters
    const hasMore = computed(() => false);
    // Actions
    async function fetchSessions(page = 1, pageSize = 25) {
        loading.value = true;
        error.value = null;
        try {
            const res = await fetch(`/api/sessions?page=${page}&pageSize=${pageSize}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('betty_token') || ''}` },
            });
            if (!res.ok)
                throw new Error('Failed to load sessions');
            const data = await res.json();
            if (page === 1) {
                sessions.value = data.items;
            }
            else {
                sessions.value.push(...data.items);
            }
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error';
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchSession(id) {
        loading.value = true;
        error.value = null;
        try {
            const res = await fetch(`/api/sessions/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('betty_token') || ''}` },
            });
            if (!res.ok)
                throw new Error('Failed to load session');
            const data = await res.json();
            currentSession.value = data;
            return data;
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error';
            return null;
        }
        finally {
            loading.value = false;
        }
    }
    async function createSession(title, branchFrom) {
        const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('betty_token') || ''}`,
            },
            body: JSON.stringify({ title, branchFrom }),
        });
        if (!res.ok)
            throw new Error('Failed to create session');
        const data = await res.json();
        return data.id;
    }
    async function updateSessionTitle(id, title) {
        const res = await fetch(`/api/sessions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('betty_token') || ''}`,
            },
            body: JSON.stringify({ title }),
        });
        if (!res.ok)
            throw new Error('Failed to update session');
    }
    async function deleteSession(id) {
        const res = await fetch(`/api/sessions/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('betty_token') || ''}` },
        });
        if (!res.ok)
            throw new Error('Failed to delete session');
        // Remove from local state
        sessions.value = sessions.value.filter((s) => s.id !== id);
        if (currentSession.value?.session.id === id) {
            currentSession.value = null;
        }
    }
    function setCurrentSession(session) {
        currentSession.value = session;
    }
    async function sendMessage(content, sessionId) {
        if (!sessionId && !currentSession.value)
            throw new Error('No active session');
        const targetId = sessionId || currentSession.value.session.id;
        // Create user message locally first (optimistic)
        const userMsg = {
            id: `local_${Date.now()}`,
            sessionId: targetId,
            role: 'user',
            content,
            status: 'sent',
            createdAt: new Date().toISOString(),
        };
        // Add to current session if viewing it
        if (currentSession.value && currentSession.value.session.id === targetId) {
            currentSession.value.messages.push(userMsg);
        }
        return userMsg;
    }
    function addAssistantMessage(sessionId, content) {
        if (!currentSession.value || currentSession.value.session.id !== sessionId)
            return;
        // Append or update the last assistant message
        const msgs = currentSession.value.messages;
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content += content;
        }
        else {
            msgs.push({
                id: `local_assistant_${Date.now()}`,
                sessionId,
                role: 'assistant',
                content,
                status: 'sent',
                createdAt: new Date().toISOString(),
            });
        }
    }
    function clearCurrentSession() {
        currentSession.value = null;
    }
    return {
        sessions, currentSession, loading, error, hasMore,
        fetchSessions, fetchSession, createSession, updateSessionTitle, deleteSession,
        setCurrentSession, sendMessage, addAssistantMessage, clearCurrentSession,
    };
});
//# sourceMappingURL=sessions.js.map