// Environment-based configuration

// Development chain configuration
const DEVELOPMENT_CHAIN = {
  chainId: "0x52d1", // 21201 in hex
  chainName: "onchain88 Private Chain",
  nativeCurrency: {
    name: "DEV Token",
    symbol: "DEV",
    decimals: 18,
  },
  rpcUrls: ["https://dev2.bon-soleil.com/rpc"],
  blockExplorerUrls: [], // No block explorer for private chain
};

// Production chain configuration (Polygon Mainnet)
const PRODUCTION_CHAIN = {
  chainId: "0x89", // 137 in hex
  chainName: "Polygon Mainnet",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpcUrls: ["https://polygon-rpc.com/", "https://rpc-mainnet.maticvigil.com/"],
  blockExplorerUrls: ["https://polygonscan.com/"],
};

// Determine current environment
export const isDevelopment =
  import.meta.env.VITE_ENV === "development" || import.meta.env.DEV;

// Force private chain flag (set to true during development phase)
// TODO: Set to false when ready for production deployment on Polygon
export const FORCE_PRIVATE_CHAIN = true;

// Export the appropriate chain configuration
export const CHAIN_CONFIG =
  isDevelopment || FORCE_PRIVATE_CHAIN ? DEVELOPMENT_CHAIN : PRODUCTION_CHAIN;

// Contract addresses for different environments
const DEVELOPMENT_CONTRACTS = {
  ONCHAIN88_NFT:
    import.meta.env.VITE_ONCHAIN88_NFT_ADDRESS ||
    "0x56E37701C56fd5A3d22f7383899fe62A4f31Ae4D",
  MEMBER_CARD_SBT:
    import.meta.env.VITE_MEMBER_CARD_SBT_ADDRESS ||
    "0x166748e744195650a94FC32C64d8f0c9329f96F1",
  TBA_REGISTRY:
    import.meta.env.VITE_TBA_REGISTRY_ADDRESS ||
    "0x8dBdb7dDff2A33c252459712D517D58F8e9Eb65E",
  TBA_IMPLEMENTATION:
    import.meta.env.VITE_TBA_ACCOUNT_IMPLEMENTATION ||
    "0x5469941556cc350be591eDb950c196B5d034Ae13",
  DAO_SHOP:
    import.meta.env.VITE_DAO_SHOP_ADDRESS ||
    "0x3fbc25a55a2023834e3B7255554D14ED0b32D02B",
};

const PRODUCTION_CONTRACTS = {
  ONCHAIN88_NFT: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
  MEMBER_CARD_SBT: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
  TBA_REGISTRY: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
  TBA_IMPLEMENTATION: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
  DAO_SHOP: "0x0000000000000000000000000000000000000000", // TODO: Deploy and update
};

// TBA configuration
export const TBA_CONFIG = {
  DEFAULT_SALT: import.meta.env.VITE_TBA_DEFAULT_SALT
    ? parseInt(import.meta.env.VITE_TBA_DEFAULT_SALT)
    : 2,
  // You can add more TBA-related configurations here
  CHAIN_ID: parseInt(CHAIN_CONFIG.chainId, 16), // Convert hex to decimal for TBA
};

// Export contract addresses based on environment
export const CONTRACT_ADDRESSES =
  isDevelopment || FORCE_PRIVATE_CHAIN
    ? DEVELOPMENT_CONTRACTS
    : PRODUCTION_CONTRACTS;

// Backward compatibility - keep NFT_CONTRACT_ADDRESS for existing code
export const NFT_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.MEMBER_CARD_SBT;

// Helper functions
export function getExplorerUrl(hash, type = "tx") {
  if (
    !CHAIN_CONFIG.blockExplorerUrls ||
    CHAIN_CONFIG.blockExplorerUrls.length === 0
  ) {
    return null;
  }
  return `${CHAIN_CONFIG.blockExplorerUrls[0]}${type}/${hash}`;
}

export function getCurrencySymbol() {
  return CHAIN_CONFIG.nativeCurrency.symbol;
}
