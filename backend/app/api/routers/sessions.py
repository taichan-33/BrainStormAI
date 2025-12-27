from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session
from app.schemas.session import SessionStatus, TopicInput, SessionListItem
from app.services.orchestrator import Orchestrator
from app.db.database import get_db

router = APIRouter(prefix="/api/sessions", tags=["sessions"])
orchestrator = Orchestrator()


@router.get("", response_model=List[SessionListItem])
def list_sessions(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return orchestrator.list_sessions(db, limit, skip)


@router.post("", response_model=SessionStatus)
def create_session(topic_input: TopicInput, db: Session = Depends(get_db)):
    return orchestrator.create_session(db, topic_input)


@router.get("/{session_id}", response_model=SessionStatus)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = orchestrator.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{session_id}/next-turn", response_model=SessionStatus)
def next_turn(session_id: str, db: Session = Depends(get_db)):
    try:
        session = orchestrator.next_turn(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.post("/{session_id}/summary", response_model=SessionStatus)
def summarize_session(session_id: str, db: Session = Depends(get_db)):
    session = orchestrator.summarize_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
