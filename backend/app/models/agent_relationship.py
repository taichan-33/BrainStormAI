from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
from app.db.database import Base


class DbAgentRelationship(Base):
    """エージェント間の関係性を定義するモデル"""

    __tablename__ = "agent_relationships"

    id = Column(String, primary_key=True)
    agent_id_1 = Column(String, nullable=False)  # 主エージェントID
    agent_id_2 = Column(String, nullable=False)  # 相手エージェントID
    relationship_type = Column(String, nullable=False)  # "rival" | "ally"
    intensity = Column(Integer, default=5)  # 強度 1-10
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
