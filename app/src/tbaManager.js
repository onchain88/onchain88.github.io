import { ethers } from "ethers";
import { CHAIN_CONFIG, CONTRACT_ADDRESSES, TBA_CONFIG } from "./config";
import { walletManager } from "./wallet";
import ERC6551Registry_ABI from "./ERC6551Registry_ABI";
import NFT_ABI from "./NFT_ABI";

class TBAManager {
  constructor() {
    this.registryContract = null;
    this.provider = null;
    this.nftContract = null;
  }

  async initialize() {
    try {
      // 読み取り専用プロバイダーを初期化
      this.provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrls[0]);

      // Check if TBA Registry address is valid
      console.log("TBA Registry address:", CONTRACT_ADDRESSES.TBA_REGISTRY);
      if (
        CONTRACT_ADDRESSES.TBA_REGISTRY ===
        "0x0000000000000000000000000000000000000000"
      ) {
        console.warn("TBA Registry not deployed yet");
        return false;
      }

      // Registry契約を初期化
      this.registryContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TBA_REGISTRY,
        ERC6551Registry_ABI,
        this.provider
      );

      // Check if registry contract exists
      const code = await this.provider.getCode(CONTRACT_ADDRESSES.TBA_REGISTRY);
      console.log("TBA Registry contract code length:", code.length);
      if (code === "0x") {
        console.warn(
          "TBA Registry contract not found at address:",
          CONTRACT_ADDRESSES.TBA_REGISTRY
        );
        return false;
      }

      // NFT契約を初期化（TBA内のNFTを確認するため）
      this.nftContract = new ethers.Contract(
        CONTRACT_ADDRESSES.ONCHAIN88_NFT,
        NFT_ABI,
        this.provider
      );

