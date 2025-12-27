from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime

from app.db.database import get_db
from app.models.session import DbSession, DbMessage
from app.core.constants import AGENT_DEFINITIONS

router = APIRouter(prefix="/api/sessions", tags=["export"])


def get_agent_name(agent_id: str, custom_agents: list = None) -> tuple[str, str]:
    """エージェントの名前と役割を取得"""
    # デフォルトエージェントから検索
    for agent in AGENT_DEFINITIONS:
        if agent["id"] == agent_id:
            return agent["name"], agent["role"]

    # カスタムエージェントから検索
    if custom_agents:
        for idx, custom in enumerate(custom_agents):
            custom_id = custom.get("id", f"C{idx + 1:02d}")
            if custom_id == agent_id:
                return custom.get("name", "Custom"), custom.get("role", "カスタム")

    return f"Agent_{agent_id}", "不明"


@router.get("/{session_id}/export/pdf")
def export_pdf(session_id: str, db: Session = Depends(get_db)):
    """セッションをPDF形式でエクスポート"""
    # セッション取得
    db_session = db.query(DbSession).filter(DbSession.session_id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # メッセージ取得
    messages = (
        db.query(DbMessage)
        .filter(DbMessage.session_id == session_id)
        .order_by(DbMessage.step.asc())
        .all()
    )

    # PDFを生成
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    # スタイル設定
    styles = getSampleStyleSheet()

    # カスタムスタイル
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=12,
        alignment=1,  # Center
    )

    subtitle_style = ParagraphStyle(
        "CustomSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.grey,
        alignment=1,
        spaceAfter=20,
    )

    speaker_style = ParagraphStyle(
        "Speaker",
        parent=styles["Heading3"],
        fontSize=11,
        textColor=colors.HexColor("#4F46E5"),
        spaceBefore=15,
        spaceAfter=5,
    )

    content_style = ParagraphStyle(
        "Content",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        spaceAfter=10,
    )

    summary_title_style = ParagraphStyle(
        "SummaryTitle",
        parent=styles["Heading2"],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor("#4F46E5"),
    )

    # コンテンツ作成
    story = []

    # タイトル
    story.append(Paragraph("BrainStormAI 議論レポート", title_style))

    # サブタイトル（トピック）
    topic = db_session.topic or "議論トピック"
    created = (
        db_session.created_at.strftime("%Y年%m月%d日 %H:%M")
        if db_session.created_at
        else ""
    )
    story.append(Paragraph(f"トピック: {topic}", subtitle_style))
    story.append(Paragraph(f"作成日時: {created}", subtitle_style))
    story.append(Spacer(1, 10 * mm))

    # 議論内容
    for msg in messages:
        name, role = get_agent_name(msg.agent_id, db_session.custom_agents)

        # 発言者
        story.append(Paragraph(f"【{role}】{name}", speaker_style))

        # 内容（マークダウンを簡易的に処理）
        content = msg.content.replace("\n", "<br/>")
        content = content.replace("**", "")  # Bold markers removed for simplicity
        story.append(Paragraph(content, content_style))

    # 要約（あれば）
    if db_session.summary:
        story.append(Spacer(1, 10 * mm))
        story.append(Paragraph("📑 議論の要約", summary_title_style))
        summary_content = db_session.summary.replace("\n", "<br/>")
        story.append(Paragraph(summary_content, content_style))

    # PDF生成
    doc.build(story)

    buffer.seek(0)

    # ファイル名
    filename = f"brainstorm_{session_id[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
