// onchain88 RPC Cache Implementation

import { IndexedDBWrapper } from "./indexedDBWrapper.js";
import { CACHE_CONFIG, getTTL, shouldCache } from "./config.js";

export class IndexedDbCache {
  constructor() {
    this.db = new IndexedDBWrapper(CACHE_CONFIG.dbName, CACHE_CONFIG.version);
    this.initialized = false;
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      errors: 0,
    };

    // Start periodic cleanup
    this.startCleanupTimer();
  }

  async init() {
    if (this.initialized) return;

    try {
      await this.db.init();
      this.initialized = true;
      console.log("onchain88 Cache initialized");
    } catch (error) {
      console.error("Failed to initialize cache:", error);
      this.metrics.errors++;
    }
  }

  generateKey(method, params, contractAddress = "") {
    // Import CHAIN_CONFIG or use default
    const chainId = "21201";
    const paramsStr = JSON.stringify(params || {});
    return `${chainId}:${contractAddress}:${method}:${paramsStr}`;
  }

  async get(key) {
    await this.init();

    try {
      const entry = await this.db.get("cache", key);

      if (!entry) {
        this.metrics.misses++;
        return null;
      }

      // Check expiry
      if (entry.expiry && entry.expiry < Date.now()) {
        await this.db.delete("cache", key);
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      return entry;
    } catch (error) {
      console.error("Cache get error:", error);
      this.metrics.errors++;
      return null;
    }
  }

  async set(key, value, method) {
    await this.init();

    try {
      const ttl = getTTL(method);
      const now = Date.now();
      const size = JSON.stringify(value).length;

      const entry = {
        key,
        value,
        timestamp: now,
        expiry: ttl === null ? null : now + ttl,
        category: this.categorizeMethod(method),
        size,
        method,
      };

      await this.db.set("cache", entry);

      // Check cache size and evict if necessary
      await this.checkCacheSize();
    } catch (error) {
      console.error("Cache set error:", error);
      this.metrics.errors++;
    }
  }

  async delete(key) {
    await this.init();

    try {
      await this.db.delete("cache", key);
    } catch (error) {
      console.error("Cache delete error:", error);
      this.metrics.errors++;
    }
  }

  async deletePattern(pattern) {
    await this.init();

    try {
      const entries = await this.db.getAll("cache");
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));

      for (const entry of entries) {
        if (regex.test(entry.key)) {
          await this.db.delete("cache", entry.key);
        }
      }
    } catch (error) {
      console.error("Cache delete pattern error:", error);
      this.metrics.errors++;
    }
  }

  // Gallery-specific caching
  async getGalleryCache(creator) {
    await this.init();

    try {
      const entry = await this.db.get("gallery_cache", creator);

      if (!entry) return null;

      // Check if gallery cache is still valid (5 minutes)
      if (Date.now() - entry.lastUpdated > 300000) {
        await this.db.delete("gallery_cache", creator);
        return null;
      }

      return entry;
    } catch (error) {
      console.error("Gallery cache get error:", error);
      return null;
    }
  }

  async setGalleryCache(creator, data) {
    await this.init();

    try {
      const entry = {
        creator,
        data,
        lastUpdated: Date.now(),
      };

      await this.db.set("gallery_cache", entry);
    } catch (error) {
      console.error("Gallery cache set error:", error);
    }
  }

  async deleteGalleryCache(creator) {
    await this.init();

    try {
      await this.db.delete("gallery_cache", creator);
    } catch (error) {
      console.error("Gallery cache delete error:", error);
    }
  }

  // Metadata caching for external URIs
  async getMetadataCache(uri) {
    await this.init();

    try {
      const entry = await this.db.get("metadata_cache", uri);

      if (!entry) return null;

      // Metadata cache valid for 1 hour
      if (Date.now() - entry.lastFetched > 3600000) {
        await this.db.delete("metadata_cache", uri);
        return null;
      }

      return entry.metadata;
    } catch (error) {
      console.error("Metadata cache get error:", error);
      return null;
    }
  }

  async setMetadataCache(uri, metadata) {
    await this.init();

    try {
      const entry = {
        uri,
        metadata,
        lastFetched: Date.now(),
      };

      await this.db.set("metadata_cache", entry);
    } catch (error) {
      console.error("Metadata cache set error:", error);
    }
  }

  // Handle token burn
  async handleTokenBurn(tokenId, creator) {
    await this.init();

    try {
      // Delete specific token caches
      await this.deletePattern(`*:tokenURI:*"tokenId":"${tokenId}"*`);
      await this.deletePattern(`*:ownerOf:*"tokenId":"${tokenId}"*`);
      await this.deletePattern(`*:tokenLocked:*"${tokenId}"*`);

      // Delete aggregate caches
      await this.deletePattern("*:totalSupply:*");
      await this.deletePattern("*:TokenCount:*");
      await this.deletePattern(`*:creatorTokens:*"${creator}"*`);

      // Delete gallery cache for creator
      await this.deleteGalleryCache(creator);

      console.log(`Cache cleared for burned token ${tokenId}`);
    } catch (error) {
      console.error("Error handling token burn:", error);
    }
  }

  // Cache management
  async checkCacheSize() {
    try {
      const size = await this.db.getCacheSize();

      if (size > CACHE_CONFIG.maxCacheSize) {
        // Delete oldest non-permanent entries
        const targetSize = CACHE_CONFIG.maxCacheSize * 0.8; // Keep 80% after cleanup
        const deleted = await this.db.deleteOldestEntries("cache", targetSize);
        this.metrics.evictions += deleted;
        console.log(`Evicted ${deleted} entries to maintain cache size`);
      }
    } catch (error) {
      console.error("Error checking cache size:", error);
    }
  }

  startCleanupTimer() {
    setInterval(async () => {
      try {
        const deleted = await this.db.deleteExpired("cache");
        if (deleted > 0) {
          console.log(`Cleaned up ${deleted} expired cache entries`);
        }
      } catch (error) {
        console.error("Error during cache cleanup:", error);
      }
    }, CACHE_CONFIG.eviction.checkInterval);
  }

  categorizeMethod(method) {
    const categories = {
      permanent: [
        "name",
        "symbol",
        "MAX_ROYALTY_BPS",
        "burnHistory",
        "tokenLocked",
      ],
      longTerm: [
        "mintFee",
        "royaltyInfo",
        "creatorTokens",
        "normalTokens",
        "sbtTokens",
      ],
      mediumTerm: [
        "tokenURI",
        "creatorTokenCount",
        "normalTokenCount",
        "sbtTokenCount",
      ],
      shortTerm: ["totalSupply", "balanceOf", "ownerOf", "tokenByIndex"],
    };

    for (const [category, methods] of Object.entries(categories)) {
      if (methods.includes(method)) {
        return category;
      }
    }

    return "shortTerm";
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: hitRate.toFixed(2) + "%",
      totalRequests: total,
    };
  }

  async clearAll() {
    await this.init();

    try {
      await this.db.clear("cache");
      await this.db.clear("gallery_cache");
      await this.db.clear("metadata_cache");
      console.log("All caches cleared");
    } catch (error) {
      console.error("Error clearing caches:", error);
    }
  }
}

// Export singleton instance
export const indexedDbCache = new IndexedDbCache();
