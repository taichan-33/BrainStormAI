Markdown

# AI多人数共同ブレインストーミング・プラットフォーム 設計書

## 1. プロジェクト概要
ユーザーが提示したトピックに対し、異なる専門性と性格を持つ6人のAIエージェント（OpenAI GPT系とGoogle Gemini系を混成）が議論を行い、戦略やアイデアをブラッシュアップして出力するWebアプリケーション。

### コンセプト
* **"Six Thinking Hats" for AI:** 異なる視点を持つAIが共同作業を行う。
* **Hybrid Intelligence:** GPTの論理性とGeminiの創造性/長文脈理解を組み合わせる。

---

## 2. 技術スタック

### Backend
* **Language:** Python 3.10+
* **Framework:** FastAPI
* **LLM Orchestration:** LangChain (またはOpenAI/Gemini SDKの直接利用によるカスタム実装)
* **Testing:** pytest, httpx (非同期テスト用)
* **Database:** PostgreSQL (本番用)
* **Environment Management:** Poetry or pip

### Frontend
* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **State Management:** React Hooks / Context API

### External APIs
* **OpenAI API:** GPT-4o / GPT-4o-mini
* **Google Gemini API:** Gemini 1.5 Pro / Gemini 1.5 Flash

---

## 3. エージェント設計 (The 6 Personas)

各エージェントは固定の役割(`Role`)と、それに適したモデル(`Model`)を持つ。

| ID | Role Name | Model | Responsibility | Prompt Personality Key |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Facilitator** (司会) | **GPT-5.2** | 議論の進行管理、次話者の指名、論点整理、タイムキーピング。 | 冷静、公平、統率力 |
| **02** | **Innovator** (起業家) | **Gemini 3.0 Pro** | 新規アイデアの提案、創造的飛躍、楽観的な可能性の模索。 | 情熱的、創造的、楽観的 |
| **03** | **Critic** (批評家) | **GPT-5.2** | リスク指摘、論理的矛盾の発見、コストや法規制の懸念提示。 | 慎重、論理的、批判的 |
| **04** | **Strategist** (戦略家) | **GPT-5.2** | 具体的な実行計画の策定、ビジネスモデルへの落とし込み。 | 現実的、構造的、計画的 |
| **05** | **Marketer** (マーケター) | **Gemini 3.0 Pro** | ユーザー心理の分析、市場トレンド、キャッチコピーや訴求軸の提案。 | ユーザー視点、トレンド敏感 |
| **06** | **Tech Lead** (技術者) | **GPT-5.2** | 技術的実現可能性、必要なスタック選定、開発工数の見積もり。 | 技術的、効率重視 |

---

## 4. 機能要件 (Functional Requirements)

### 4.1 会議セッション管理
* ユーザーは任意の「トピック」を入力してセッションを開始できる。
* システムは一意の `session_id` を発行する。
* 各セッションは以下の状態を持つ: `created` -> `in_progress` -> `completed` -> `failed`。

### 4.2 ターン制議論システム
* 議論は**ターン制**で進行する（リアルタイム並列発話ではない）。
* **Facilitator** が「次に誰が話すべきか」または「議論を終了するか」を決定するロジックを持つ。
* 発言履歴（Context）は全エージェントで共有される。

### 4.3 出力生成
* 議論が終了フラグに達した場合、最終的な成果物（サマリー、戦略案）をMarkdown形式で生成する。

---

## 5. バックエンド設計・API仕様 (FastAPI)

TDD実施のため、エンドポイントとデータスキーマを定義する。

### 5.1 データモデル (Pydantic Schemas)

#### `TopicInput`
```python
class TopicInput(BaseModel):
    topic: str
    context_details: Optional[str] = None
AgentProfile
Python

class AgentProfile(BaseModel):
    id: str
    name: str
    role: str
    model_provider: str  # "openai" or "google"
ChatMessage
Python

class ChatMessage(BaseModel):
    id: str
    session_id: str
    agent_id: str
    content: str
    timestamp: datetime
    step: int
SessionStatus
Python

class SessionStatus(BaseModel):
    session_id: str
    status: str
    messages: List[ChatMessage]
    next_turn_agent_id: Optional[str]
    is_finished: bool
5.2 API Endpoints
POST /api/sessions
目的: 新しいブレインストーミングセッションを開始する。

Input: TopicInput

Output: SessionStatus (初期状態、Facilitatorの最初の発言を含む)

処理: DBレコード作成、Facilitatorによる議題設定プロンプトの実行。

POST /api/sessions/{session_id}/next-turn
目的: 議論を1ステップ進める。

Output: SessionStatus (新しく追加されたメッセージを含む)

処理:

現在の会話履歴を読み込む。

Facilitatorロジックにより次話者を決定する。

該当エージェント（LLM）のAPIをコールして発言を生成。

DBに保存して返却。

GET /api/sessions/{session_id}
目的: 現在の議論ログを取得する（ポーリング用）。

Output: SessionStatus

6. ディレクトリ構造 (Backend)
Plaintext

backend/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI entry point
│   ├── core/
│   │   ├── config.py      # Env vars
│   │   └── constants.py   # Agent definitions
│   ├── models/            # Database models (SQLAlchemy)
│   ├── schemas/           # Pydantic models
│   ├── api/
│   │   └── routers/       # API Routes
│   ├── services/
│   │   ├── llm_engine.py  # LLM API Client wrapper
│   │   ├── orchestrator.py# Logic for turn management
│   │   └── agents.py      # Individual agent prompts
│   └── db/                # Database connection
├── tests/
│   ├── __init__.py
│   ├── conftest.py        # Pytest fixtures
│   ├── test_api/          # API integration tests
│   └── test_services/     # Unit tests for logic
├── pyproject.toml
└── README.md
7. 開発ロードマップ (TDD Steps)
Phase 1: Core Logic & Mocking (まずはロジックのみ)
Model定義: Pydanticモデルを作成し、データの整合性をテストする。

Agent定義: 各エージェントのプロンプト構成が正しいかテストする。

Orchestrator (Mock): LLMをモック（偽装）し、「Facilitatorが次話者を指名する」ロジックフロー単体をテストする。

Test Case: 履歴が空の時 → Facilitatorが喋る。

Test Case: 議論中 → ランダムまたはルールベースで次のエージェントが選ばれる。

Phase 2: API Implementation
Session API: POST /sessions でDBにデータが保存されることをテストする。

Turn API: POST /next-turn を呼ぶたびにメッセージが増えることをテストする。

Phase 3: Real LLM Integration
Service Layer: 実際のOpenAI / Google Gemini APIを叩く処理を実装。

Integration Test: 環境変数がある場合のみ走るライブテストを追加。

Phase 4: Frontend Integration
Next.jsからAPIを叩き、チャットUIに表示する。


