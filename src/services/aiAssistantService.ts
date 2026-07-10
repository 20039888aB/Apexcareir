import { httpClient } from '../api';

export type AIChatResponse = {
  reply: string;
  confidence: 'High Confidence' | 'Moderate Confidence' | 'Low Confidence' | string;
  evidence: 'Strong evidence' | 'Moderate evidence' | 'Limited evidence' | 'Emerging evidence' | string;
  category: string;
  session_id: string;
  user_message: AIConversationMessage;
  assistant_message: AIConversationMessage;
};

export type AIConversationMessage = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
  confidence?: string;
  evidence?: string;
  category?: string;
};

export type AIKnowledgeStats = {
  frequently_asked_questions: number;
  procedures_and_interventions: number;
  conditions: number;
  symptom_mappings: number;
  preparation_recovery_guides: number;
  medications: number;
  devices_and_consumables: number;
  patient_education_articles: number;
};

export type AIConversationHistoryResponse = {
  session_id: string;
  messages: AIConversationMessage[];
};

export type AIConversationSessionSummary = {
  session_id: string;
  title: string;
  last_message_preview: string;
  message_count: number;
  updated_at: string;
};

export async function sendAIChatMessage(message: string, sessionId?: string) {
  const response = await httpClient.post<AIChatResponse>('/ai-assistant/chat/', {
    message,
    session_id: sessionId || undefined,
  });
  return response.data;
}

export async function getAIKnowledgeStats() {
  const response = await httpClient.get<AIKnowledgeStats>('/ai-assistant/stats/');
  return response.data;
}

export async function createAIConversationSession() {
  const response = await httpClient.post<AIConversationHistoryResponse>('/ai-assistant/sessions/');
  return response.data;
}

export async function listAIConversationSessions(limit = 12) {
  const response = await httpClient.get<AIConversationSessionSummary[]>('/ai-assistant/sessions/', {
    params: { limit },
  });
  return response.data;
}

export async function getAIConversationHistory(sessionId: string) {
  const response = await httpClient.get<AIConversationHistoryResponse>(`/ai-assistant/sessions/${sessionId}/messages/`);
  return response.data;
}
