import { header } from "../components/Header";
import { nftContract } from "../nftContract";
import { AddressDisplay } from "../components/AddressDisplay";
import { shouldShowMetaMaskRedirect } from "../utils/detectBrowser";

export class NftPage {
  constructor() {
    this.state = {
      isLoading: true,
      nfts: [],
      userNfts: [],
      filter: "all", // 'all', 'mine'
      contractInfo: null,
      error: null,
    };
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  async loadNFTs() {
    try {
      this.setState({ isLoading: true, error: null });

      const { isConnected, account } = header.getConnectionStatus();

      // Initialize contract
      const initialized = await nftContract.initialize();

      if (!initialized && !isConnected) {
        // ローカル環境でのCORSエラーの場合
        this.setState({
          isLoading: false,
          error:
            "ウォレットを接続してNFTを表示してください（ローカル環境ではCORSエラーが発生します）",
          nfts: [],
          userNfts: [],
          contractInfo: null,
        });
        return;
      }

      // Load contract info
      const contractInfo = await nftContract.getContractInfo();

      // Load all NFTs
      const allNfts = await nftContract.fetchAllNFTs(20);

      // Load user's NFTs if connected
      let userNfts = [];
      if (isConnected && account) {
        userNfts = await nftContract.fetchUserNFTs(account);
      }

      this.setState({
        isLoading: false,
        nfts: allNfts,
        userNfts,
        contractInfo,
      });
    } catch (error) {
      console.error("Failed to load NFTs:", error);
      this.setState({
        isLoading: false,
        error: "Failed to load NFT data. Please check your connection.",
      });
    }
  }

  setFilter(filter) {
    this.setState({ filter });
  }

  getFilteredNFTs() {
    if (this.state.filter === "mine") {
      return this.state.userNfts;
    }
    return this.state.nfts;
  }

  formatAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  render() {
    const pageContent = document.getElementById("page-content");
    if (!pageContent) return;

    const { isConnected } = header.getConnectionStatus();
    const filteredNFTs = this.getFilteredNFTs();
    const showMetaMaskLink = shouldShowMetaMaskRedirect();

    pageContent.innerHTML = `
      <div class="page nft-page">
        <div class="page-header">
          <h1>NFT Gallery</h1>
          <p class="page-subtitle">Explore onchain88 NFT collections</p>
        </div>

        ${
          this.state.contractInfo
            ? `
          <div class="nft-contract-info">
            <div class="contract-stats">
              <div class="stat-item">
                <span class="stat-label">Total Supply</span>
                <span class="stat-value">${this.state.contractInfo.totalSupply}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Collection</span>
                <span class="stat-value">${this.state.contractInfo.name}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Symbol</span>
                <span class="stat-value">${this.state.contractInfo.symbol}</span>
              </div>
            </div>
          </div>
        `
            : ""
        }

        <div class="nft-filters">
          <button
            class="filter-tab ${this.state.filter === "all" ? "active" : ""}"
            onclick="window.nftPage.setFilter('all')"
          >
            All NFTs
          </button>
          ${
            isConnected
              ? `
            <button
              class="filter-tab ${this.state.filter === "mine" ? "active" : ""}"
              onclick="window.nftPage.setFilter('mine')"
            >
              My NFTs (${this.state.userNfts.length})
            </button>
          `
              : ""
          }
        </div>

        ${
          this.state.error
            ? `
          <div class="message error">
            ${this.state.error}
          </div>
        `
            : ""
        }

        ${
          this.state.isLoading
            ? `
          <div class="loading-container">
            <span class="loading"></span>
            <p>Loading NFTs...</p>
          </div>
        `
            : `
          ${
            filteredNFTs.length > 0
              ? `
            <div class="nft-grid">
              ${filteredNFTs
                .map(
                  (nft) => `
                <div class="nft-card" onclick="window.router.navigate('nft/${
                  nft.tokenId
                }')" style="cursor: pointer;">
                  <div class="nft-image">
                    <img src="${nft.image}" alt="${
                    nft.name
                  }" onerror="this.src='./assets/logo.svg'">
                    ${
                      nft.isLocked
                        ? '<span class="nft-badge locked">SBT</span>'
                        : ""
                    }
                  </div>
                  <div class="nft-info">
                    <h3>${nft.name}</h3>
                    ${
                      nft.description
                        ? `<p class="nft-description">${nft.description}</p>`
                        : ""
                    }
                    <div class="nft-details">
                      <div class="detail-item">
                        <span class="detail-label">Token ID</span>
                        <span class="detail-value">#${nft.tokenId}</span>
                      </div>
                      ${
                        nft.owner
                          ? `
                        <div class="detail-item">
                          <span class="detail-label">Owner</span>
                          <span class="detail-value">${AddressDisplay.render(
                            nft.owner,
                            { showCopyIcon: false }
                          )}</span>
                        </div>
                      `
                          : ""
                      }
                    </div>
                    <button class="view-detail-button" onclick="event.stopPropagation(); window.router.navigate('nft/${
                      nft.tokenId
                    }')">
                      詳細を見る
                    </button>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          `
              : `
            <div class="empty-state">
              ${
                this.state.filter === "mine"
                  ? `
                <p>You don't have any NFTs yet.</p>
                <button onclick="window.router.navigate('profile')" class="cta-button">
                  Mint Your First NFT
                </button>
              `
                  : `
                <p>No NFTs found.</p>
              `
              }
            </div>
          `
          }
        `
        }

        ${
          showMetaMaskLink && !isConnected
            ? `
          <div class="mint-cta">
            <h2>MetaMaskでアクセス</h2>
            <p>モバイルでご利用の場合は、MetaMaskアプリからアクセスしてください</p>
            <a href="https://metamask.app.link/dapp/${window.location.hostname}${window.location.pathname}${window.location.hash}"
               class="cta-button">
              <img src="/assets/metamaskicon.svg" alt="MetaMask" width="24" height="24" />
              MetaMaskで開く
            </a>
          </div>
        `
            : `
          <div class="mint-cta">
            <h2>Want to join onchain88?</h2>
            <p>Mint your membership NFT to become part of our community</p>
            <button onclick="window.router.navigate('profile')" class="cta-button">
              ${isConnected ? "Mint Membership NFT" : "Connect Wallet to Mint"}
            </button>
          </div>
        `
        }
      </div>
    `;
  }
}

export const nftPage = new NftPage();
