# 使い方ガイド (Command Reference)

このプロジェクトを誰でも簡単に動かせるようにするためのコマンド集です。
ターミナル（Terminal）を開いて、プロジェクトのフォルダで実行してください。

## 🔰 初めての方へ (Getting Started)

### 1. 準備

Docker Desktop が起動していることを確認してください。

### 2. 重要: API キーの設定

プロジェクトフォルダにある `.env` ファイルを開き、キーを入力してください。

```properties
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
```

---

## 🚀 よく使うコマンド (Quick Scripts)

以下のコマンドを入力して実行します（`.sh` ファイルを実行します）。

### アプリを起動する

```bash
./start.sh
```

- 初回はビルドに時間がかかります。
- 完了すると「http://localhost:3000」でアプリが開けます。

### ログを見る（エラーかな？と思ったら）

```bash
./logs.sh
```

- 動いているプログラムの裏側のメッセージが見れます。
- 終了するにはキーボードの `Ctrl` + `C` を押します。

### アプリを停止する

```bash
./stop.sh
```

---

## 🛠 上級者向け (Original Docker Commands)

スクリプトを使わず直接 Docker コマンドを実行する場合:

| 操作                       | コマンド                                                 |
| :------------------------- | :------------------------------------------------------- |
| **起動 (ビルド込)**        | `docker-compose up -d --build`                           |
| **停止**                   | `docker-compose down`                                    |
| **全ログ確認**             | `docker-compose logs -f`                                 |
| **バックエンドのみログ**   | `docker-compose logs -f backend`                         |
| **フロントエンドのみログ** | `docker-compose logs -f frontend`                        |
| **テスト実行**             | `docker-compose run --rm -e PYTHONPATH=. backend pytest` |

---

## トラブルシューティング

**Q. API エラーが出ます**
A. `.env` ファイルに正しいキーが入っているか確認してください。モデル名が正しいか（新しいモデルなど）確認してください。

**Q. 画面が出ません**
A. `start.sh` を実行後、少し（1-2 分）待ってからリロードしてください。

---

## 💾 データベース接続 (Database)

TablePlus 等の DB クライアントから接続する場合の情報です。

| 項目         | 設定値       |
| :----------- | :----------- |
| **Host**     | `127.0.0.1`  |
| **Port**     | `5432`       |
| **User**     | `user`       |
| **Password** | `password`   |
| **Database** | `brainstorm` |
| **SSL**      | Disable      |
