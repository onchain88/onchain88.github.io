// onchain88 Cache Module - Main Export File

export { IndexedDbCache, indexedDbCache } from "./indexedDbCache.js";
export {
  CachedJsonRpcProvider,
  createCachedProvider,
  createCachedContract,
} from "./cachedProvider.js";
export { CACHE_CONFIG, getTTL, shouldCache } from "./config.js";

// Cache management utilities
export const cacheUtils = {
  // Clear all caches
  async clearAll() {
    const { indexedDbCache } = await import("./indexedDbCache.js");
    return indexedDbCache.clearAll();
  },

  // Get cache metrics
  async getMetrics() {
    const { indexedDbCache } = await import("./indexedDbCache.js");
    return indexedDbCache.getMetrics();
  },

  // Handle token burn
  async handleBurn(tokenId, creator) {
    const { indexedDbCache } = await import("./indexedDbCache.js");
    return indexedDbCache.handleTokenBurn(tokenId, creator);
  },
};
