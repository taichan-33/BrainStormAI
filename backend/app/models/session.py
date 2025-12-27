from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    ForeignKey,
    Text,
    DateTime,
    JSON,
)
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.database import Base


class DbSession(Base):
    __tablename__ = "sessions"

    session_id = Column(String, primary_key=True, index=True)
    topic = Column(String, nullable=True)
    status = Column(String, default="in_progress")
    next_turn_agent_id = Column(String, nullable=True)
    is_finished = Column(Boolean, default=False)
    summary = Column(Text, nullable=True)
    custom_agents = Column(JSON, nullable=True)  # カスタムエージェント定義を保存
    enabled_agent_ids = Column(JSON, nullable=True)  # 参加するエージェントIDリスト
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship(
        "DbMessage", back_populates="session", cascade="all, delete-orphan"
    )


class DbMessage(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.session_id"))
    agent_id = Column(String)
    content = Column(Text)
    step = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DbSession", back_populates="messages")
