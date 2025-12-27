import pytest
from unittest.mock import MagicMock, patch
from app.services.orchestrator import Orchestrator
from app.schemas.session import TopicInput
from app.models.session import DbSession, DbMessage


class TestAgentOrder:
    """エージェント順序に関するテスト"""

    def test_get_agent_order_default(self):
        """デフォルトの6エージェント順序を確認"""
        orchestrator = Orchestrator()
        mock_session = MagicMock(spec=DbSession)
        mock_session.custom_agents = None
        mock_session.enabled_agent_ids = None

        order = orchestrator._get_agent_order(mock_session)

        assert order == ["01", "02", "03", "04", "05", "06"]

    def test_get_agent_order_with_custom_agents(self):
        """カスタムエージェントを含む順序を確認"""
        orchestrator = Orchestrator()
        mock_session = MagicMock(spec=DbSession)
        mock_session.custom_agents = [
            {"name": "Designer", "role": "デザイナー", "model": "gpt-5.2"}
        ]
        mock_session.enabled_agent_ids = None

        order = orchestrator._get_agent_order(mock_session)

        assert order == ["01", "02", "03", "04", "05", "06", "C01"]

    def test_get_agent_order_with_enabled_filter(self):
        """enabled_agent_idsでフィルタリングされた順序を確認"""
        orchestrator = Orchestrator()
        mock_session = MagicMock(spec=DbSession)
        mock_session.custom_agents = None
        mock_session.enabled_agent_ids = ["01", "02", "05"]  # 司会、起業家、マーケター

        order = orchestrator._get_agent_order(mock_session)

        # 司会（01）は常に含まれ、順序は保持される
        assert order == ["01", "02", "05"]

    def test_get_agent_order_facilitator_always_included(self):
        """司会（01）が常に含まれることを確認"""
        orchestrator = Orchestrator()
        mock_session = MagicMock(spec=DbSession)
        mock_session.custom_agents = None
        mock_session.enabled_agent_ids = ["02", "03"]  # 司会なし

        order = orchestrator._get_agent_order(mock_session)

        # 司会が自動的に追加される
        assert "01" in order
        assert order[0] == "01"


class TestSystemPrompt:
    """システムプロンプトに関するテスト"""

    def test_system_prompt_includes_order_info(self):
        """システムプロンプトに順序情報が含まれることを確認"""
        orchestrator = Orchestrator()

        # build_system_promptメソッドをテスト
        agent_def = {
            "id": "02",
            "name": "Innovator",
            "role": "起業家",
            "responsibility": "新規アイデアの提案",
            "personality_key": "情熱的",
            "model": "gemini-3-pro-preview",
        }
        agent_order = ["01", "02", "03"]
        current_agent_id = "02"

        prompt = orchestrator._build_system_prompt(
            agent_def, agent_order, current_agent_id
        )

        # 発言順序が含まれる
        assert "発言順序" in prompt or "順番" in prompt

    def test_system_prompt_no_pass_instruction(self):
        """システムプロンプトに『パス不要』の指示が含まれることを確認"""
        orchestrator = Orchestrator()

        agent_def = {
            "id": "03",
            "name": "Critic",
            "role": "批評家",
            "responsibility": "リスク指摘",
            "personality_key": "慎重",
            "model": "gpt-5.2",
        }
        agent_order = ["01", "02", "03"]

        prompt = orchestrator._build_system_prompt(agent_def, agent_order, "03")

        # パス・指名不要の指示
        assert "指名" in prompt or "パス" in prompt or "自動的" in prompt


class TestTurnProgression:
    """ターン進行に関するテスト"""

    def test_next_speaker_rotation(self):
        """次の発言者がローテーションで決まることを確認"""
        orchestrator = Orchestrator()

        agent_order = ["01", "02", "03", "04"]

        # 01の次は02
        assert orchestrator._get_next_agent_id("01", agent_order) == "02"
        # 02の次は03
        assert orchestrator._get_next_agent_id("02", agent_order) == "03"
        # 04の次は01（ループ）
        assert orchestrator._get_next_agent_id("04", agent_order) == "01"

    def test_next_speaker_with_unknown_agent(self):
        """不明なエージェントの場合、01にフォールバック"""
        orchestrator = Orchestrator()

        agent_order = ["01", "02", "03"]

        # 存在しないエージェントの場合は01
        assert orchestrator._get_next_agent_id("99", agent_order) == "01"


class TestConversationHistory:
    """会話履歴フォーマットに関するテスト"""

    def test_history_format_includes_role(self):
        """会話履歴に役割名が含まれることを確認"""
        orchestrator = Orchestrator()

        messages = [
            MagicMock(agent_id="01", content="議論を開始します"),
            MagicMock(agent_id="02", content="新しいアイデアです"),
        ]
        all_agents = [
            {"id": "01", "name": "Facilitator", "role": "司会"},
            {"id": "02", "name": "Innovator", "role": "起業家"},
        ]

        history = orchestrator._format_conversation_history(messages, all_agents)

        # 各メッセージに発言者名と役割が含まれる
        assert "Facilitator" in history[0]["content"] or "司会" in history[0]["content"]
        assert "Innovator" in history[1]["content"] or "起業家" in history[1]["content"]
