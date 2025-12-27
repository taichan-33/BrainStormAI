import { CreateSessionParams, SessionStatus } from '../types';

const API_BASE = '/api/sessions';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

export const sessionService = {
  create: async (params: CreateSessionParams): Promise<SessionStatus> => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<SessionStatus>(res);
  },

  nextTurn: async (sessionId: string): Promise<SessionStatus> => {
    const res = await fetch(`${API_BASE}/${sessionId}/next-turn`, {
      method: 'POST',
    });
    return handleResponse<SessionStatus>(res);
  },

  get: async (sessionId: string): Promise<SessionStatus> => {
    const res = await fetch(`${API_BASE}/${sessionId}`);
    return handleResponse<SessionStatus>(res);
  },

  generateSummary: async (sessionId: string): Promise<SessionStatus> => {
    const res = await fetch(`${API_BASE}/${sessionId}/summary`, {
      method: 'POST',
    });
    return handleResponse<SessionStatus>(res);
  }
};
