import { ethers } from "ethers";
import { walletManager } from "./wallet";
import { CHAIN_CONFIG, CONTRACT_ADDRESSES } from "./config";
import NFT_ABI from "./NFT_ABI";
import {
  createCachedProvider,
  createCachedContract,
} from "./cache/cachedProvider";
import { indexedDbCache } from "./cache/indexedDbCache";

class NFTContract {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.cache = indexedDbCache;
  }

  async initialize() {
    try {
      // NFTページでは常にRPCプロバイダーを使用（読み取り専用）
      console.log("Initializing NFT contract with cached RPC provider");

      // キャッシュ対応のプロバイダーを作成
      this.provider = createCachedProvider(CHAIN_CONFIG.rpcUrls[0], {
        contractAddress: CONTRACT_ADDRESSES.ONCHAIN88_NFT,
        logCacheHits: true,
      });

      // キャッシュ対応のコントラクトを作成
      this.contract = createCachedContract(
        CONTRACT_ADDRESSES.ONCHAIN88_NFT,
        NFT_ABI,
        this.provider
      );

      console.log("Connected to:", CHAIN_CONFIG.chainName);
      console.log("NFT Contract:", CONTRACT_ADDRESSES.ONCHAIN88_NFT);

      // コントラクトの存在確認
      try {
        const name = await this.contract.name();
        console.log("Contract name:", name);
        return true;
      } catch (err) {
        console.error("Contract not found or ABI mismatch:", err);
        return false;
      }
    } catch (error) {
      console.error("Failed to initialize NFT contract:", error);
      return false;
    }
  }

  async fetchUserNFTs(address) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      // Get user's NFT balance
      const balance = await this.contract.balanceOf(address);
      const balanceNumber = Number(balance);
      const nfts = [];

      // Fetch each NFT owned by the user
      for (let i = 0; i < balanceNumber; i++) {
        const tokenId = await this.contract.tokenOfOwnerByIndex(address, i);
        console.log(`Fetching NFT #${tokenId}`);

        let tokenURI = "";
        let metadata = {};

        try {
          tokenURI = await this.contract.tokenURI(tokenId);
          console.log(`Token URI for #${tokenId}:`, tokenURI);
        } catch (err) {
          console.error(`Failed to get tokenURI for #${tokenId}:`, err);
          // Use default metadata if tokenURI fails
          metadata = {
            name: `onchain88 NFT #${tokenId}`,
            description: "onchain88 NFT",
            image: "./assets/logo.svg",
          };
        }

        const isLocked = await this.contract.isLocked(tokenId);
        const creator = await this.contract.tokenCreator(tokenId);

        // Parse metadata from tokenURI if available
        if (tokenURI) {
          try {
            if (tokenURI.startsWith("data:application/json;base64,")) {
              const base64Data = tokenURI.split(",")[1];
              const jsonString = atob(base64Data);
              metadata = JSON.parse(jsonString);
            } else if (
              tokenURI.startsWith("http") ||
              tokenURI.startsWith("ipfs://")
            ) {
              console.log(`External URI detected: ${tokenURI}`);

              // Arweaveの場合は直接フェッチを試みる
              if (tokenURI.includes("arweave.net")) {
                try {
                  const response = await fetch(tokenURI);
                  if (response.ok) {
                    metadata = await response.json();
                    console.log(`Fetched metadata from Arweave:`, metadata);
                  } else {
                    throw new Error("Failed to fetch from Arweave");
                  }
                } catch (fetchErr) {
                  console.error(
                    "Failed to fetch metadata from Arweave:",
                    fetchErr
                  );
                  metadata = {
                    name: `onchain88 NFT #${tokenId}`,
                    description: "onchain88 NFT",
                    image: "./assets/logo.svg",
                  };
                }
              } else {
                // その他の外部URI
                metadata = {
                  name: `onchain88 NFT #${tokenId}`,
                  description: "onchain88 NFT",
                  image: "./assets/logo.svg",
                };
              }
            } else {
              // Plain JSON string
              metadata = JSON.parse(tokenURI);
            }
          } catch (err) {
            console.error("Failed to parse metadata:", err);
            metadata = {
              name: `onchain88 NFT #${tokenId}`,
              description: "onchain88 NFT",
              image: "./assets/logo.svg",
            };
          }
        }

        nfts.push({
          tokenId: tokenId.toString(),
          name: metadata.name || `onchain88 NFT #${tokenId}`,
          description: metadata.description || "",
          image: metadata.image || "/assets/logo.svg",
          isLocked,
          creator,
          tokenURI,
        });
      }

      return nfts;
    } catch (error) {
      console.error("Failed to fetch user NFTs:", error);
      return [];
    }
  }

  async fetchAllNFTs(limit = 50) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      // ギャラリーキャッシュをチェック
      const galleryCache = await this.cache.getGalleryCache("all");
      if (galleryCache && galleryCache.data.length >= limit) {
        console.log("Gallery cache HIT - returning cached NFTs");
        return galleryCache.data.slice(0, limit);
      }

      const totalSupply = await this.contract.totalSupply();
      const nfts = [];
      // Convert BigInt to number for comparison
      const totalSupplyNumber = Number(totalSupply);
      const maxToFetch = Math.min(totalSupplyNumber, limit);

      // バッチ処理で並列化
      const batchSize = 10;
      const promises = [];

      // Fetch recent NFTs (from newest to oldest)
      for (
        let i = totalSupplyNumber - 1;
        i >= totalSupplyNumber - maxToFetch && i >= 0;
        i -= batchSize
      ) {
        const batchPromises = [];

        for (
          let j = i;
          j > i - batchSize && j >= totalSupplyNumber - maxToFetch && j >= 0;
          j--
        ) {
          batchPromises.push(this.fetchSingleNFT(j));
        }

        promises.push(Promise.all(batchPromises));
      }

      // すべてのバッチを並列実行
      const batchResults = await Promise.all(promises);
      for (const batch of batchResults) {
        nfts.push(...batch.filter((nft) => nft !== null));
      }

      // ギャラリーキャッシュに保存
      await this.cache.setGalleryCache("all", nfts);

      return nfts;
    } catch (error) {
      console.error("Failed to fetch all NFTs:", error);
      return [];
    }
  }

  async fetchSingleNFT(index) {
    try {
      const tokenId = await this.contract.tokenByIndex(index);
      console.log(`Fetching NFT at index ${index}, tokenId: ${tokenId}`);

      // 並列でデータを取得
      const [owner, isLocked, creator, tokenURI] = await Promise.all([
        this.contract.ownerOf(tokenId),
        this.contract.isLocked(tokenId),
        this.contract.tokenCreator(tokenId),
        this.contract.tokenURI(tokenId).catch(() => ""),
      ]);

      // メタデータのパース（キャッシュ対応）
      const metadata = await this.parseTokenMetadata(tokenURI, tokenId);

      return {
        tokenId: tokenId.toString(),
        name: metadata.name || `onchain88 NFT #${tokenId}`,
        description: metadata.description || "",
        image: metadata.image || "/assets/logo.svg",
        owner,
        creator,
        isLocked,
        tokenURI,
      };
    } catch (err) {
      console.error(`Failed to fetch NFT at index ${index}:`, err);
      return null;
    }
  }

  async parseTokenMetadata(tokenURI, tokenId) {
    if (!tokenURI) {
      return {
        name: `onchain88 NFT #${tokenId}`,
        description: "onchain88 NFT",
        image: "./assets/logo.svg",
      };
    }

    // メタデータキャッシュをチェック
    const cachedMetadata = await this.cache.getMetadataCache(tokenURI);
    if (cachedMetadata) {
      console.log(`Metadata cache HIT for tokenId ${tokenId}`);
      return cachedMetadata;
    }

    let metadata = {};

    try {
      if (tokenURI.startsWith("data:application/json;base64,")) {
        const base64Data = tokenURI.split(",")[1];
        const jsonString = atob(base64Data);
        metadata = JSON.parse(jsonString);
      } else if (
        tokenURI.startsWith("http") ||
        tokenURI.startsWith("ipfs://")
      ) {
        console.log(`External URI detected: ${tokenURI}`);

        // Arweaveの場合は直接フェッチを試みる
        if (tokenURI.includes("arweave.net")) {
          try {
            const response = await fetch(tokenURI);
            if (response.ok) {
              metadata = await response.json();
              console.log(`Fetched metadata from Arweave:`, metadata);
            } else {
              throw new Error("Failed to fetch from Arweave");
            }
          } catch (fetchErr) {
            console.error("Failed to fetch metadata from Arweave:", fetchErr);
            metadata = {
              name: `onchain88 NFT #${tokenId}`,
              description: "onchain88 NFT",
              image: "./assets/logo.svg",
            };
          }
        } else {
          // その他の外部URI
          metadata = {
            name: `onchain88 NFT #${tokenId}`,
            description: "onchain88 NFT",
            image: "./assets/logo.svg",
          };
        }
      } else {
        // Plain JSON string
        metadata = JSON.parse(tokenURI);
      }
    } catch (err) {
      console.error("Failed to parse metadata:", err);
      metadata = {
        name: `onchain88 NFT #${tokenId}`,
        description: "onchain88 NFT",
        image: "./assets/logo.svg",
      };
    }

    // メタデータをキャッシュに保存
    await this.cache.setMetadataCache(tokenURI, metadata);
    return metadata;
  }

  async getContractInfo() {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const [name, symbol, totalSupply, mintFee] = await Promise.all([
        this.contract.name(),
        this.contract.symbol(),
        this.contract.totalSupply(),
        this.contract.mintFee(),
      ]);

      return {
        name,
        symbol,
        totalSupply: totalSupply.toString(),
        mintFee: ethers.formatEther(mintFee),
        address: CONTRACT_ADDRESSES.ONCHAIN88_NFT,
      };
    } catch (error) {
      console.error("Failed to get contract info:", error);
      return null;
    }
  }
}

export const nftContract = new NFTContract();
