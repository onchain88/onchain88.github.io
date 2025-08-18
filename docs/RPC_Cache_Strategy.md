# RPC キャッシュ戦略

## エグゼクティブサマリー

NFT プロジェクトにおいて、サーバーサイドを使用せずに RPC ノードへのリクエストを最適化するためのクライアントサイドキャッシュ戦略を実装します。IndexedDB を使用した構造化データのキャッシュにより、パフォーマンス向上とコスト削減を実現します。

## 現状の課題

### 1. RPC ノードへの過度な負荷

- ギャラリー表示時の大量の tokenURI 取得
- 作者別、NFT/SBT 別フィルタリング時の繰り返しリクエスト
- ページリロード時の全データ再取得

### 2. ユーザー体験の低下

- 作品一覧の表示遅延
- フィルタ切り替え時の待機時間
- RPC レート制限への抵触リスク

### 3. コスト増加

- RPC プロバイダーの従量課金
- 不要な帯域幅使用

## アーキテクチャ

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│ Cache Layer  │────▶│  RPC Node   │
│  (Browser)  │◀────│  (IndexedDB) │◀────│(onChain) │
└─────────────┘     └──────────────┘     └─────────────┘
```

## キャッシュ戦略

### 1. 永続キャッシュ（Immutable Data）

**対象データ：**

- コントラクト基本情報（name, symbol）
- バーン履歴（burnHistory）
- SBT ロック状態（tokenLocked）
- 最大ロイヤリティ設定（MAX_ROYALTY_BPS）

**特徴：**

- TTL: 無期限
- 一度取得したら変更されない
- ストレージ容量が許す限り保持

### 2. 長期キャッシュ（Slow-changing Data）

**対象データ：**

- ミント料金（mintFee）
- デフォルトロイヤリティ情報（royaltyInfo）
- 作者のトークンリスト（creatorTokens）
- NFT/SBT リスト（normalTokens, sbtTokens）

**特徴：**

- TTL: 1 時間（3,600,000ms）
- 変更頻度が低い
- 定期的な更新で十分

### 3. 中期キャッシュ（Moderate Data）

**対象データ：**

- トークン URI（tokenURI）
- 作者別トークン数（creatorTokenCount）
- NFT/SBT 別カウント（normalTokenCount, sbtTokenCount）

**特徴：**

- TTL: 5 分（300,000ms）
- 更新可能だが頻繁ではない
- バランスの取れたキャッシュ期間

### 4. 短期キャッシュ（Dynamic Data）

**対象データ：**

- 総供給量（totalSupply）
- 残高（balanceOf）
- 所有者情報（ownerOf）

**特徴：**

- TTL: 30 秒（30,000ms）
- 頻繁に変更される
- リアルタイム性が重要

## 技術仕様

### IndexedDB スキーマ

```javascript
{
  dbName: 'indexeddb_rpc_cache',
  version: 1,
  objectStores: [
    {
      name: 'cache',
      keyPath: 'key',
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'expiry', keyPath: 'expiry' },
        { name: 'category', keyPath: 'category' }
      ]
    },
    {
      name: 'gallery_cache',
      keyPath: 'creator',
      indexes: [
        { name: 'lastUpdated', keyPath: 'lastUpdated' }
      ]
    }
  ]
}
```

### キャッシュエントリ構造

```javascript
{
  key: string,        // "chainId:method:params"
  value: any,         // RPCレスポンスデータ
  timestamp: number,  // キャッシュ作成時刻
  expiry: number,     // 有効期限（null = 永続）
  category: string,   // データカテゴリ
  size: number        // データサイズ（バイト）
}
```

### キャッシュキー生成ルール

```
{chainId}:{contractAddress}:{method}:{serialized_params}

