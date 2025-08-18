import { header } from "../components/Header";
import { walletManager } from "../wallet";
import { daoShopContract } from "../daoShopContract";

export class CreateItemPage {
  constructor() {
    this.state = {
      isLoading: false,
      message: null,
      formData: {
        title: "",
        detail: "",
        imageUrl: "",
        tokenInfo: "",
        contact: "",
        price: "",
        status: "available",
      },
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

  updateFormData(field, value) {
    this.setState({
      formData: {
        ...this.state.formData,
        [field]: value,
      },
    });
  }

  validateForm() {
    const { title, detail } = this.state.formData;

    if (!title) {
      this.showMessage("商品名を入力してください", "error");
      return false;
    }

    if (!detail) {
      this.showMessage("商品説明を入力してください", "error");
      return false;
    }

    return true;
  }

  async createItem() {
    if (!this.validateForm()) return;

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
      } = this.state.formData;

      this.showMessage("トランザクションを送信中...", "info");

      const tokenId = await daoShopContract.createItem(
        title,
        detail || "",
        imageUrl || "",
        tokenInfo || "",
        contact || "",
        price || "",
        status
      );

      this.showMessage(
        `商品の登録に成功しました！Item ID: #${tokenId}`,
        "success"
      );

      // フォームをリセット
      setTimeout(() => {
        window.router.navigate(`shop/item/${tokenId}`);
      }, 2000);
    } catch (error) {
      console.error("Item creation error:", error);

      let errorMessage = "商品の登録に失敗しました";
      if (error.message.includes("insufficient funds")) {
        errorMessage = "ガス代が不足しています";
      } else if (error.message.includes("user rejected")) {
        errorMessage = "トランザクションがキャンセルされました";
      }

      this.showMessage(errorMessage, "error");
    } finally {
      this.setState({ isLoading: false });
    }
  }

  render() {
    const pageContent = document.getElementById("page-content");
    if (!pageContent) return;

    const { isConnected } = header.getConnectionStatus();

    pageContent.innerHTML = `
      <div class="page create-item-page">
        <div class="page-header">
          <button onclick="window.router.navigate('shop')" class="back-button">
            ← 戻る
          </button>
          <h1>商品を出品</h1>
          <p class="page-subtitle">新しい商品を登録します</p>
        </div>

        ${
          this.state.message
            ? `
          <div class="message ${this.state.message.type}">
            ${this.state.message.text}
          </div>
        `
            : ""
        }

        ${
          !isConnected
            ? `
          <div class="wallet-notice">
            <p>商品を出品するにはウォレットを接続してください</p>
          </div>
        `
            : `
          <div class="item-form-container">
            <div class="item-form">
              <h3>商品情報</h3>

              <div class="form-group">
                <label for="title">商品名 <span class="required">*</span></label>
                <input
                  type="text"
                  id="title"
                  placeholder="商品名を入力"
                  value="${this.state.formData.title}"
                  onchange="window.createItemPage.updateFormData('title', this.value)"
                  ${this.state.isLoading ? "disabled" : ""}
                />
              </div>

              <div class="form-group">
                <label for="detail">商品説明 <span class="required">*</span></label>
                <textarea
                  id="detail"
                  rows="4"
                  placeholder="商品の詳細説明を入力"
                  onchange="window.createItemPage.updateFormData('detail', this.value)"
                  ${this.state.isLoading ? "disabled" : ""}
                >${this.state.formData.detail}</textarea>
              </div>

              <div class="form-group">
                <label for="imageUrl">画像URL</label>
                <input
                  type="text"
                  id="imageUrl"
                  placeholder="https://..."
                  value="${this.state.formData.imageUrl}"
                  onchange="window.createItemPage.updateFormData('imageUrl', this.value)"
                  ${this.state.isLoading ? "disabled" : ""}
                />
                <p class="form-hint">商品画像のURLを入力してください</p>
              </div>

              <div class="form-group">
                <label for="price">価格</label>
                <input
                  type="text"
                  id="price"
                  placeholder="1,000円、0.1ETH など"
                  value="${this.state.formData.price}"
                  onchange="window.createItemPage.updateFormData('price', this.value)"
                  ${this.state.isLoading ? "disabled" : ""}
                />
                <p class="form-hint">価格を自由形式で入力してください</p>
              </div>

              <div class="form-group">
                <label for="tokenInfo">取引情報</label>
                <textarea
                  id="tokenInfo"
                  rows="3"
                  placeholder="支払い方法、配送方法など"
                  onchange="window.createItemPage.updateFormData('tokenInfo', this.value)"
                  ${this.state.isLoading ? "disabled" : ""}
                >${this.state.formData.tokenInfo}</textarea>
                <p class="form-hint">決済・配送などの取引に関する情報</p>
              </div>

              <div class="form-group">
                <label for="contact">連絡先</label>
                <input
                  type="text"
                  id="contact"
                  placeholder="Discord: @username, Email: example@mail.com など"
                  value="${this.state.formData.contact}"
                  onchange="window.createItemPage.updateFormData('contact', this.value)"
                  ${this.state.isLoading ? "disabled" : ""}
                />
                <p class="form-hint">購入者からの連絡を受ける方法</p>
              </div>

              <div class="form-group">
                <label for="status">ステータス</label>
                <select
                  id="status"
                  onchange="window.createItemPage.updateFormData('status', this.value)"
                  ${this.state.isLoading ? "disabled" : ""}
                >
                  <option value="available" ${
                    this.state.formData.status === "available" ? "selected" : ""
                  }>販売中</option>
                  <option value="draft" ${
                    this.state.formData.status === "draft" ? "selected" : ""
                  }>下書き</option>
                </select>
              </div>

              <button
                onclick="window.createItemPage.createItem()"
                ${this.state.isLoading ? "disabled" : ""}
                class="submit-button"
              >
                ${
                  this.state.isLoading
                    ? '<span class="loading"></span>登録中...'
                    : "商品を登録"
                }
              </button>
            </div>
          </div>
        `
        }
      </div>
    `;
  }
}

export const createItemPage = new CreateItemPage();