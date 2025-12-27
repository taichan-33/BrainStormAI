import pytest
from unittest.mock import MagicMock
from app.services.prompt_builder import PromptBuilder


def test_build_system_prompt_basic():
    builder = PromptBuilder()
    agent_def = {
        "name": "Test Agent",
        "role": "Tester",
        "responsibility": "Testing",
        "personality": "Strict",
    }
    agent_order = ["01", "02"]
    current_agent_id = "02"
    all_agents = [
        {"id": "01", "name": "Facilitator", "role": "Host"},
        {"id": "02", "name": "Test Agent", "role": "Tester"},
    ]

    prompt = builder.build_system_prompt(
        agent_def=agent_def,
        agent_order=agent_order,
        current_agent_id=current_agent_id,
        all_agents=all_agents,
    )

    assert "あなたはTest Agentです。" in prompt
    assert "【役割】: Tester" in prompt
    assert "Facilitator(Host) → Test Agent(Tester)" in prompt
    # Facilitator-specific instructions should NOT be present
    assert "【司会進行の役割】" not in prompt


def test_build_system_prompt_facilitator():
    builder = PromptBuilder()
    agent_def = {
        "name": "Facilitator",
        "role": "Host",
        "responsibility": "",
        "personality": "",
    }

    prompt = builder.build_system_prompt(
        agent_def=agent_def, agent_order=["01"], current_agent_id="01"
    )

    assert "【司会進行の役割】" in prompt


def test_build_system_prompt_relationships():
    builder = PromptBuilder()
    agent_def = {
        "name": "Test Agent",
        "role": "Tester",
        "responsibility": "",
        "personality": "",
    }
    all_agents = [
        {"id": "01", "name": "Rival Agent", "role": "Rival"},
        {"id": "02", "name": "Test Agent", "role": "Tester"},
    ]

    # Mock DB interaction
    mock_db = MagicMock()
    # Mock Relationship model
    mock_rel = MagicMock()
    mock_rel.agent_id_1 = "02"  # Current agent
    mock_rel.agent_id_2 = "01"  # The other agent
    mock_rel.relationship_type = "rival"
    mock_rel.intensity = 8

    # Setup query return
    mock_query = mock_db.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_filter.all.return_value = [mock_rel]

    prompt = builder.build_system_prompt(
        agent_def=agent_def,
        agent_order=["01", "02"],
        current_agent_id="02",
        all_agents=all_agents,
        db=mock_db,
    )

    assert "【特別指示】Rival Agentの意見には特に批判的に対応し" in prompt
    assert "強度8/10" in prompt
