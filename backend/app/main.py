from fastapi import FastAPI
from app.api.routers import sessions, agents, export, relationships
from app.db.database import engine, Base
from app.models import session as models
from app.models import custom_agent as custom_agent_models
from app.models import agent_relationship as agent_relationship_models

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BrainStormAI Backend")

app.include_router(sessions.router)
app.include_router(agents.router)
app.include_router(export.router)
app.include_router(relationships.router)


@app.get("/")
def read_root():
    return {"message": "Hello from BrainStormAI"}
