from fastapi.testclient import TestClient
from app.main import app
import pytest

client = TestClient(app)


def test_create_session_api():
    response = client.post(
        "/api/sessions", json={"topic": "API Test", "context_details": "Details"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] is not None
    assert data["status"] == "in_progress"
    assert len(data["messages"]) == 1
    assert data["messages"][0]["agent_id"] == "01"


def test_get_session_api():
    # Create first
    create_response = client.post("/api/sessions", json={"topic": "Get Test"})
    session_id = create_response.json()["session_id"]

    # Get
    response = client.get(f"/api/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session_id


def test_next_turn_api():
    # Create first
    create_response = client.post("/api/sessions", json={"topic": "Turn Test"})
    session_id = create_response.json()["session_id"]

    # Next turn
    response = client.post(f"/api/sessions/{session_id}/next-turn")
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 2
    assert data["messages"][1]["agent_id"] == "02"
