import uuid
from datetime import datetime
from typing import List, Optional
from app.schemas.session import SessionStatus, ChatMessage, TopicInput, SessionListItem
from app.core.constants import AGENT_DEFINITIONS


from sqlalchemy.orm import Session
from app.models.session import DbSession, DbMessage


class Orchestrator:
    def _get_all_agents(self, db_session: DbSession) -> List[dict]:
        """デフォルトエージェントとカスタムエージェントを結合して返す"""
        agents = list(AGENT_DEFINITIONS)

        if db_session.custom_agents:
            for idx, custom in enumerate(db_session.custom_agents):
                # 永続化エージェントの場合はIDを保持、一時的な場合はC01形式
                agent_id = custom.get("id", f"C{idx + 1:02d}")
                agents.append(
                    {
                        "id": agent_id,
                        "name": custom.get("name", f"Custom Agent {idx + 1}"),
                        "role": custom.get("role", "カスタム"),
                        "model": custom.get("model", "gpt-5.2"),
                        "responsibility": custom.get("responsibility", ""),
                        "personality_key": custom.get("personality", ""),
                        "provider": (
                            "openai"
                            if "gpt" in custom.get("model", "gpt")
                            else "google"
                        ),
                    }
                )

        return agents

    def _get_agent_order(self, db_session: DbSession) -> List[str]:
        """エージェントの発言順序を返す（有効なエージェントのみ）"""
        all_order = ["01", "02", "03", "04", "05", "06"]

        if db_session.custom_agents:
            for idx, custom in enumerate(db_session.custom_agents):
                # 永続化エージェントの場合はIDを保持
                agent_id = custom.get("id", f"C{idx + 1:02d}")
                all_order.append(agent_id)

        # enabled_agent_idsが指定されている場合、フィルタリング
        if db_session.enabled_agent_ids:
            # 司会（01）は常に含める
            enabled = list(db_session.enabled_agent_ids)
            if "01" not in enabled:
                enabled = ["01"] + enabled
            return [agent_id for agent_id in all_order if agent_id in enabled]

        return all_order

    def _get_next_agent_id(self, current_agent_id: str, agent_order: List[str]) -> str:
        """次の発言者IDを取得（ローテーション）"""
        try:
            current_index = agent_order.index(current_agent_id)
            next_index = (current_index + 1) % len(agent_order)
            return agent_order[next_index]
        except ValueError:
            return "01"  # 不明な場合は司会にフォールバック

    def _build_system_prompt(
        self,
        agent_def: dict,
        agent_order: List[str],
        current_agent_id: str,
        all_agents: List[dict] = None,
    ) -> str:
        """エージェント用のシステムプロンプトを生成"""
        # エージェント名と役割のリストを作成
        if all_agents:
            order_names = []
            for agent_id in agent_order:
                agent = next((a for a in all_agents if a["id"] == agent_id), None)
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


【議論スタイル - 重要】
- 他の参加者の意見に対して、遠慮なく反論・批判してください
- 「それは違う」「○○の意見には反対だ」「その考えは甘い」「現実的ではない」などの表現を積極的に使ってください
- 議論が白熱することは大歓迎です。馴れ合いや同調は避けてください
- 具体的な理由を添えて、なぜ反対なのかを明確に述べてください
- 意見やアイデアに対する建設的な批判を心がけてください
- 自分の意見には自信を持ち、簡単には折れないでください
"""

        if is_facilitator:
            role_instruction += """
- あなたは司会として議論をまとめる権限があります
- 対立する意見があれば、それぞれの立場を整理してください
- 議論が白熱している場合は無理に止めず、建設的な方向に導いてください
"""
        else:
            role_instruction += """
- 議論のまとめや総括は行わないでください（それは司会の役割です）
- 発言者の意見に対して、まず賛成か反対かを明確にしてから自分の意見を述べてください
- 特に自分の専門領域に関する他者の発言には、厳しく評価してください
"""

        prompt = f"""あなたは「{agent_def['name']}」（{agent_def['role']}）です。

