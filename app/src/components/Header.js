import { walletManager } from "../wallet";
import { AddressDisplay } from "./AddressDisplay";
import {
  shouldShowMetaMaskRedirect,
  openInMetaMask,
} from "../utils/detectBrowser";

export class Header {
  constructor() {
    this.isConnected = false;
    this.isLoading = false;
    this.account = null;
  }

  async checkConnection() {
    if (typeof window.ethereum !== "undefined") {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        await this.connectWallet();
      }
    }
  }

  async connectWallet() {
    this.isLoading = true;
    this.render();

    try {
      const account = await walletManager.connect();
      this.isConnected = true;
      this.account = account;
      this.isLoading = false;
      this.render();

      // 接続成功を通知
      window.dispatchEvent(
        new CustomEvent("walletConnected", { detail: { account } })
      );
    } catch (error) {
      console.error("Connection error:", error);
      this.isLoading = false;
      this.render();

      // エラーを通知
      window.dispatchEvent(
        new CustomEvent("walletError", { detail: { error: error.message } })
      );
    }
  }

  async disconnectWallet() {
    walletManager.disconnect();
    this.isConnected = false;
    this.account = null;
    this.render();

    // 切断を通知
    window.dispatchEvent(new CustomEvent("walletDisconnected"));
  }

  toggleDropdown() {
    const dropdown = document.querySelector(".wallet-dropdown");
    if (dropdown) {
      dropdown.classList.toggle("show");
    }
  }

  render() {
    const headerEl = document.getElementById("app-header");
    if (!headerEl) return;

    // モバイルでMetaMask WebView外からのアクセスかチェック
    const showMetaMaskRedirect = shouldShowMetaMaskRedirect();

    // ロゴファイルの存在をチェック
    const logoFiles = ['/assets/logo.svg', '/assets/logo.jpg', '/assets/logo.png'];
    let logoHtml = '<h1>onchain88</h1>';
    
    // 画像の存在をチェックする関数
    const checkImage = async (url) => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    };

    // 非同期でロゴをチェックして更新
    (async () => {
      for (const logoFile of logoFiles) {
        if (await checkImage(logoFile)) {
          const logoElement = document.querySelector('.header-logo');
          if (logoElement) {
            logoElement.innerHTML = `<img src="${logoFile}" alt="onchain88" />`;
          }
          break;
        }
      }
    })();

    headerEl.innerHTML = `
      <div class="header-container">
        <div class="header-logo">
          ${logoHtml}
        </div>

        <div class="wallet-container">
          ${
            showMetaMaskRedirect
              ? `
            <button class="wallet-button metamask-icon-only" onclick="window.header.openInMetaMask()" title="MetaMaskで開く">
              <img src="/assets/metamaskicon.svg" alt="MetaMask" width="32" height="32" />
            </button>
          `
              : this.isConnected
              ? `
            <button class="wallet-button connected" onclick="window.header.toggleDropdown()">
              <span class="wallet-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor"/>
                </svg>
              </span>
              <span class="wallet-address">${walletManager.formatAddress(
                this.account
              )}</span>
              <span class="connection-status connected"></span>
            </button>
            <div class="wallet-dropdown">
              <div class="dropdown-item">
                <span class="dropdown-label">Connected</span>
                <span class="dropdown-value">${AddressDisplay.render(
                  this.account,
                  { showCopyIcon: true }
                )}</span>
              </div>
              <button class="dropdown-button disconnect" onclick="window.header.disconnectWallet()">
                Disconnect
              </button>
            </div>
          `
              : `
            <button class="wallet-button disconnected" onclick="window.header.connectWallet()" ${
              this.isLoading ? "disabled" : ""
            }>
              ${
                this.isLoading
                  ? `
                <span class="loading-spinner"></span>
                <span>Connecting...</span>
              `
                  : `
                <span class="wallet-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor"/>
                  </svg>
                </span>
                <span>Connect</span>
                <span class="connection-status disconnected"></span>
              `
              }
            </button>
          `
          }
        </div>
      </div>
    `;

    // クリック外でドロップダウンを閉じる
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".wallet-container")) {
        const dropdown = document.querySelector(".wallet-dropdown");
        if (dropdown) {
          dropdown.classList.remove("show");
        }
      }
    });
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      account: this.account,
    };
  }

  openInMetaMask() {
    openInMetaMask();
  }
}

export const header = new Header();
