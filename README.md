# 戦略MG ゲーム

React + TypeScript + Vite + Express + Socket.io で構築したマルチプレイヤー経営シミュレーションゲームです。

---

## ローカル開発

```bash
# クライアント + サーバーを別ターミナルで起動
npm install          # 依存関係インストール (server/ も自動でインストール)
npm run dev          # Vite 開発サーバー (http://localhost:5173)

cd server
npm run dev          # Express + Socket.io (http://localhost:3001)
```

---

## Railway へのデプロイ手順

### 1. GitHub にコードをプッシュする

```bash
# プロジェクトルートで実行
git init
git add .
git commit -m "initial commit"
```

GitHub で新しいリポジトリを作成し、以下のコマンドでプッシュします。

```bash
git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
git branch -M main
git push -u origin main
```

### 2. Railway アカウントを作成する

1. [railway.app](https://railway.app) にアクセス
2. 「Login」→「Login with GitHub」でログイン

### 3. Railway で新しいプロジェクトを作成する

1. ダッシュボードで **「New Project」** をクリック
2. **「Deploy from GitHub repo」** を選択
3. 先ほどプッシュしたリポジトリを選択
4. 「Deploy Now」をクリック

Railway が自動でビルドとデプロイを開始します（2〜3分かかります）。

### 4. 環境変数を設定する

Railway のプロジェクトページで **「Variables」** タブを開き、以下を追加します。

| 変数名 | 値 |
|--------|-----|
| `NODE_ENV` | `production` |

> PORT は Railway が自動で設定するため、手動設定は不要です。

### 5. デプロイ完了後の URL 確認

1. **「Settings」** タブを開く
2. **「Domains」** セクションで「Generate Domain」をクリック
3. 発行された URL（例: `https://your-app.up.railway.app`）にアクセスして動作確認

### 6. トラブルシュート

**ビルドが失敗する場合**
- Railway の「Deployments」→「Build Logs」を確認してください
- Node.js のバージョンが 22.6.0 以上であることを確認してください（`railway.json` と `package.json` の `engines` で指定済み）

**Socket.io が接続できない場合**
- 「Deployments」→「Deploy Logs」で `strategy-mg server` のログを確認してください
- `/health` エンドポイント（`https://your-app.up.railway.app/health`）にアクセスして `{"status":"ok"}` が返れば正常です

**ゲームが開始できない場合**
- ブラウザの開発者ツール（F12）のコンソールにエラーが出ていないか確認してください
- `NODE_ENV=production` が Railway の環境変数に設定されているか確認してください

---

## 技術スタック

- **フロントエンド**: React 18 / TypeScript / Vite / Tailwind CSS / shadcn/ui
- **バックエンド**: Express / Socket.io / Node.js (--experimental-strip-types)
- **デプロイ**: Railway (単一サービス、Express がクライアントも配信)
