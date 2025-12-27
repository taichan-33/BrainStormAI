from typing import List, Dict, Any
from app.core.constants import AGENT_DEFINITIONS


class AgentRegistry:
    def get_all_agents(self, db_session: Any) -> List[Dict[str, Any]]:
        """デフォルトエージェントとカスタムエージェントを結合して返す"""
        agents = list(AGENT_DEFINITIONS)

        if db_session.custom_agents:
            for idx, custom in enumerate(db_session.custom_agents):
                # custom is expected to be a dict or object accessed via get
                # SQLAlchemy models accessed as attributes, but here we assume dict-like usage
                # or handle both if needed. The original code used .get() which implies dict.
                if hasattr(custom, "get"):
                    get = custom.get
                else:
                    get = lambda k, d=None: getattr(custom, k, d)

                # 永続化エージェントの場合はIDを保持、一時的な場合はC01形式
                agent_id = get("id", f"C{idx + 1:02d}")
                agents.append(
                    {
                        "id": agent_id,
                        "name": get("name", f"Custom Agent {idx + 1}"),
                        "role": get("role", "カスタム"),
                        "model": get("model", "gpt-5.2"),
                        "responsibility": get("responsibility", ""),
                        "personality_key": get("personality", ""),
                        "provider": (
                            "openai" if "gpt" in get("model", "gpt") else "google"
                        ),
                    }
                )

        return agents

    def get_agent_order(self, db_session: Any) -> List[str]:
        """エージェントの発言順序を返す（有効なエージェントのみ）"""
        all_order = ["01", "02", "03", "04", "05", "06"]

        if db_session.custom_agents:
            for idx, custom in enumerate(db_session.custom_agents):
                # Handle both dict and object access
                if hasattr(custom, "get"):
                    agent_id = custom.get("id")
                else:
                    agent_id = getattr(custom, "id", None)

                if not agent_id:
                    agent_id = f"C{idx + 1:02d}"

                all_order.append(agent_id)

        # enabled_agent_idsが指定されている場合、フィルタリング
        if db_session.enabled_agent_ids:
            # 司会（01）は常に含める
            enabled = list(db_session.enabled_agent_ids)
            if "01" not in enabled:
                enabled = ["01"] + enabled
            return [agent_id for agent_id in all_order if agent_id in enabled]

        return all_order

    def get_next_agent_id(self, current_agent_id: str, agent_order: List[str]) -> str:
        """次の発言者IDを取得（ローテーション）"""
        try:
            current_index = agent_order.index(current_agent_id)
            next_index = (current_index + 1) % len(agent_order)
            return agent_order[next_index]
        except ValueError:
            return "01"  # 不明な場合は司会にフォールバック
