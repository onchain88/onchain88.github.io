import { header } from "../components/Header";
import { daoShopContract } from "../daoShopContract";
import { AddressDisplay } from "../components/AddressDisplay";
import { walletManager } from "../wallet";
import { shouldShowMetaMaskRedirect } from "../utils/detectBrowser";

export class ShopPage {
  constructor() {
    this.state = {
      isLoading: true,
      items: [],
      userItems: [],
      filter: "all", // 'all', 'mine'
      error: null,
      isConnected: false,
    };
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  async loadItems() {
    try {
      this.setState({ isLoading: true, error: null });

      const { isConnected, account } = header.getConnectionStatus();
      this.setState({ isConnected });

      // Initialize contract
      const initialized = await daoShopContract.initialize();

      if (!initialized) {
        this.setState({
          isLoading: false,
          error:
            "DaoShopコントラクトの初期化に失敗しました。ネットワーク接続を確認してください。",
          items: [],
          userItems: [],
        });
        return;
      }

      // Load all items
      const allItems = await daoShopContract.fetchAllItems(20);

      // Load user's items if connected
      let userItems = [];
      if (isConnected && account) {
        userItems = await daoShopContract.fetchUserItems(account);
      }

      this.setState({
        isLoading: false,
        items: allItems,
        userItems,
      });
    } catch (error) {
      console.error("Failed to load items:", error);
      this.setState({
        isLoading: false,
        error: "商品データの読み込みに失敗しました。",
      });
    }
  }

  setFilter(filter) {
    this.setState({ filter });
  }

  getFilteredItems() {
    if (this.state.filter === "mine") {
      return this.state.userItems;
    }
    return this.state.items;
  }

  formatPrice(price) {
    if (!price || price === "0") return "価格未設定";
    return price;
  }

  formatStatus(status) {
    const statusMap = {
      available: "販売中",
      sold: "売却済",
      reserved: "取置中",
      draft: "下書き",
    };
    return statusMap[status] || status;
  }

  getStatusColor(status) {
    const colorMap = {
      available: "#22c55e",
      sold: "#ef4444",
      reserved: "#f59e0b",
      draft: "#6b7280",
    };
    return colorMap[status] || "#6b7280";
  }

  render() {
    const pageContent = document.getElementById("page-content");
    if (!pageContent) return;

    const { isConnected } = header.getConnectionStatus();
    const filteredItems = this.getFilteredItems();
    const showMetaMaskLink = shouldShowMetaMaskRedirect();

    pageContent.innerHTML = `
      <div class="page shop-page">
        <div class="page-header">
          <h1>DAO Shop</h1>
          <p class="page-subtitle">コミュニティメンバーの商品・サービス</p>
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

        <div class="shop-actions">
          <div class="shop-filters">
            <button
              class="filter-tab ${this.state.filter === "all" ? "active" : ""}"
              onclick="window.shopPage.setFilter('all')"
            >
              すべての商品
            </button>
            ${
              isConnected
                ? `
              <button
                class="filter-tab ${this.state.filter === "mine" ? "active" : ""}"
                onclick="window.shopPage.setFilter('mine')"
              >
                出品した商品 (${this.state.userItems.length})
              </button>
            `
                : ""
            }
          </div>
        </div>

        ${
          this.state.isLoading
            ? `
          <div class="loading-container">
            <span class="loading"></span>
            <p>商品を読み込み中...</p>
          </div>
        `
            : `
          ${
            filteredItems.length > 0
              ? `
            <div class="items-grid">
              ${filteredItems
                .map(
                  (item) => `
                <div class="item-card" onclick="window.router.navigate('shop/item/${
                  item.tokenId
                }')">
                  <div class="item-image">
                    ${
                      item.imageUrl
                        ? `<img src="${item.imageUrl}" alt="${item.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
                        : ""
                    }
                    <div class="no-image" ${
                      item.imageUrl ? 'style="display:none;"' : ""
                    }>
                      <span class="no-image-icon">📦</span>
                    </div>
                    <span class="item-status" style="background-color: ${this.getStatusColor(
                      item.status
                    )}">
                      ${this.formatStatus(item.status)}
                    </span>
                  </div>
                  <div class="item-info">
                    <h3>${item.title}</h3>
                    <p class="item-detail">${
                      item.detail || "詳細情報なし"
                    }</p>
                    <div class="item-footer">
                      <span class="item-price">${this.formatPrice(
                        item.price
                      )}</span>
                      <span class="item-creator">
                        ${AddressDisplay.render(item.creator, {
                          showCopyIcon: false,
                        })}
                      </span>
                    </div>
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
                <p>まだ商品を出品していません</p>
                <button onclick="window.router.navigate('shop/create')" class="cta-button">
                  最初の商品を出品
                </button>
              `
                  : `
                <p>商品がありません</p>
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
          <div class="shop-cta">
            <h2>MetaMaskでアクセス</h2>
            <p>モバイルでご利用の場合は、MetaMaskアプリからアクセスしてください</p>
            <a href="https://metamask.app.link/dapp/${window.location.hostname}${window.location.pathname}${window.location.hash}" 
               class="cta-button">
              <img src="/assets/metamaskicon.svg" alt="MetaMask" width="24" height="24" />
              MetaMaskで開く
            </a>
          </div>
        `
            : !isConnected
            ? `
          <div class="shop-cta">
            <h2>商品を出品しませんか？</h2>
            <p>ウォレットを接続して、あなたの商品やサービスを出品しましょう</p>
            <button onclick="window.walletManager.connect()" class="cta-button">
              ウォレットを接続
            </button>
          </div>
        `
            : `
          <div class="shop-cta">
            <h2>商品を出品</h2>
            <p>あなたの商品やサービスをDAOメンバーに共有しましょう</p>
            <button class="cta-button" onclick="window.router.navigate('shop/create')">
              <span class="icon">+</span>
              商品を出品する
            </button>
          </div>
        `
        }
      </div>
    `;
  }
}

export const shopPage = new ShopPage();