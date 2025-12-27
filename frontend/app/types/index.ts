import { CustomAgent } from '../constants/agents';

export type { CustomAgent };

export interface ChatMessage {
  id: string;
  session_id: string;
  agent_id: string;
  content: string;
  timestamp: string;
  step: number;
}

export interface SessionStatus {
  session_id: string;
  status: string;
  messages: ChatMessage[];
  next_turn_agent_id: string | null;
  is_finished: boolean;
  summary?: string;
  custom_agents?: CustomAgent[];
}

export interface CreateSessionParams {
  topic: string;
  context_details: string;
  custom_agents?: CustomAgent[];
  enabled_agent_ids: string[];
}
