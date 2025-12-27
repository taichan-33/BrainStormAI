from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid

from app.db.database import get_db
from app.models.agent_relationship import DbAgentRelationship

router = APIRouter(prefix="/api/relationships", tags=["relationships"])


# Schemas
class RelationshipCreate(BaseModel):
    agent_id_1: str
    agent_id_2: str
    relationship_type: str  # "rival" | "ally"
    intensity: int = 5


class RelationshipUpdate(BaseModel):
    relationship_type: Optional[str] = None
    intensity: Optional[int] = None


class RelationshipResponse(BaseModel):
    id: str
    agent_id_1: str
    agent_id_2: str
    relationship_type: str
    intensity: int

    class Config:
        from_attributes = True


@router.get("", response_model=List[RelationshipResponse])
def list_relationships(db: Session = Depends(get_db)):
    """全エージェント関係性を取得"""
    relationships = db.query(DbAgentRelationship).all()
    return relationships


@router.post("", response_model=RelationshipResponse)
def create_relationship(rel_input: RelationshipCreate, db: Session = Depends(get_db)):
    """新しいエージェント関係性を作成"""
    # 既存の関係性をチェック
    existing = (
        db.query(DbAgentRelationship)
        .filter(
            DbAgentRelationship.agent_id_1 == rel_input.agent_id_1,
            DbAgentRelationship.agent_id_2 == rel_input.agent_id_2,
        )
        .first()
    )

    if existing:
        raise HTTPException(status_code=400, detail="Relationship already exists")

    new_rel = DbAgentRelationship(
        id=str(uuid.uuid4()),
        agent_id_1=rel_input.agent_id_1,
        agent_id_2=rel_input.agent_id_2,
        relationship_type=rel_input.relationship_type,
        intensity=rel_input.intensity,
    )
    db.add(new_rel)
    db.commit()
    db.refresh(new_rel)
    return new_rel


@router.put("/{rel_id}", response_model=RelationshipResponse)
def update_relationship(
    rel_id: str, rel_input: RelationshipUpdate, db: Session = Depends(get_db)
):
    """エージェント関係性を更新"""
    rel = db.query(DbAgentRelationship).filter(DbAgentRelationship.id == rel_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    if rel_input.relationship_type is not None:
        rel.relationship_type = rel_input.relationship_type
    if rel_input.intensity is not None:
        rel.intensity = rel_input.intensity

    db.commit()
    db.refresh(rel)
    return rel


@router.delete("/{rel_id}")
def delete_relationship(rel_id: str, db: Session = Depends(get_db)):
    """エージェント関係性を削除"""
    rel = db.query(DbAgentRelationship).filter(DbAgentRelationship.id == rel_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    db.delete(rel)
    db.commit()
    return {"message": "Relationship deleted successfully", "id": rel_id}


@router.get(
    "/between/{agent_id_1}/{agent_id_2}", response_model=Optional[RelationshipResponse]
)
def get_relationship_between(
    agent_id_1: str, agent_id_2: str, db: Session = Depends(get_db)
):
    """2つのエージェント間の関係性を取得"""
    rel = (
        db.query(DbAgentRelationship)
        .filter(
            (
                (DbAgentRelationship.agent_id_1 == agent_id_1)
                & (DbAgentRelationship.agent_id_2 == agent_id_2)
            )
            | (
                (DbAgentRelationship.agent_id_1 == agent_id_2)
                & (DbAgentRelationship.agent_id_2 == agent_id_1)
            )
        )
        .first()
    )
    return rel
