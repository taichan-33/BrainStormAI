from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime
import uuid
from app.db.database import Base


class DbCustomAgent(Base):
    __tablename__ = "custom_agents"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    responsibility = Column(Text, nullable=True)
    personality = Column(Text, nullable=True)
    model = Column(String, default="gpt-5.2")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
