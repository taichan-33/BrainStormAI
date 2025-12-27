from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.agent_relationship import DbAgentRelationship


class PromptBuilder:
    def build_system_prompt(
        self,
        agent_def: Dict[str, Any],
        agent_order: List[str],
        current_agent_id: str,
        all_agents: List[Dict[str, Any]] = None,
        db: Session = None,
    ) -> str:
        """エージェント用のシステムプロンプトを生成"""
        # エージェント名と役割のリストを作成
        if all_agents:
            order_names = []
            for agent_id in agent_order:
                # Find agent by ID
                agent = next((a for a in all_agents if a.get("id") == agent_id), None)
                if agent:
                    order_names.append(f"{agent['name']}({agent['role']})")
            order_str = " → ".join(order_names)
        else:
            order_str = " → ".join(agent_order)

        # 司会かどうかで異なる指示
        is_facilitator = current_agent_id == "01"

        role_instruction = """
【重要なルール】
- 自分の役割と性格に徹してください
"""

        if is_facilitator:
            role_instruction += """
【司会進行の役割】
- 議論の進行管理を行ってください
- 議論が停滞した場合は新しい視点を提示してください
- 参加者全員にバランスよく発言を促してください
- 議論のまとめや、次のステップへの誘導を行ってください
"""
        else:
            role_instruction += """
【議論スタイル - 重要】
- 他の参加者の意見に対して、遠慮なく反論・批判してください
- 「それは違う」「○○の意見には反対だ」「その考えは甘い」「現実的ではない」などの表現を積極的に使ってください
- 議論が白熱することは大歓迎です。馴れ合いや同調は避けてください
- 具体的な理由を添えて、なぜ反対なのかを明確に述べてください
"""

        relationship_instructions = ""
        # エージェント間の関係性を反映
        if db and all_agents:
            relationships = (
                db.query(DbAgentRelationship)
                .filter(
                    (DbAgentRelationship.agent_id_1 == current_agent_id)
                    | (DbAgentRelationship.agent_id_2 == current_agent_id)
                )
                .all()
            )

            for rel in relationships:
                other_id = (
                    rel.agent_id_2
                    if rel.agent_id_1 == current_agent_id
                    else rel.agent_id_1
                )
                other_agent = next(
                    (a for a in all_agents if a.get("id") == other_id), None
                )
                if other_agent:
                    other_name = other_agent.get("name", f"Agent_{other_id}")
                    if rel.relationship_type == "rival":
                        relationship_instructions += f"\n【特別指示】{other_name}の意見には特に批判的に対応し、積極的に反論してください。（対立関係：強度{rel.intensity}/10）"
                    elif rel.relationship_type == "ally":
                        relationship_instructions += f"\n【特別指示】{other_name}の意見を支持し、補強・発展させてください。（協力関係：強度{rel.intensity}/10）"

        # Handle potential missing keys with defaults
        personality = agent_def.get("personality_key") or agent_def.get(
            "personality", "不明"
        )

        prompt = f"""あなたは{agent_def['name']}です。
【役割】: {agent_def['role']}
【性格】: {personality}
【あなたの責任】: {agent_def['responsibility']}

【議論の発言順序】: {order_str}
（この順序で自動的にローテーションします）

{role_instruction}
{relationship_instructions}
【議論の目的】
ユーザーのトピックに対して、あなたの専門的視点から建設的だが遠慮のない意見を述べてください。
他の参加者と意見が対立しても、自分の立場を明確に主張してください。
発言は日本語で、簡潔かつ具体的に行ってください。
次の発言者を指名したり、「次は〇〇さんお願いします」と言う必要はありません（自動的に進行します）。"""

        return prompt
