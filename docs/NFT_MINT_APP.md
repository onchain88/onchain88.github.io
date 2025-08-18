# NFT Mint App

MetaMask SDKを使用したモバイルブラウザ対応NFTミントアプリケーション

## 機能

- スマートフォンの標準ブラウザからNFTミント可能
- MetaMask SDKによるウォレット接続
- モバイル最適化されたUI
- 複数個のミント対応
- リアルタイムでのミント状況表示

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. コントラクト設定

`src/contract.js`を編集して、実際のNFTコントラクト情報を設定：

```javascript
export const NFT_CONTRACT_ADDRESS = 'YOUR_CONTRACT_ADDRESS';
// ABIも必要に応じて更新
```

### 3. チェーン設定

デフォルトはEthereumメインネットです。他のチェーンを使用する場合は`src/contract.js`の`CHAIN_CONFIG`を更新してください。

## 開発

```bash
npm run dev
```

## ビルド

```bash
npm run build
```

ビルドされたファイルは`dist`ディレクトリに出力されます。

## デプロイ

GitHub Pagesへのデプロイ例：

1. `vite.config.js`の`base`オプションをリポジトリ名に合わせて設定
2. ビルドを実行
3. `dist`ディレクトリの内容をGitHub Pagesにデプロイ

## 使用方法

1. モバイルブラウザでサイトにアクセス
2. 「Connect Wallet」ボタンをタップ
3. MetaMaskアプリが開くので承認
4. ミント数量を選択
5. 「Mint NFT」ボタンをタップしてトランザクションを送信

## 注意事項

- MetaMaskアプリがインストールされている必要があります
- 十分なETHの残高が必要です
- ガス代は別途必要です