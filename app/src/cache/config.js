// onchain88 RPC Cache Configuration

export const CACHE_CONFIG = {
  dbName: "indexedDb_rpc_cache",
  version: 1,

  // Cache TTL settings in milliseconds
  ttl: {
    // Permanent cache (null = never expires)
    permanent: {
      name: null,
      symbol: null,
      MAX_ROYALTY_BPS: null,
      burnHistory: null,
      tokenLocked: null,
    },

    // Long-term cache (1 hour)
    longTerm: {
      mintFee: 3600000,
      royaltyInfo: 3600000,
      creatorTokens: 3600000,
      normalTokens: 3600000,
      sbtTokens: 3600000,
      getContractInfo: 3600000,
    },

    // Medium-term cache (5 minutes)
    mediumTerm: {
      tokenURI: 300000,
      creatorTokenCount: 300000,
      normalTokenCount: 300000,
      sbtTokenCount: 300000,
      gallery: 300000,
      tokenCreator: 300000,
      isLocked: 300000,
    },

    // Short-term cache (30 seconds)
    shortTerm: {
      totalSupply: 30000,
      balanceOf: 30000,
      ownerOf: 30000,
      tokenOfOwnerByIndex: 30000,
      tokenByIndex: 30000,
    },
  },

  // Maximum cache size in bytes (50MB)
  maxCacheSize: 50 * 1024 * 1024,

  // Cache eviction settings
  eviction: {
    checkInterval: 300000, // Check every 5 minutes
    maxAge: 7 * 24 * 3600000, // Delete entries older than 7 days
  },
};

// Get TTL for a specific method
export function getTTL(method) {
  for (const [duration, methods] of Object.entries(CACHE_CONFIG.ttl)) {
    if (method in methods) {
      return methods[method];
    }
  }
  // Default to short-term cache if method not found
  return 30000;
}

// Check if a method should be cached
export function shouldCache(method) {
  const noCacheMethods = [
    "eth_sendTransaction",
    "eth_sendRawTransaction",
    "eth_getTransactionReceipt",
    "eth_getTransactionByHash",
    "personal_sign",
    "eth_sign",
  ];

  return !noCacheMethods.includes(method);
}
