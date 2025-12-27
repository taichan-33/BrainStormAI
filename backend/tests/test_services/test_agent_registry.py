import pytest
from app.services.agent_registry import AgentRegistry
from app.core.constants import AGENT_DEFINITIONS


class MockDbSession:
    def __init__(self, custom_agents=None, enabled_agent_ids=None):
        self.custom_agents = custom_agents or []
        self.enabled_agent_ids = enabled_agent_ids or []


def test_get_all_agents_defaults():
    registry = AgentRegistry()
    db_session = MockDbSession()

    agents = registry.get_all_agents(db_session)
    assert len(agents) == len(AGENT_DEFINITIONS)
    assert agents[0]["id"] == "01"


def test_get_all_agents_with_custom():
    registry = AgentRegistry()
    custom = [{"name": "Test", "role": "Tester", "model": "gpt-5.2"}]
    db_session = MockDbSession(custom_agents=custom)

    agents = registry.get_all_agents(db_session)
    assert len(agents) == len(AGENT_DEFINITIONS) + 1
    assert agents[-1]["name"] == "Test"
    # ID should be generated if not present
    assert agents[-1]["id"] == "C01"


def test_get_agent_order_defaults():
    registry = AgentRegistry()
    db_session = MockDbSession()

    order = registry.get_agent_order(db_session)
    expected = ["01", "02", "03", "04", "05", "06"]
    assert order == expected


def test_get_agent_order_with_filter():
    registry = AgentRegistry()
    db_session = MockDbSession(enabled_agent_ids=["02", "03"])

    order = registry.get_agent_order(db_session)
    # 01 (Facilitator) should always be included
    assert "01" in order
    assert "02" in order
    assert len(order) == 3  # 01, 02, 03


def test_get_next_agent_id():
    registry = AgentRegistry()
    order = ["01", "02", "03"]

    assert registry.get_next_agent_id("01", order) == "02"
    assert registry.get_next_agent_id("03", order) == "01"
    # Unknown agent falls back to 01
    assert registry.get_next_agent_id("99", order) == "01"
