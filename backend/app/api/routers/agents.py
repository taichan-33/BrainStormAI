from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session
import uuid
from app.schemas.session import (
    CustomAgentCreate,
    CustomAgentUpdate,
    CustomAgentResponse,
)
from app.models.custom_agent import DbCustomAgent
from app.db.database import get_db

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("", response_model=List[CustomAgentResponse])
def list_custom_agents(db: Session = Depends(get_db)):
    """全カスタムエージェントを取得"""
    agents = db.query(DbCustomAgent).order_by(DbCustomAgent.created_at.desc()).all()
    return agents


@router.post("", response_model=CustomAgentResponse)
def create_custom_agent(agent_input: CustomAgentCreate, db: Session = Depends(get_db)):
    """新しいカスタムエージェントを作成"""
    new_agent = DbCustomAgent(
        id=str(uuid.uuid4()),
        name=agent_input.name,
        role=agent_input.role,
        responsibility=agent_input.responsibility,
        personality=agent_input.personality,
        model=agent_input.model,
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent


@router.get("/{agent_id}", response_model=CustomAgentResponse)
def get_custom_agent(agent_id: str, db: Session = Depends(get_db)):
    """特定のカスタムエージェントを取得"""
    agent = db.query(DbCustomAgent).filter(DbCustomAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/{agent_id}", response_model=CustomAgentResponse)
def update_custom_agent(
    agent_id: str, agent_input: CustomAgentUpdate, db: Session = Depends(get_db)
):
    """カスタムエージェントを更新"""
    agent = db.query(DbCustomAgent).filter(DbCustomAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # 指定されたフィールドのみ更新
    update_data = agent_input.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(agent, field, value)

    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/{agent_id}")
def delete_custom_agent(agent_id: str, db: Session = Depends(get_db)):
    """カスタムエージェントを削除"""
    agent = db.query(DbCustomAgent).filter(DbCustomAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted successfully", "id": agent_id}
