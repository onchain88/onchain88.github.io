import { ethers } from "ethers";
import { walletManager } from "./wallet";
import { CHAIN_CONFIG, CONTRACT_ADDRESSES } from "./config";
import DaoShop_ABI from "./DaoShop_ABI";
import {
  createCachedProvider,
  createCachedContract,
} from "./cache/cachedProvider";
import { indexedDbCache } from "./cache/indexedDbCache";

class DaoShopContract {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.cache = indexedDbCache;
  }

  async initialize() {
    try {
      console.log("Initializing DaoShop contract with cached RPC provider");

      // キャッシュ対応のプロバイダーを作成
      this.provider = createCachedProvider(CHAIN_CONFIG.rpcUrls[0], {
        contractAddress: CONTRACT_ADDRESSES.DAO_SHOP,
        logCacheHits: true,
      });

      // キャッシュ対応のコントラクトを作成
      this.contract = createCachedContract(
        CONTRACT_ADDRESSES.DAO_SHOP,
        DaoShop_ABI,
        this.provider
      );

      console.log("Connected to:", CHAIN_CONFIG.chainName);
      console.log("DaoShop Contract:", CONTRACT_ADDRESSES.DAO_SHOP);

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
      console.error("Failed to initialize DaoShop contract:", error);
      return false;
    }
  }

  async createItem(title, detail, imageUrl, tokenInfo, contact, price, status) {
    try {
      if (!walletManager.isConnected()) {
        throw new Error("Wallet not connected");
      }

      const provider = new ethers.BrowserProvider(walletManager.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.DAO_SHOP,
        DaoShop_ABI,
        signer
      );

      const tx = await contract.createItem(
        title,
        detail,
        imageUrl,
        tokenInfo,
        contact,
        price,
        status
      );

      const receipt = await tx.wait();

      // ItemCreatedイベントからtokenIdを取得
      const event = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "ItemCreated");

      const tokenId = event ? event.args.tokenId.toString() : "unknown";
      return tokenId;
    } catch (error) {
      console.error("Failed to create item:", error);
      throw error;
    }
  }

  async updateItem(
    tokenId,
    title,
    detail,
    imageUrl,
    tokenInfo,
    contact,
    price,
    status
  ) {
    try {
      if (!walletManager.isConnected()) {
        throw new Error("Wallet not connected");
      }

      const provider = new ethers.BrowserProvider(walletManager.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.DAO_SHOP,
        DaoShop_ABI,
        signer
      );

      const tx = await contract.updateItem(
        tokenId,
        title,
        detail,
        imageUrl,
        tokenInfo,
        contact,
        price,
        status
      );

      await tx.wait();
      return true;
    } catch (error) {
      console.error("Failed to update item:", error);
      throw error;
    }
  }

  async getItem(tokenId) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const item = await this.contract.items(tokenId);
      return {
        title: item.title,
        detail: item.detail,
        imageUrl: item.imageUrl,
        tokenInfo: item.tokenInfo,
        contact: item.contact,
        price: item.price,
        status: item.status,
        creator: item.creator,
      };
    } catch (error) {
      console.error("Failed to get item:", error);
      throw error;
    }
  }

  async fetchAllItems(limit = 50) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      // ERC721のenumerationインターフェースがある場合
      const totalSupply = await this.contract.totalSupply();
      const items = [];
      const totalSupplyNumber = Number(totalSupply);
      const maxToFetch = Math.min(totalSupplyNumber, limit);

      // バッチ処理で並列化
      const batchSize = 10;
      const promises = [];

      // 最新のアイテムから取得
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
          batchPromises.push(this.fetchSingleItem(j));
        }

        promises.push(Promise.all(batchPromises));
      }

      // すべてのバッチを並列実行
      const batchResults = await Promise.all(promises);
      for (const batch of batchResults) {
        items.push(...batch.filter((item) => item !== null));
      }

      return items;
    } catch (error) {
      console.error("Failed to fetch all items:", error);
      return [];
    }
  }

  async fetchSingleItem(index) {
    try {
      const tokenId = await this.contract.tokenByIndex(index);
      console.log(`Fetching item at index ${index}, tokenId: ${tokenId}`);

      const item = await this.getItem(tokenId);
      return {
        tokenId: tokenId.toString(),
        ...item,
      };
    } catch (err) {
      console.error(`Failed to fetch item at index ${index}:`, err);
      return null;
    }
  }

  async fetchUserItems(address) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      // ユーザーが作成したアイテム数を取得
      const creatorCount = await this.contract.creatorTokenCount(address);
      const creatorCountNumber = Number(creatorCount);
      const items = [];

      // 各アイテムを取得
      for (let i = 0; i < creatorCountNumber; i++) {
        const tokenId = await this.contract.tokenOfCreatorByIndex(address, i);
        console.log(`Fetching creator item #${tokenId}`);

        const item = await this.getItem(tokenId);
        items.push({
          tokenId: tokenId.toString(),
          ...item,
        });
      }

      return items;
    } catch (error) {
      console.error("Failed to fetch user items:", error);
      return [];
    }
  }
}

export const daoShopContract = new DaoShopContract();
