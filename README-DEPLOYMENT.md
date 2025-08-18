# GitHub Pages デプロイメント設定

このプロジェクトは GitHub Actions を使用して自動的に GitHub Pages にデプロイされます。

## セットアップ手順

### 1. GitHub リポジトリの設定

1. GitHub リポジトリの Settings > Pages に移動
2. Source を「GitHub Actions」に設定

### 2. 自動デプロイ

- `main` ブランチにプッシュすると自動的にビルド・デプロイが実行されます
- デプロイ先 URL: https://onchain88.github.io/

### 3. 手動デプロイ

1. GitHub リポジトリの Actions タブに移動
2. 「Deploy to GitHub Pages」ワークフローを選択
3. 「Run workflow」ボタンをクリック

## ワークフローの詳細

- **ビルドディレクトリ**: `app/dist`
- **Node.js バージョン**: 20
- **パッケージマネージャー**: npm

## ローカルでのビルド確認

```bash
cd app
npm install
npm run build
```

ビルド結果は `app/dist` ディレクトリに出力されます。

## トラブルシューティング

### デプロイが失敗する場合

1. GitHub Pages が有効になっているか確認
2. Settings > Pages で Source が「GitHub Actions」になっているか確認
3. Actions タブでワークフローのログを確認

### 404 エラーが発生する場合

- `vite.config.js` の `base` 設定が正しいか確認（現在は `/` に設定）
- ビルド後のファイルパスが正しいか確認
