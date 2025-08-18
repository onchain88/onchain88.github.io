import { header } from "../components/Header";
import { daoShopContract } from "../daoShopContract";
import { getExplorerUrl } from "../config";
import { AddressDisplay } from "../components/AddressDisplay";
import { walletManager } from "../wallet";

export class ItemDetailPage {
  constructor() {
    this.state = {
      isLoading: true,
      item: null,
      error: null,
      tokenId: null,
      isOwner: false,
      isEditing: false,
      editForm: {},
      message: null,
    };
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  showMessage(text, type = "info") {
    this.setState({ message: { text, type } });
    if (type !== "error") {
      setTimeout(() => this.setState({ message: null }), 5000);
    }
  }

  async loadItemDetail(tokenId) {
    try {
      this.setState({ isLoading: true, error: null, tokenId });

      // Initialize contract
      const initialized = await daoShopContract.initialize();

      if (!initialized) {
        this.setState({
          isLoading: false,
          error: "コントラクトの初期化に失敗しました",
        });
        return;
      }

      // Fetch item details
      const item = await daoShopContract.getItem(tokenId);

      // Check if current user is the creator
      const { account } = header.getConnectionStatus();
      const isOwner = account && item.creator.toLowerCase() === account.toLowerCase();

      this.setState({ 
        isLoading: false, 
        item, 
        isOwner,
        editForm: { ...item },
      });
    } catch (error) {
      console.error("Failed to load item details:", error);
      this.setState({
        isLoading: false,
        error: "商品詳細を読み込めませんでした",
      });
    }
  }

  toggleEdit() {
    this.setState({ 
      isEditing: !this.state.isEditing,
      editForm: { ...this.state.item },
      message: null,
    });
  }

  updateEditForm(field, value) {
    this.setState({
      editForm: {
        ...this.state.editForm,
        [field]: value,
      },
    });
  }

  async saveChanges() {
    this.setState({ isLoading: true, message: null });

    try {
      const {
        title,
        detail,
        imageUrl,
        tokenInfo,
        contact,
        price,
        status,
      } = this.state.editForm;

      await daoShopContract.updateItem(
        this.state.tokenId,
        title,
        detail,
        imageUrl,
        tokenInfo,
        contact,
        price,
        status
      );

      this.showMessage("商品情報を更新しました", "success");
      
      // Reload item data
      await this.loadItemDetail(this.state.tokenId);
      this.setState({ isEditing: false });
    } catch (error) {
      console.error("Failed to update item:", error);
      
      let errorMessage = "更新に失敗しました";
      if (error.message.includes("Only creator")) {
        errorMessage = "作成者のみが編集できます";
      } else if (error.message.includes("user rejected")) {
        errorMessage = "トランザクションがキャンセルされました";
      }
      
      this.showMessage(errorMessage, "error");
    } finally {
      this.setState({ isLoading: false });
    }
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

    pageContent.innerHTML = `
      <div class="page item-detail-page">
        ${
          this.state.isLoading
            ? `
          <div class="loading-container">
            <span class="loading"></span>
            <p>商品詳細を読み込み中...</p>
          </div>
        `
            : this.state.error
            ? `
          <div class="error-container">
            <div class="message error">
              ${this.state.error}
            </div>
            <button onclick="window.router.navigate('shop')" class="back-button">
              ← ショップに戻る
            </button>
          </div>
        `
            : this.state.item
            ? `
          <div class="item-detail-container">
            <button onclick="window.router.navigate('shop')" class="back-button">
              ← ショップに戻る
            </button>

            ${
              this.state.message
                ? `
              <div class="message ${this.state.message.type}">
                ${this.state.message.text}
              </div>
            `
                : ""
            }

            <div class="item-detail-content">
              <div class="item-detail-media">
                ${
                  this.state.item.imageUrl || this.state.editForm.imageUrl
                    ? `<img src="${this.state.editForm.imageUrl || this.state.item.imageUrl}" alt="${this.state.item.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
                    : ""
                }
                <div class="no-image-large" ${
                  this.state.item.imageUrl ? 'style="display:none;"' : ""
                }>
                  <span class="no-image-icon">📦</span>
                </div>
                <span class="item-status-large" style="background-color: ${this.getStatusColor(
                  this.state.isEditing ? this.state.editForm.status : this.state.item.status
                )}">
                  ${this.formatStatus(
                    this.state.isEditing ? this.state.editForm.status : this.state.item.status
                  )}
                </span>
              </div>

              <div class="item-detail-info">
                ${
                  this.state.isEditing
                    ? `
                  <div class="edit-form">
                    <div class="form-group">
                      <label>商品名</label>
                      <input
                        type="text"
                        value="${this.state.editForm.title}"
                        onchange="window.itemDetailPage.updateEditForm('title', this.value)"
                        ${this.state.isLoading ? "disabled" : ""}
                      />
                    </div>
                    <div class="form-group">
                      <label>商品説明</label>
                      <textarea
                        rows="4"
                        onchange="window.itemDetailPage.updateEditForm('detail', this.value)"
                        ${this.state.isLoading ? "disabled" : ""}
                      >${this.state.editForm.detail}</textarea>
                    </div>
                    <div class="form-group">
                      <label>画像URL</label>
                      <input
                        type="text"
                        value="${this.state.editForm.imageUrl}"
                        onchange="window.itemDetailPage.updateEditForm('imageUrl', this.value)"
                        ${this.state.isLoading ? "disabled" : ""}
                      />
                    </div>
                    <div class="form-group">
                      <label>価格</label>
                      <input
                        type="text"
                        value="${this.state.editForm.price}"
                        onchange="window.itemDetailPage.updateEditForm('price', this.value)"
                        ${this.state.isLoading ? "disabled" : ""}
                      />
                    </div>
                    <div class="form-group">
                      <label>取引情報</label>
                      <textarea
                        rows="3"
                        onchange="window.itemDetailPage.updateEditForm('tokenInfo', this.value)"
                        ${this.state.isLoading ? "disabled" : ""}
                      >${this.state.editForm.tokenInfo}</textarea>
                    </div>
                    <div class="form-group">
                      <label>連絡先</label>
                      <input
                        type="text"
                        value="${this.state.editForm.contact}"
                        onchange="window.itemDetailPage.updateEditForm('contact', this.value)"
                        ${this.state.isLoading ? "disabled" : ""}
                      />
                    </div>
                    <div class="form-group">
                      <label>ステータス</label>
                      <select
                        onchange="window.itemDetailPage.updateEditForm('status', this.value)"
                        ${this.state.isLoading ? "disabled" : ""}
                      >
                        <option value="available" ${
                          this.state.editForm.status === "available" ? "selected" : ""
                        }>販売中</option>
                        <option value="sold" ${
                          this.state.editForm.status === "sold" ? "selected" : ""
                        }>売却済</option>
                        <option value="reserved" ${
                          this.state.editForm.status === "reserved" ? "selected" : ""
                        }>取置中</option>
                        <option value="draft" ${
                          this.state.editForm.status === "draft" ? "selected" : ""
                        }>下書き</option>
                      </select>
                    </div>
                    <div class="edit-actions">
                      <button
                        onclick="window.itemDetailPage.saveChanges()"
                        class="save-button"
                        ${this.state.isLoading ? "disabled" : ""}
                      >
                        ${
                          this.state.isLoading
                            ? '<span class="loading"></span>保存中...'
                            : "保存"
                        }
                      </button>
                      <button
                        onclick="window.itemDetailPage.toggleEdit()"
                        class="cancel-button"
                        ${this.state.isLoading ? "disabled" : ""}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                `
                    : `
                  <h1>${this.state.item.title}</h1>
                  <p class="item-detail-description">${this.state.item.detail}</p>

                  <div class="item-detail-section">
                    <h3>詳細情報</h3>
                    <div class="detail-grid">
                      <div class="detail-row">
                        <span class="detail-label">アイテムID</span>
                        <span class="detail-value">#${this.state.tokenId}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">出品者</span>
                        <span class="detail-value">
                          ${AddressDisplay.render(this.state.item.creator, {
                            explorerUrl: getExplorerUrl(
                              this.state.item.creator,
                              "address"
                            ),
                          })}
                        </span>
                      </div>
                      ${
                        this.state.item.price
                          ? `
                        <div class="detail-row">
                          <span class="detail-label">価格</span>
                          <span class="detail-value">${this.state.item.price}</span>
                        </div>
                      `
                          : ""
                      }
                    </div>
                  </div>

                  ${
                    this.state.item.tokenInfo
                      ? `
                    <div class="item-detail-section">
                      <h3>取引情報</h3>
                      <p class="info-text">${this.state.item.tokenInfo}</p>
                    </div>
                  `
                      : ""
                  }

                  ${
                    this.state.item.contact
                      ? `
                    <div class="item-detail-section">
                      <h3>連絡先</h3>
                      <p class="info-text">${this.state.item.contact}</p>
                    </div>
                  `
                      : ""
                  }

                  ${
                    this.state.isOwner && isConnected
                      ? `
                    <div class="item-detail-section">
                      <h3>商品管理</h3>
                      <button
                        onclick="window.itemDetailPage.toggleEdit()"
                        class="edit-button"
                      >
                        商品情報を編集
                      </button>
                    </div>
                  `
                      : ""
                  }
                `
                }
              </div>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;
  }
}

export const itemDetailPage = new ItemDetailPage();