【あなたの性格】: {agent_def['personality_key']}
【あなたの責任】: {agent_def['responsibility']}

【議論の発言順序】: {order_str}
（この順序で自動的にローテーションします）

{role_instruction}
【議論の目的】
ユーザーのトピックに対して、あなたの専門的視点から建設的だが遠慮のない意見を述べてください。
他の参加者と意見が対立しても、自分の立場を明確に主張してください。
発言は日本語で、簡潔かつ具体的に行ってください。"""

        return prompt

    def _format_conversation_history(
        self, messages: List[DbMessage], all_agents: List[dict]
    ) -> List[dict]:
        """会話履歴を整形"""
        history = []
        for msg in messages:
            speaker = next((a for a in all_agents if a["id"] == msg.agent_id), None)
            if speaker:
                speaker_label = f"【{speaker['role']}】{speaker['name']}"
            else:
                speaker_label = f"【不明】Agent_{msg.agent_id}"

            history.append(
                {"role": "user", "content": f"{speaker_label}: {msg.content}"}
            )
        return history

    def create_session(self, db: Session, topic_input: TopicInput) -> SessionStatus:
        session_id = str(uuid.uuid4())

        # Facilitator starts
        facilitator = next(a for a in AGENT_DEFINITIONS if a["id"] == "01")

        # カスタムエージェントの紹介を追加
        custom_intro = ""
        if topic_input.custom_agents:
            custom_names = [
                f"「{a.name}（{a.role}）」" for a in topic_input.custom_agents
            ]
            custom_intro = (
                f" 本日は追加メンバーとして{', '.join(custom_names)}も参加しています。"
            )

        initial_content = f"ただいまより、トピック「{topic_input.topic}」についてのブレインストーミングを開始します。{topic_input.context_details or ''}{custom_intro} 皆さん、よろしくお願いします。"

        # カスタムエージェントをJSON形式で保存（IDを含む）
        custom_agents_data = None
        if topic_input.custom_agents:
            custom_agents_data = [
                {
                    "id": a.id,  # 永続化エージェントの場合はUUID、なければNone
                    "name": a.name,
                    "role": a.role,
                    "responsibility": a.responsibility,
                    "personality": a.personality,
                    "model": a.model,
                }
                for a in topic_input.custom_agents
            ]

        # Save to DB
        db_session = DbSession(
            session_id=session_id,
            topic=topic_input.topic,
            status="in_progress",
            custom_agents=custom_agents_data,
            enabled_agent_ids=topic_input.enabled_agent_ids,
        )
        db.add(db_session)
        db.commit()

        initial_msg = DbMessage(
            session_id=session_id,
            agent_id=facilitator["id"],
            content=initial_content,
            step=1,
        )
        db.add(initial_msg)
        db.commit()
        db.refresh(db_session)

        return self._map_to_schema(db_session)

    def list_sessions(
        self, db: Session, limit: int = 10, offset: int = 0
    ) -> List[SessionListItem]:
        sessions = (
            db.query(DbSession)
            .order_by(DbSession.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return [
            SessionListItem(
                session_id=s.session_id,
                topic=s.topic,
                created_at=s.created_at,
                status=s.status,
            )
            for s in sessions
        ]

    def next_turn(self, db: Session, session_id: str) -> Optional[SessionStatus]:
        db_session = (
            db.query(DbSession).filter(DbSession.session_id == session_id).first()
        )
        if not db_session:
            return None

        # Allow resumption: if finished, reset flags
        if db_session.is_finished:
            db_session.is_finished = False
            db_session.status = "in_progress"
            db.commit()

        # Get all agents including custom ones
        all_agents = self._get_all_agents(db_session)
        agent_order = self._get_agent_order(db_session)

        # Get last message to determine next speaker
        last_msg = (
            db.query(DbMessage)
            .filter(DbMessage.session_id == session_id)
            .order_by(DbMessage.step.desc())
            .first()
        )
        last_agent_id = last_msg.agent_id if last_msg else "01"
        current_step = (last_msg.step + 1) if last_msg else 1

        # 次の発言者を決定
        next_agent_id = self._get_next_agent_id(last_agent_id, agent_order)

        # Generate Response
        agent_def = next(
            (a for a in all_agents if a["id"] == next_agent_id),
            all_agents[0],
        )

        from app.services.llm_engine import LLMEngine

        llm_engine = LLMEngine()

        # 改善されたシステムプロンプトを生成
        system_prompt = self._build_system_prompt(
            agent_def, agent_order, next_agent_id, all_agents
        )

        # 会話履歴を整形
        all_messages = (
            db.query(DbMessage)
            .filter(DbMessage.session_id == session_id)
            .order_by(DbMessage.step.asc())
            .all()
        )
        history_messages = self._format_conversation_history(all_messages, all_agents)

        generated_content = llm_engine.generate_response(
            model_name=agent_def["model"],
            system_prompt=system_prompt,
            messages=history_messages,
        )

        new_msg = DbMessage(
            session_id=session_id,
            agent_id=agent_def["id"],
            content=generated_content,
            step=current_step,
        )
        db.add(new_msg)
        db_session.next_turn_agent_id = next_agent_id
        db.commit()
        db.refresh(db_session)

        return self._map_to_schema(db_session)

    def get_session(self, db: Session, session_id: str) -> Optional[SessionStatus]:
        db_session = (
            db.query(DbSession).filter(DbSession.session_id == session_id).first()
        )
        return self._map_to_schema(db_session) if db_session else None

    def summarize_session(
        self, db: Session, session_id: str
    ) -> Optional[SessionStatus]:
        db_session = (
            db.query(DbSession).filter(DbSession.session_id == session_id).first()
        )
        if not db_session:
            return None

        facilitator = next(a for a in AGENT_DEFINITIONS if a["id"] == "01")
        all_agents = self._get_all_agents(db_session)

        all_messages = (
            db.query(DbMessage)
            .filter(DbMessage.session_id == session_id)
            .order_by(DbMessage.step.asc())
            .all()
        )

        # 改善された履歴フォーマット
        history_text = ""
        for msg in all_messages:
            speaker = next((a for a in all_agents if a["id"] == msg.agent_id), None)
            if speaker:
                speaker_label = f"【{speaker['role']}】{speaker['name']}"
            else:
                speaker_label = f"Agent_{msg.agent_id}"
            history_text += f"{speaker_label}: {msg.content}\n\n"

        system_prompt = (
            "あなたは優秀なファシリテーター（司会）です。\n"
            "これまでのブレインストーミングの議論内容をまとめ、以下のフォーマットで要約を作成してください。\n\n"
            "# 議論の要約\n\n"
            "## 1. 提案された主なアイデア\n"
            "- ...\n\n"
            "## 2. 指摘された課題・リスク\n"
            "- ...\n\n"
            "## 3. 具体的な戦略・アクション\n"
            "- ...\n\n"
            "## 4. 全体の結論\n"
            "..."
        )

        from app.services.llm_engine import LLMEngine

        llm_engine = LLMEngine()

        summary_content = llm_engine.generate_response(
            model_name=facilitator["model"],
            system_prompt=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"以下の議論ログを要約してください。\n\n{history_text}",
                }
            ],
        )

        db_session.summary = summary_content
        db.commit()
        db.refresh(db_session)
        return self._map_to_schema(db_session)

    def _map_to_schema(self, db_session: DbSession) -> SessionStatus:
        # Sort messages by step
        sorted_msgs = sorted(db_session.messages, key=lambda m: m.step)
        msgs_schema = [
            ChatMessage(
                id=m.id,
                session_id=m.session_id,
                agent_id=m.agent_id,
                content=m.content,
                step=m.step,
                timestamp=m.created_at.isoformat() if m.created_at else "",
            )
            for m in sorted_msgs
        ]
        return SessionStatus(
            session_id=db_session.session_id,
            status=db_session.status,
            messages=msgs_schema,
            next_turn_agent_id=db_session.next_turn_agent_id,
            is_finished=db_session.is_finished,
            summary=db_session.summary,
            custom_agents=db_session.custom_agents,
        )
