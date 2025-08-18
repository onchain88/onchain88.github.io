# NFT ミントアプリ デプロイメントガイド

このドキュメントでは、NFT ミントアプリケーションを GitHub Pages（https://onchain88.github.io/）で公開する方法を説明します。

## 構成

- **開発ディレクトリ**: `/app/`
- **公開 URL**: `https://onchain88.github.io/`
- **デプロイ方式**: main ブランチのルートディレクトリから直接配信

## デプロイ手順

### 1. 開発環境での変更

```bash
# appディレクトリに移動
cd app

# 開発サーバーで動作確認
npm run dev
```

### 2. プロダクションビルド

```bash
# ビルドを実行（distフォルダに出力）
npm run build
```

### 3. ルートディレクトリへのデプロイ

```bash
# リポジトリルートに戻る
cd ..

# 既存のアセットを削除（任意）
rm -rf assets/ vite.svg

# ビルドファイルをルートにコピー
cp -r app/dist/* .
```

### 4. GitHub へのプッシュ

```bash
# 変更をステージング
git add -A

# コミット
git commit -m "feat: NFTミントアプリの更新"

# GitHubにプッシュ
git push origin main
```

## 重要な設定ファイル

### vite.config.js

```javascript
export default defineConfig({
  base: "/", // ルートドメインで公開するため
  // ...
});
```

### GitHub Pages 設定

1. リポジトリの Settings → Pages
2. Source: Deploy from a branch
3. Branch: main / (root)

## 開発フロー

### 新機能の追加

1. `app/src/`内でコードを編集
2. `npm run dev`で動作確認
3. `npm run build`でビルド
4. dist の内容をルートにコピー
5. GitHub にプッシュ

### コントラクト設定の変更

`app/src/contract.js`を編集：

```javascript
export const NFT_CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS";
export const CHAIN_CONFIG = {
  chainId: "0x1", // チェーンIDを設定
  // ...
};
```

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# node_modulesをクリーンアップ
cd app
rm -rf node_modules package-lock.json
npm install
npm run build
```

### GitHub Pages が更新されない場合

- ブラウザのキャッシュをクリア
- GitHub Pages 設定を確認
- 数分待ってから再度アクセス

### 404 エラーが表示される場合

- `vite.config.js`の`base`設定が`'/'`になっているか確認
- index.html がルートディレクトリに存在するか確認

## メンテナンス

### 依存関係の更新

```bash
cd app
npm update
npm audit fix  # セキュリティ修正
```

### パフォーマンス最適化

現在のビルドでは一部のチャンクが 500KB 以上になっています。
必要に応じて以下の最適化を検討：

1. Dynamic import の使用
2. コード分割の改善
3. 不要な依存関係の削除

## 自動化オプション

### GitHub Actions（将来的な実装）

`.github/workflows/deploy.yml`を作成して自動デプロイを設定可能：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - "app/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Build
        run: |
          cd app
          npm ci
          npm run build
      - name: Deploy
        run: |
          cp -r app/dist/* .
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add -A
          git commit -m "Deploy: Auto-deploy from GitHub Actions"
          git push
```

## セキュリティ考慮事項

1. **API キー**: 環境変数を使用し、ソースコードに直接記載しない
2. **コントラクトアドレス**: 本番環境では適切に検証されたアドレスを使用
3. **依存関係**: 定期的に`npm audit`を実行してセキュリティ脆弱性をチェック

## お問い合わせ

デプロイに関する質問や問題がある場合は、GitHub の Issues で報告してください。
