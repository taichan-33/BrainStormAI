from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class CustomAgentInput(BaseModel):
    id: Optional[str] = None  # 永続化エージェントの場合はIDを含む
    name: str
    role: str
    responsibility: Optional[str] = ""
    personality: Optional[str] = ""
    model: str = "gpt-5.2"  # "gpt-5.2" or "gemini-3-pro-preview"


class TopicInput(BaseModel):
    topic: str
    context_details: Optional[str] = None
    custom_agents: Optional[List[CustomAgentInput]] = None
    enabled_agent_ids: Optional[List[str]] = None  # 参加するエージェントIDリスト


class AgentProfile(BaseModel):
    id: str
    name: str
    role: str
    model_provider: str  # "openai" or "google"


class ChatMessage(BaseModel):
    id: str
    session_id: str
    agent_id: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    step: int


class SessionStatus(BaseModel):
    session_id: str
    status: str
    messages: List[ChatMessage]
    next_turn_agent_id: Optional[str] = None
    is_finished: bool = False
    summary: Optional[str] = None
    custom_agents: Optional[List[dict]] = (
        None  # セッションに参加したカスタムエージェント情報
    )


class SessionListItem(BaseModel):
    session_id: str
    topic: Optional[str] = None
    created_at: datetime
    status: str


# カスタムエージェント永続化用スキーマ
class CustomAgentCreate(BaseModel):
    name: str
    role: str
    responsibility: Optional[str] = ""
    personality: Optional[str] = ""
    model: str = "gpt-5.2"


class CustomAgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    responsibility: Optional[str] = None
    personality: Optional[str] = None
    model: Optional[str] = None


class CustomAgentResponse(BaseModel):
    id: str
    name: str
    role: str
    responsibility: Optional[str] = None
    personality: Optional[str] = None
    model: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