例:
- "21201:0x123...:name:{}"
- "21201:0x123...:tokenURI:{\"tokenId\":\"1\"}"
- "21201:0x123...:creatorTokens:{\"creator\":\"0xabc...\"}"
```

## DAO 特有の最適化

### 1. ギャラリー表示の最適化

```javascript
class IndexedDbCache {
  // 作者ギャラリーの一括キャッシュ
  async cacheCreatorGallery(creator) {
    const key = `gallery:${creator}`;
    const cached = await this.get(key);

    if (cached && !this.isExpired(cached)) {
      return cached.value;
    }

    // 作者の全作品データを一括取得
    const tokenCount = await this.getCreatorTokenCount(creator);
    const gallery = {
      creator,
      tokenCount,
      tokens: [],
      metadata: [],
      lastUpdated: Date.now(),
    };

    // バッチ処理で効率化
    const batchSize = 10;
    for (let i = 0; i < tokenCount; i += batchSize) {
      const promises = [];
      for (let j = i; j < Math.min(i + batchSize, tokenCount); j++) {
        promises.push(this.fetchTokenData(creator, j));
      }
      const results = await Promise.all(promises);
      gallery.tokens.push(...results);
    }

    // ギャラリーキャッシュに保存（1時間）
    await this.setGalleryCache(creator, gallery, 3600000);
    return gallery;
  }
}
```

### 2. バーン対応

```javascript
// バーン時のキャッシュ無効化戦略
async function handleTokenBurn(tokenId, creator) {
  // 個別トークンのキャッシュをクリア
  await cache.delete(`tokenURI:${tokenId}`);
  await cache.delete(`ownerOf:${tokenId}`);
  await cache.delete(`tokenLocked:${tokenId}`);

  // 集計系のキャッシュを無効化
  await cache.deletePattern("*totalSupply*");
  await cache.deletePattern("*TokenCount*");
  await cache.deletePattern(`creatorTokens:${creator}`);

  // ギャラリーキャッシュも無効化
  await cache.deleteGalleryCache(creator);
}
```

### 3. フィルタリング最適化

```javascript
// NFT/SBT別表示の効率化
async function getFilteredTokens(type) {
  const cacheKey = `filtered:${type}`;
  const cached = await cache.get(cacheKey);

  if (cached) return cached;

  let tokens = [];
  if (type === "normal") {
    const count = await this.normalTokenCount();
    for (let i = 0; i < count; i++) {
      tokens.push(await this.normalTokenByIndex(i));
    }
  } else if (type === "sbt") {
    const count = await this.sbtTokenCount();
    for (let i = 0; i < count; i++) {
      tokens.push(await this.sbtTokenByIndex(i));
    }
  }

  // フィルタ結果を5分間キャッシュ
  await cache.set(cacheKey, tokens, 300000);
  return tokens;
}
```

## 実装計画

### フェーズ 1: 基本実装（1 週間）

- [ ] IndexedDbCache クラスの実装
- [ ] IndexedDB ラッパーの作成
- [ ] 基本的な CRUD 操作
- [ ] TTL 管理機能

### フェーズ 2: 統合（1 週間）

- [ ] 既存の RPC 呼び出しをキャッシュ対応に置き換え
- [ ] ギャラリー表示の最適化
- [ ] バーン対応の実装
- [ ] エラーハンドリング

### フェーズ 3: 最適化（1 週間）

- [ ] LRU アルゴリズムによる容量管理
- [ ] プリフェッチ戦略の実装
- [ ] キャッシュ統計とデバッグツール
- [ ] パフォーマンス測定

## 期待される効果

### パフォーマンス改善

- RPC リクエスト削減: 75-85%（ギャラリー表示時）
- ページロード時間: 60%短縮
- フィルタ切り替え: 即時（キャッシュヒット時）

### コスト削減

- RPC コスト: 月額 70-80%削減見込み
- 帯域幅使用量: 大幅削減

### ユーザー体験向上

- スムーズな作品閲覧
- 高速なフィルタリング
- オフライン時の部分的動作

## キャッシュ設定

```javascript
const CACHE_CONFIG = {
  // 永続キャッシュ
  name: null,
  symbol: null,
  MAX_ROYALTY_BPS: null,
  burnHistory: null,
  tokenLocked: null,

  // 長期キャッシュ（1時間）
  mintFee: 3600000,
  royaltyInfo: 3600000,
  creatorTokens: 3600000,
  normalTokens: 3600000,
  sbtTokens: 3600000,

  // 中期キャッシュ（5分）
  tokenURI: 300000,
  creatorTokenCount: 300000,
  normalTokenCount: 300000,
  sbtTokenCount: 300000,
  gallery: 300000,

  // 短期キャッシュ（30秒）
  totalSupply: 30000,
  balanceOf: 30000,
  ownerOf: 30000,
  tokenOfOwnerByIndex: 30000,
};
```

## リスク管理

### 1. データ不整合

**リスク:** 古いデータの表示
**対策:**

- 適切な TTL 設定
- ミント/バーン後の自動無効化
- 手動リフレッシュオプション

### 2. ストレージ容量

**リスク:** IndexedDB の容量超過
**対策:**

- 定期的な古いエントリ削除
- LRU による自動削除
- 容量監視アラート

### 3. ブラウザ互換性

**リスク:** IndexedDB 非対応ブラウザ
**対策:**

- 機能検出によるフォールバック
- メモリキャッシュへの切り替え
- グレースフルデグラデーション

## モニタリング

```javascript
class CacheMetrics {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.errors = 0;
  }

  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  getCacheSize() {
    // IndexedDBの使用容量を計算
    return navigator.storage.estimate();
  }

  generateReport() {
    return {
      hitRate: this.getHitRate(),
      totalRequests: this.hits + this.misses,
      cacheSize: this.getCacheSize(),
      evictions: this.evictions,
      errors: this.errors,
    };
  }
}
```

## 結論

DAO 向けにカスタマイズされた RPC キャッシュ戦略により、ギャラリー表示やフィルタリング機能のパフォーマンスを大幅に改善できます。特に作者別表示や NFT/SBT 分類表示において、優れたユーザー体験を提供しながら、RPC コストを削減することが可能です。

## 次のステップ

1. このキャッシュ戦略の承認
2. プロトタイプ実装とベンチマーク
3. 段階的な本番環境への展開
4. 継続的なモニタリングと最適化
