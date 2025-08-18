// Cached JSON-RPC Provider for onchain88

import { ethers } from "ethers";
import { indexedDbCache } from "./indexedDbCache.js";
import { shouldCache } from "./config.js";

export class CachedJsonRpcProvider extends ethers.JsonRpcProvider {
  constructor(url, network, options = {}) {
    super(url, network);
    this.cache = indexedDbCache;
    this.contractAddress = options.contractAddress || "";
    this.enableCache = options.enableCache !== false; // Default to true
    this.logCacheHits = options.logCacheHits || false;
  }

  async send(method, params) {
    // Check if caching should be used for this method
    if (!this.enableCache || !shouldCache(method)) {
      return super.send(method, params);
    }

    // Generate cache key
    const cacheKey = this.cache.generateKey(
      method,
      params,
      this.contractAddress
    );

    // Try to get from cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      if (this.logCacheHits) {
        console.log(`Cache HIT: ${method}`, params);
      }
      return cached.value;
    }

    // Make actual RPC call
    try {
      const result = await super.send(method, params);

      // Extract method name from eth_call params if applicable
      let cacheMethod = method;
      if (method === "eth_call" && params[0]?.data) {
        cacheMethod = this.extractMethodFromCallData(params[0].data);
      }

      // Cache the result
      await this.cache.set(cacheKey, result, cacheMethod);

      return result;
    } catch (error) {
      console.error(`RPC call failed: ${method}`, error);
      throw error;
    }
  }

  // Extract method name from eth_call data
  extractMethodFromCallData(data) {
    // Common onchain88 contract method signatures
    const methodSignatures = {
      "0x06fdde03": "name",
      "0x95d89b41": "symbol",
      "0x13faede6": "mintFee",
      "0x18160ddd": "totalSupply",
      "0x70a08231": "balanceOf",
      "0x6352211e": "ownerOf",
      "0xc87b56dd": "tokenURI",
      "0x2f745c59": "tokenOfOwnerByIndex",
      "0x4f6ccce7": "tokenByIndex",
      "0x2a55205a": "royaltyInfo",
      "0xd9b137b2": "tokenCreator",
      "0xe45be8eb": "creatorTokenCount",
      "0x99f98898": "creatorTokens",
      "0x5b88183f": "normalTokenCount",
      "0x92e3cc2d": "normalTokens",
      "0x6d5224dc": "sbtTokenCount",
      "0x1865c57d": "sbtTokens",
      "0xb2383e55": "isLocked",
      "0xa035b1fe": "tokenLocked",
      "0x69d89575": "burn",
      "0x0076de2f": "burnHistory",
      "0x1b2ef1ca": "getContractInfo",
    };

    const methodId = data.slice(0, 10).toLowerCase();
    return methodSignatures[methodId] || "unknown";
  }

  // Clear cache for specific patterns
  async clearCache(pattern) {
    await this.cache.deletePattern(pattern);
  }

  // Get cache metrics
  getCacheMetrics() {
    return this.cache.getMetrics();
  }

  // Enable/disable caching at runtime
  setCacheEnabled(enabled) {
    this.enableCache = enabled;
  }
}

// Factory function to create cached providers
export function createCachedProvider(url, options = {}) {
  const network = options.network || null;
  return new CachedJsonRpcProvider(url, network, options);
}

// Wrapper for contracts to add caching
export function createCachedContract(
  address,
  abi,
  signerOrProvider,
  options = {}
) {
  let provider = signerOrProvider;

  // If it's a signer, get its provider
  if (signerOrProvider.provider) {
    provider = signerOrProvider.provider;
  }

  // Create cached provider if not already cached
  if (!(provider instanceof CachedJsonRpcProvider)) {
    const rpcUrl = provider.connection?.url || window.CHAIN_CONFIG?.rpcUrls[0];
    const cachedProvider = createCachedProvider(rpcUrl, {
      ...options,
      contractAddress: address,
    });

    // If original was a signer, create new signer with cached provider
    if (signerOrProvider.provider) {
      provider = signerOrProvider.connect(cachedProvider);
    } else {
      provider = cachedProvider;
    }
  }

  return new ethers.Contract(address, abi, provider);
}
