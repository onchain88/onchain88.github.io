# onchain88 Members SBT Contract

## 概要

onchain88 Members SBT は、onchain88 のメンバーシップカードとして機能する Soul Bound Token（譲渡不可能な NFT）です。

## 特徴

- **無料ミント**: ガス代のみでミント可能（ミント手数料なし）
- **1 アカウント 1 枚限定**: 各アドレスは 1 つの SBT のみ保有可能
- **譲渡不可（Soul Bound）**: トークンの譲渡・売買は不可能
- **オーナー権限での BURN**: コントラクトオーナーのみがトークンを BURN 可能
- **ユーザー情報管理**: メンバー名、Discord ID、アバター画像（base64 エンコード形式）を保存可能

## コントラクト仕様

### 基本情報

- **名前**: onchain88 Members Card
- **シンボル**: BIZSBT
- **規格**: ERC721 準拠（転送機能を無効化）
- **Solidity バージョン**: ^0.8.19

### 主な関数

#### ユーザー向け関数

```solidity
// SBTをミント（無料、1回のみ）
function mint() external

// アドレスの保有トークン数を確認（0または1）
function balanceOf(address account) external view returns (uint256)

// トークンIDの所有者を確認
function ownerOf(uint256 tokenId) external view returns (address)

// アドレスが保有するトークンIDを確認
function tokenOfOwner(address account) external view returns (uint256)

// アドレスがミント済みか確認
function hasMinted(address account) external view returns (bool)

// ユーザー情報を設定（トークン保有者のみ）
function setUserInfo(
    string memory memberName,
    string memory discordId,
    string memory avatarImage
) external

// ユーザー情報を取得
function getUserInfo(address user) external view returns (
    string memory memberName,
    string memory discordId,
    string memory avatarImage
)
```

#### オーナー向け関数

```solidity
// 特定のトークンをBURN
function burn(uint256 tokenId) external onlyOwner

// コントラクトの所有権を移転
function transferOwnership(address newOwner) external onlyOwner
```

#### その他の関数

```solidity
// ミント価格を取得（常に0）
function mintPrice() external pure returns (uint256)

// 最大供給量を取得（無制限）
function maxSupply() external pure returns (uint256)

// 総供給量を取得
function totalSupply() external view returns (uint256)
```

### 無効化された関数

以下の転送・承認関連の関数は、SBT の性質上すべて無効化されています：

- `transferFrom`
- `safeTransferFrom`
- `approve`
- `setApprovalForAll`
- `getApproved`
- `isApprovedForAll`

## デプロイ手順

### 1. REMIX でのデプロイ

1. [REMIX IDE](https://remix.ethereum.org)にアクセス
2. `onchain88MembersSBT.sol`をコピー
3. コンパイラバージョンを`0.8.19`以上に設定
4. コンパイル実行
5. MetaMask で対象ネットワークに接続
6. デプロイ実行

### 2. デプロイ後の設定

デプロイ後、コントラクトアドレスを`app/src/contract.js`または`.env`ファイルに設定：

```javascript
// 開発環境の場合
VITE_CONTRACT_ADDRESS=0x... // デプロイしたアドレス
```

## 使用例

### ミント

```javascript
// Web3.js/Ethers.jsを使用
await contract.mint();
```

### 保有確認

```javascript
// アドレスがSBTを保有しているか確認
const hasSBT = await contract.hasMinted(userAddress);
const balance = await contract.balanceOf(userAddress);
const tokenId = await contract.tokenOfOwner(userAddress);
```

### BURN（オーナーのみ）

```javascript
// 特定のトークンをBURN
await contract.burn(tokenId);
```

### ユーザー情報の設定

```javascript
// ユーザー情報を設定（トークン保有者のみ）
await contract.setUserInfo(
  "Taro Yamada", // メンバー名
  "taro#1234", // Discord ID
  "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // アバター画像（base64エンコード形式）
);

// アバター画像を空にするとデフォルトアバターが使用されます
await contract.setUserInfo(
  "Taro Yamada",
  "taro#1234",
  "" // 空文字列 → デフォルトアバター（青色のSVGアイコン）が使用される
);
```

### ユーザー情報の取得

```javascript
// 特定のアドレスのユーザー情報を取得
const [memberName, discordId, avatarImage] = await contract.getUserInfo(
  userAddress
);
// avatarImageが未設定の場合、自動的にデフォルトアバター（base64 SVG）が返されます
```

## セキュリティ考慮事項

1. **オーナー権限**: オーナーアドレスは安全に管理してください
2. **BURN 機能**: 誤って BURN しないよう注意が必要です（ユーザー情報も削除されます）
3. **再ミント不可**: 一度 BURN されたアドレスは再度ミントできません
4. **個人情報**: ユーザー情報はブロックチェーン上に公開されるため、適切な情報のみ設定してください
5. **アバター画像**: base64 エンコードされた画像データはオンチェーンに保存されます
   - 推奨サイズ: 最大 100KB（ガス代節約のため）
   - 推奨解像度: 200x200px 以下
   - 画像が大きすぎるとトランザクションが失敗する可能性があります

## ライセンス

MIT License
