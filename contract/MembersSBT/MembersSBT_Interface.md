# onchain88 Members SBT - REMIX インターフェース

## コントラクト情報

- **名前**: onchain88 Members Card
- **シンボル**: BIZSBT
- **タイプ**: Soul Bound Token (譲渡不可能 NFT)

## REMIX デプロイ手順

1. [REMIX IDE](https://remix.ethereum.org) を開く
2. `onchain88MembersSBT.sol` をコピー＆ペースト
3. コンパイラバージョン: `0.8.19` 以上
4. コンパイル実行
5. Deploy & Run Transactions タブで以下を設定：
   - Environment: `Injected Provider - MetaMask`
   - Contract: `onchain88MembersSBT`
   - Deploy ボタンをクリック

## 主要関数一覧

### 読み取り専用関数（ガス代不要）

#### 1. **name()** → string

```
返り値: "onchain88 Members Card"
```

#### 2. **symbol()** → string

```
返り値: "BIZSBT"
```

#### 3. **DEFAULT_AVATAR()** → string

```
返り値: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAwIiBjeT0iODAiIHI9IjQwIiBmaWxsPSIjNjY3ZWVhIi8+PHBhdGggZD0iTTEwMCwxMzBjLTQwLDAuNS04MCwyMC04MCw1MHYyMGgxNjB2LTIwQzE4MCwxNTAsMTQwLDEzMC41LDEwMCwxMzB6IiBmaWxsPSIjNjY3ZWVhIi8+PC9zdmc+"
```

#### 4. **totalSupply()** → uint256

```
説明: 現在のトークン総供給量
返り値例: 42
```

#### 5. **mintPrice()** → uint256

```
説明: ミント価格（常に0）
返り値: 0
```

#### 6. **maxSupply()** → uint256

```
説明: 最大供給量（無制限）
返り値: 115792089237316195423570985008687907853269984665640564039457584007913129639935
```

#### 7. **owner()** → address

```
説明: コントラクトオーナーのアドレス
返り値例: 0x1234...5678
```

#### 8. **balanceOf(address account)** → uint256

```
説明: 指定アドレスの保有トークン数（0または1）
パラメータ例: 0x1234...5678
返り値: 0 または 1
```

#### 9. **ownerOf(uint256 tokenId)** → address

```
説明: 指定トークンIDの所有者アドレス
パラメータ例: 1
返り値例: 0x1234...5678
```

#### 10. **tokenOfOwner(address account)** → uint256

```
説明: 指定アドレスが保有するトークンID
パラメータ例: 0x1234...5678
返り値例: 1 （保有していない場合は0）
```

#### 11. **hasMinted(address account)** → bool

```
説明: 指定アドレスがミント済みか確認
パラメータ例: 0x1234...5678
返り値: true または false
```

#### 12. **getUserInfo(address user)** → (string, string, string)

```
説明: ユーザー情報を取得
パラメータ例: 0x1234...5678
返り値:
  - memberName: "田中太郎"
  - discordId: "tanaka#1234"
  - avatarImage: "data:image/jpeg;base64,..." または DEFAULT_AVATAR
```

### 書き込み関数（ガス代必要）

#### 1. **mint()**

```
説明: SBTをミント（1アドレス1回のみ）
必要条件: 未ミントのアドレス
ガス代: 約100,000～150,000 gas
```

#### 2. **setUserInfo(string memberName, string discordId, string avatarImage)**

```
説明: ユーザー情報を設定
必要条件: トークン保有者のみ
パラメータ例:
  - memberName: "田中太郎"
  - discordId: "tanaka#1234"
  - avatarImage: "data:image/jpeg;base64,/9j/4AAQSkZJRg..." または ""（空文字）
注意事項:
  - avatarImageを空文字にするとDEFAULT_AVATARが使用されます
  - 画像は100KB以下を推奨（ガス代節約）
ガス代: 画像サイズにより変動（50,000～500,000 gas）
```

#### 3. **burn(uint256 tokenId)** ※オーナー専用

```
説明: 指定トークンをBURN
必要条件: コントラクトオーナーのみ実行可能
パラメータ例: 1
注意: ユーザー情報も同時に削除されます
ガス代: 約50,000～80,000 gas
```

#### 4. **transferOwnership(address newOwner)** ※オーナー専用

```
説明: コントラクトの所有権を移転
必要条件: コントラクトオーナーのみ実行可能
パラメータ例: 0x9876...5432
ガス代: 約30,000～50,000 gas
```

## 無効化された関数（エラーを返す）

以下の関数は SBT の性質上、すべて`revert`されます：

- `transferFrom(address from, address to, uint256 tokenId)`
- `safeTransferFrom(address from, address to, uint256 tokenId)`
- `safeTransferFrom(address from, address to, uint256 tokenId, bytes data)`
- `approve(address to, uint256 tokenId)`
- `setApprovalForAll(address operator, bool approved)`
- `getApproved(uint256 tokenId)` → 常に address(0)を返す
- `isApprovedForAll(address owner, address operator)` → 常に false を返す

## イベント

### 1. **Transfer(address indexed from, address indexed to, uint256 indexed tokenId)**

```
発生タイミング: mint時、burn時
例: Transfer(0x0000...0000, 0x1234...5678, 1) // mint
例: Transfer(0x1234...5678, 0x0000...0000, 1) // burn
```

### 2. **Mint(address indexed to, uint256 indexed tokenId)**

```
発生タイミング: mint成功時
例: Mint(0x1234...5678, 1)
```

### 3. **Burn(uint256 indexed tokenId)**

```
発生タイミング: burn成功時
例: Burn(1)
```

### 4. **OwnershipTransferred(address indexed previousOwner, address indexed newOwner)**

```
発生タイミング: オーナー権限移転時
例: OwnershipTransferred(0x1234...5678, 0x9876...5432)
```

### 5. **UserInfoUpdated(address indexed user, string memberName, string discordId, string avatarImage)**

```
発生タイミング: ユーザー情報更新時
例: UserInfoUpdated(0x1234...5678, "田中太郎", "tanaka#1234", "data:image/...")
```

## REMIX での操作例

### 1. トークンをミントする

1. `mint` ボタンをクリック
2. MetaMask で承認
3. トランザクション完了を待つ

### 2. ユーザー情報を設定する

1. `setUserInfo` を展開
2. 各フィールドに入力：
   - memberName: `田中太郎`
   - discordId: `tanaka#1234`
   - avatarImage: `（空文字またはbase64画像）`
3. `transact` ボタンをクリック

### 3. ユーザー情報を確認する

1. `getUserInfo` を展開
2. user フィールドにアドレスを入力
3. `call` ボタンをクリック

### 4. 保有状況を確認する

1. `hasMinted` を展開
2. account フィールドにアドレスを入力
3. `call` ボタンをクリック

## トラブルシューティング

### よくあるエラー

1. **"Already minted"**

   - 原因: すでにミント済みのアドレス
   - 対処: 各アドレスは 1 つの SBT のみミント可能

2. **"Must hold a token to set user info"**

   - 原因: トークンを保有していない
   - 対処: 先に mint()を実行

3. **"Only owner can call this function"**

   - 原因: オーナー以外が burn/transferOwnership を実行
   - 対処: オーナーアドレスから実行

4. **"SBT: Transfer not allowed"**
   - 原因: 転送系の関数を呼び出した
   - 対処: SBT は転送不可能

## ガス代の目安（Polygon）

- mint: 0.01 ～ 0.02 MATIC
- setUserInfo（小さい画像）: 0.005 ～ 0.01 MATIC
- setUserInfo（大きい画像）: 0.02 ～ 0.05 MATIC
- burn: 0.005 ～ 0.01 MATIC
- transferOwnership: 0.003 ～ 0.005 MATIC

※ネットワークの混雑状況により変動します
