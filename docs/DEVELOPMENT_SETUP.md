# 開発環境セットアップガイド

## 概要

本プロジェクトでは、開発環境としてプライベートチェーンを使用し、本番環境では Polygon Mainnet を使用します。

## プライベートチェーン情報

- **RPC URL**: `http://dev2.bon-soleil.com/rpc`
- **チェーン ID**: `21201` (0x52d1)
- **通貨シンボル**: `DEV`
- **ブロックエクスプローラー**: なし（プライベートチェーン）

## 環境設定

### 1. 環境変数の設定

`app`ディレクトリに`.env`ファイルを作成：

```bash
cd app
cp .env.example .env
```

`.env`ファイルを編集：

```env
# 開発環境として設定
VITE_ENV=development

# 開発環境用のコントラクトアドレス
VITE_CONTRACT_ADDRESS=0x166748e744195650a94FC32C64d8f0c9329f96F1 # REMIXでデプロイしたアドレス

# オプション: Infura API Key（バックアップRPC用）
VITE_INFURA_API_KEY=
```

### 2. MetaMask の設定

1. MetaMask を開く
2. ネットワークを追加：
   - ネットワーク名: `onchain88 Dev Chain`
   - RPC URL: `http://dev2.bon-soleil.com/rpc`
   - チェーン ID: `21201`
   - 通貨記号: `DEV`

### 3. 開発サーバーの起動

```bash
npm run dev
```

開発モードで起動すると、自動的にプライベートチェーンの設定が適用されます。

## 環境の切り替え

### 開発環境（デフォルト）

```bash
# .envファイルで設定
VITE_ENV=development
```

または

```bash
# 開発サーバー起動時は自動的に開発環境
npm run dev
```

### 本番環境

**注意**: 現在、開発フェーズのため、本番ビルドでもプライベートチェーンを使用するように設定されています。

```bash
# .envファイルで設定
VITE_ENV=production
```

または

```bash
# ビルド時は自動的に本番環境
npm run build
```

#### FORCE_PRIVATE_CHAIN フラグについて

`app/src/config.js`に`FORCE_PRIVATE_CHAIN`フラグが設定されています：

```javascript
// Force private chain flag (set to true during development phase)
// TODO: Set to false when ready for production deployment on Polygon
export const FORCE_PRIVATE_CHAIN = true;
```

このフラグが`true`の間は、本番ビルドでもプライベートチェーンが使用されます。Polygon Mainnet へのデプロイ準備が整ったら、このフラグを`false`に変更してください。

## コントラクトのデプロイ

### 1. プライベートチェーンへのデプロイ

1. [REMIX IDE](https://remix.ethereum.org)にアクセス
2. MetaMask でプライベートチェーンに接続
3. コントラクトをデプロイ
4. デプロイしたアドレスを`.env`の`VITE_CONTRACT_ADDRESS`に設定

### 2. テスト用トークンの取得

プライベートチェーンのテスト用トークン（DEV）が必要な場合は、プロジェクト管理者にお問い合わせください。

## トラブルシューティング

### MetaMask で接続できない

1. ネットワーク設定を確認
2. RPC URL が正しいか確認: `http://dev2.bon-soleil.com/rpc`
3. HTTPS ではなく HTTP であることに注意

### 環境変数が反映されない

1. `.env`ファイルが正しい場所にあるか確認
2. 開発サーバーを再起動
3. ブラウザのキャッシュをクリア

### コントラクトが見つからない

1. コントラクトアドレスが正しいか確認
2. 正しいチェーンに接続しているか確認
3. コントラクトが正常にデプロイされているか確認

## 開発のベストプラクティス

1. **環境分離**: 開発と本番で異なるコントラクトアドレスを使用
2. **テスト**: プライベートチェーンで十分にテストしてから本番にデプロイ
3. **バージョン管理**: `.env`ファイルは Git にコミットしない（`.gitignore`に含まれています）

## 参考リンク

- [プロジェクト README](../README.md)
- [スマートコントラクトデプロイガイド](./SMART_CONTRACT_DEPLOYMENT.md)
- [アプリケーションデプロイガイド](./DEPLOYMENT.md)
