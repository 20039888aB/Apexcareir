import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  createAIConversationSession,
  getAIConversationHistory,
  listAIConversationSessions,
  sendAIChatMessage,
  type AIConversationMessage,
  type AIConversationSessionSummary,
} from '../services';

const SESSION_STORAGE_KEY = 'apexcareir_ai_session_id';
const SYNC_STORAGE_KEY = 'apexcareir_ai_sync_tick';

export type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

const defaultGreeting: ChatMessage = {
  role: 'assistant',
  text:
    "Welcome to ApexcareIR AI.\n\nI can explain Interventional Radiology procedures, symptom possibilities, preparation, recovery, medications, and devices with safety-focused guidance.\n\nWould you like a patient-friendly explanation, a detailed medical explanation, or an Interventional Radiologist's perspective?",
};

function fromBackendMessages(messages: AIConversationMessage[]): ChatMessage[] {
  if (!messages.length) return [defaultGreeting];
  return messages.map((message) => ({ role: message.role, text: message.text }));
}

export function useAIAssistantChat() {
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(SESSION_STORAGE_KEY));
  const [messages, setMessages] = useState<ChatMessage[]>([defaultGreeting]);
  const [input, setInput] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(Boolean(localStorage.getItem(SESSION_STORAGE_KEY)));
  const [recentSessions, setRecentSessions] = useState<AIConversationSessionSummary[]>([]);

  const syncTick = useMemo(() => Date.now().toString(), []);

  const loadHistory = useCallback(
    async (targetSessionId: string) => {
      setIsHistoryLoading(true);
      try {
        const history = await getAIConversationHistory(targetSessionId);
        setMessages(fromBackendMessages(history.messages));
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [],
  );

  const loadRecentSessions = useCallback(async () => {
    const sessions = await listAIConversationSessions(12);
    setRecentSessions(sessions);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    loadHistory(sessionId);
    loadRecentSessions();
  }, [loadHistory, loadRecentSessions, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      loadRecentSessions();
    }
  }, [loadRecentSessions, sessionId]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SESSION_STORAGE_KEY && event.newValue && event.newValue !== sessionId) {
        setSessionId(event.newValue);
      }
      if (event.key === SYNC_STORAGE_KEY && sessionId) {
        loadHistory(sessionId);
        loadRecentSessions();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadHistory, loadRecentSessions, sessionId]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => sendAIChatMessage(message, sessionId || undefined),
    onSuccess: (payload) => {
      if (!sessionId || payload.session_id !== sessionId) {
        localStorage.setItem(SESSION_STORAGE_KEY, payload.session_id);
        setSessionId(payload.session_id);
      }
      setMessages((current) => [
        ...(current.length === 1 && current[0].text === defaultGreeting.text ? [] : current),
        { role: 'user', text: payload.user_message.text },
        { role: 'assistant', text: payload.assistant_message.text },
      ]);
      localStorage.setItem(SYNC_STORAGE_KEY, `${syncTick}-${Date.now()}`);
      loadRecentSessions();
    },
    onError: (_, userText) => {
      setMessages((current) => [
        ...current,
        { role: 'user', text: userText },
        { role: 'assistant', text: 'I could not reach the AI server right now. Please try again in a moment.' },
      ]);
    },
  });

  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim() || chatMutation.isPending) return;
      chatMutation.mutate(message.trim());
    },
    [chatMutation],
  );

  const clearChat = useCallback(async () => {
    const created = await createAIConversationSession();
    localStorage.setItem(SESSION_STORAGE_KEY, created.session_id);
    localStorage.setItem(SYNC_STORAGE_KEY, `${syncTick}-${Date.now()}`);
    setSessionId(created.session_id);
    setMessages([defaultGreeting]);
    setInput('');
    loadRecentSessions();
  }, [loadRecentSessions, syncTick]);

  const selectSession = useCallback(
    async (targetSessionId: string) => {
      if (!targetSessionId) return;
      localStorage.setItem(SESSION_STORAGE_KEY, targetSessionId);
      localStorage.setItem(SYNC_STORAGE_KEY, `${syncTick}-${Date.now()}`);
      setSessionId(targetSessionId);
      await loadHistory(targetSessionId);
      await loadRecentSessions();
    },
    [loadHistory, loadRecentSessions, syncTick],
  );

  return {
    input,
    setInput,
    messages,
    sendMessage,
    clearChat,
    selectSession,
    isPending: chatMutation.isPending,
    isHistoryLoading,
    sessionId,
    recentSessions,
  };
}
