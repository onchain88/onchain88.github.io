# onchain88 Smart Contracts

onchain88 で使用されるスマートコントラクト群です。

## コントラクト一覧

### 1. MembersSBT - メンバーシップ SBT

- **ディレクトリ**: `./MembersSBT/`
- **説明**: onchain88 のメンバーシップを証明する Soul Bound Token
- **特徴**:
  - 無料ミント（ガス代のみ）
  - 1 アドレス 1 枚限定
  - 譲渡不可（Soul Bound）
  - プロフィール情報保存機能

### 2. その他のコントラクト（今後追加予定）

- Governance 契約
- Treasury 契約
- その他の DAO 機能

## 開発環境

### デプロイツール

- **REMIX IDE**: すべてのコントラクトは REMIX を使用してデプロイ
- **Hardhat**: 使用禁止（.claude/settings.json で制限）

### 対応ネットワーク

- **本番環境**: Polygon (Matic)
- **開発環境**: onchain88 Private Chain
  - RPC: http://dev2.bon-soleil.com/rpc
  - Chain ID: 21201

## ディレクトリ構造

```
contract/
├── README.md                 # このファイル
├── MembersSBT/              # メンバーシップSBT関連
│   ├── onchain88MembersSBT.sol
│   ├── Ionchain88MembersSBT.sol
│   ├── onchain88MembersSBT_ABI.json
│   ├── onchain88MembersSBT_Interface.md
│   ├── Ionchain88MembersSBT_Usage.sol
│   └── README.md
└── [今後追加されるコントラクト]/
```

## セキュリティ

- すべてのコントラクトは本番デプロイ前にテストネットで十分にテストしてください
- オーナー権限を持つアドレスは安全に管理してください
- ユーザー情報はブロックチェーン上に公開されるため、個人情報の取り扱いに注意してください

## ライセンス

MIT License
