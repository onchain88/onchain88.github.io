import { ethers } from 'ethers';
import { CHAIN_CONFIG } from './config';

class WalletManager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.ethereum = null;
  }

  async connect() {
    try {
      console.log('WalletManager: Starting connection...');
      
      // MetaMaskが利用可能かチェック
      if (!window.ethereum) {
        throw new Error('MetaMaskがインストールされていません。');
      }

      this.ethereum = window.ethereum;
      
      // 現在のチェーンIDを確認
      const currentChainId = await this.ethereum.request({ method: 'eth_chainId' });
      console.log('Current chain ID:', currentChainId);
      console.log('Expected chain ID:', CHAIN_CONFIG.chainId);
      
      // アカウントをリクエスト
      const accounts = await this.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      console.log('Connected account:', accounts[0]);

      this.provider = new ethers.BrowserProvider(this.ethereum);
      this.signer = await this.provider.getSigner();
      this.account = accounts[0];

      // チェーンの切り替え
      await this.switchToCorrectChain();

      // イベントリスナーの設定
      this.setupEventListeners();

      console.log('WalletManager: Connection successful');
      return this.account;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  setupEventListeners() {
    if (!this.ethereum) return;

    // アカウント変更の監視
    this.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.account = accounts[0];
        window.location.reload();
      }
    });

    // チェーン変更の監視
    this.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
  }

  async switchToCorrectChain() {
    try {
      const chainId = await this.ethereum.request({ method: 'eth_chainId' });
      console.log('switchToCorrectChain - Current:', chainId, 'Expected:', CHAIN_CONFIG.chainId);
      
      if (chainId !== CHAIN_CONFIG.chainId) {
        console.log('Switching to chain:', CHAIN_CONFIG.chainName);
        try {
          await this.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_CONFIG.chainId }],
          });
          console.log('Chain switched successfully');
        } catch (switchError) {
          console.log('Switch error code:', switchError.code);
          // チェーンが追加されていない場合
          if (switchError.code === 4902) {
            console.log('Adding new chain:', CHAIN_CONFIG);
            await this.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [CHAIN_CONFIG],
            });
            console.log('Chain added successfully');
          } else {
            throw switchError;
          }
        }
      } else {
        console.log('Already on correct chain');
      }
    } catch (error) {
      console.error('Error switching chain:', error);
      throw error;
    }
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.ethereum = null;
  }

  getAccount() {
    return this.account;
  }

  getSigner() {
    return this.signer;
  }

  getProvider() {
    return this.provider;
  }

  isConnected() {
    return this.account !== null;
  }

  formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}

export const walletManager = new WalletManager();