      console.log("TBA Manager initialized");
      return true;
    } catch (error) {
      console.error("Failed to initialize TBA Manager:", error);
      return false;
    }
  }

  // TBAアドレスを計算（作成前でも確認可能）
  async getTBAAddress(tokenContract, tokenId) {
    try {
      if (!this.registryContract) {
        await this.initialize();
      }

      const address = await this.registryContract.account(
        CONTRACT_ADDRESSES.TBA_IMPLEMENTATION,
        TBA_CONFIG.CHAIN_ID,
        tokenContract,
        tokenId,
        TBA_CONFIG.DEFAULT_SALT
      );

      return address;
    } catch (error) {
      console.error("Failed to get TBA address:", error);
      return null;
    }
  }

  // TBAを作成
  async createTBA(tokenContract, tokenId) {
    try {
      if (!walletManager.isConnected()) {
        throw new Error("Wallet not connected");
      }

      const signer = walletManager.getSigner();
      const registryWithSigner = new ethers.Contract(
        CONTRACT_ADDRESSES.TBA_REGISTRY,
        ERC6551Registry_ABI,
        signer
      );

      // First check if TBA already exists
      const existingTBA = await this.getTBAAddress(tokenContract, tokenId);
      const exists = await this.isTBACreated(tokenContract, tokenId);

      if (exists) {
        console.log("TBA already exists at:", existingTBA);
        return existingTBA;
      }

      console.log("Creating TBA with params:", {
        implementation: CONTRACT_ADDRESSES.TBA_IMPLEMENTATION,
        chainId: TBA_CONFIG.CHAIN_ID,
        tokenContract,
        tokenId: tokenId.toString(),
        salt: TBA_CONFIG.DEFAULT_SALT,
      });

      // Check implementation contract exists
      const implCode = await this.provider.getCode(
        CONTRACT_ADDRESSES.TBA_IMPLEMENTATION
      );
      console.log("Implementation contract code length:", implCode.length);
      if (implCode === "0x") {
        throw new Error("TBA Implementation contract not found");
      }

      // Check if user is the owner of the NFT
      const owner = await this.nftContract.ownerOf(tokenId);
      const currentUser = await signer.getAddress();

      if (owner.toLowerCase() !== currentUser.toLowerCase()) {
        throw new Error("You must be the owner of this NFT to create a TBA");
      }

      // Check what address will be created
      const predictedAddress = await registryWithSigner.account(
        CONTRACT_ADDRESSES.TBA_IMPLEMENTATION,
        TBA_CONFIG.CHAIN_ID,
        tokenContract,
        tokenId,
        TBA_CONFIG.DEFAULT_SALT
      );
      console.log("Predicted TBA address:", predictedAddress);

      // Check if there's already code at that address
      const existingCode = await this.provider.getCode(predictedAddress);
      console.log("Code at predicted address:", existingCode.length);

      // If TBA already exists, just return the address
      if (existingCode.length > 2) {
        console.log("TBA already exists at:", predictedAddress);
        return predictedAddress;
      }

      // createAccountには initData パラメータが必要
      const initData = "0x"; // 空のバイト配列

      const tx = await registryWithSigner.createAccount(
        CONTRACT_ADDRESSES.TBA_IMPLEMENTATION,
        TBA_CONFIG.CHAIN_ID,
        tokenContract,
        tokenId,
        TBA_CONFIG.DEFAULT_SALT,
        initData,
        { gasLimit: 500000 } // 固定ガス制限
      );

      console.log("Creating TBA, tx:", tx.hash);
      const receipt = await tx.wait();

      // AccountCreatedイベントからTBAアドレスを取得
      const event = receipt.logs
        .map((log) => {
          try {
            return registryWithSigner.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "AccountCreated");

      if (event) {
        console.log("TBA created at:", event.args.account);
        return event.args.account;
      }

      // イベントが見つからない場合は、アドレスを計算して返す
      return await this.getTBAAddress(tokenContract, tokenId);
    } catch (error) {
      console.error("Failed to create TBA:", error);
      throw error;
    }
  }

  // TBAが既に存在するかチェック
  async isTBACreated(tokenContract, tokenId) {
    try {
      const tbaAddress = await this.getTBAAddress(tokenContract, tokenId);
      if (!tbaAddress || tbaAddress === ethers.ZeroAddress) {
        return false;
      }

      // アドレスにコードが存在するかチェック
      const code = await this.provider.getCode(tbaAddress);
      // "0x"の長さは2なので、それより長い場合はコントラクトが存在する
      return code.length > 2;
    } catch (error) {
      console.error("Failed to check TBA existence:", error);
      return false;
    }
  }

  // TBA内のonchain88NFTを取得
  async getTBANFTs(tbaAddress) {
    try {
      if (!this.nftContract) {
        await this.initialize();
      }

      const balance = await this.nftContract.balanceOf(tbaAddress);
      const balanceNumber = Number(balance);
      const nfts = [];

      for (let i = 0; i < balanceNumber; i++) {
        try {
          const tokenId = await this.nftContract.tokenOfOwnerByIndex(
            tbaAddress,
            i
          );

          let tokenURI = "";
          let metadata = {};

          try {
            tokenURI = await this.nftContract.tokenURI(tokenId);

            if (tokenURI.startsWith("data:application/json;base64,")) {
              const base64Data = tokenURI.split(",")[1];
              const jsonString = atob(base64Data);
              metadata = JSON.parse(jsonString);
            } else if (tokenURI.includes("arweave.net")) {
              // Arweaveからメタデータを取得
              try {
                const response = await fetch(tokenURI);
                if (response.ok) {
                  metadata = await response.json();
                }
              } catch (fetchErr) {
                console.error(
                  "Failed to fetch metadata from Arweave:",
                  fetchErr
                );
              }
            }
          } catch (err) {
            console.error(`Failed to get tokenURI for #${tokenId}:`, err);
          }

          // デフォルトメタデータ
          if (!metadata.name) {
            metadata = {
              name: `onchain88 NFT #${tokenId}`,
              description: "onchain88 NFT",
              image: "./assets/logo.svg",
            };
          }

          const isLocked = await this.nftContract.isLocked(tokenId);
          const creator = await this.nftContract.tokenCreator(tokenId);

          nfts.push({
            tokenId: tokenId.toString(),
            name: metadata.name,
            description: metadata.description || "",
            image: metadata.image || "/assets/logo.svg",
            isLocked,
            creator,
            tokenURI,
          });
        } catch (err) {
          console.error(`Failed to fetch NFT #${i} in TBA:`, err);
        }
      }

      return nfts;
    } catch (error) {
      console.error("Failed to fetch TBA NFTs:", error);
      return [];
    }
  }
}

export const tbaManager = new TBAManager();
