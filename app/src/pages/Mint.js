import { header } from "../components/Header";
import { walletManager } from "../wallet";
import { ethers } from "ethers";
import { CHAIN_CONFIG, CONTRACT_ADDRESSES } from "../config";
import NFT_ABI from "../NFT_ABI";
import { AddressDisplay } from "../components/AddressDisplay";
import { shouldShowMetaMaskRedirect } from "../utils/detectBrowser";

export class MintPage {
  constructor() {
    this.state = {
      isConnected: false,
      isLoading: false,
      message: null,
      mintFee: "0",
      formData: {
        toAddress: "",
        tokenURI: "",
        isLocked: false,
      },
      previewMetadata: null,
      isLoadingPreview: false,
      previewError: null,
    };
    this.previewTimeout = null;
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

  renderAttributeValue(value) {
    // URLかどうかを判定
    if (
      typeof value === "string" &&
      (value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("ipfs://"))
    ) {
      // 拡張子からMIMEタイプを推測
      const url = value.toLowerCase();

      // 画像の拡張子がある場合
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) {
        return `<img src="${value}" alt="Attribute" class="preview-attribute-image" />`;
      }

      // Arweave URLの場合、画像として試してみる
      if (value.includes("arweave.net")) {
        return `<img src="${value}" alt="Attribute" class="preview-attribute-image" onerror="this.style.display='none'; this.parentElement.innerHTML='${value}'" />`;
      }

      // その他のURLの場合はテキストのみ
      return value;
    }

    // URL以外の場合はそのまま表示
    return value;
  }

  async checkConnection() {
    const { isConnected, account } = header.getConnectionStatus();
    this.setState({ isConnected });

    if (isConnected) {
      // デフォルトで自分のアドレスを入力
      this.setState({
        formData: {
          ...this.state.formData,
          toAddress: account,
        },
      });
      await this.loadMintFee();
    }
  }

  async loadMintFee() {
    try {
      const provider = new ethers.BrowserProvider(walletManager.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ONCHAIN88_NFT,
        NFT_ABI,
        provider
      );

      const fee = await contract.mintFee();
      this.setState({ mintFee: ethers.formatEther(fee) });
    } catch (error) {
      console.error("Failed to load mint fee:", error);
    }
  }

  updateFormData(field, value) {
    this.setState({
      formData: {
        ...this.state.formData,
        [field]: value,
      },
    });

    // Token URIが変更されたら、デバウンスしてメタデータを読み込む
    if (field === "tokenURI") {
      if (this.previewTimeout) {
        clearTimeout(this.previewTimeout);
      }

      if (value) {
        this.setState({
          isLoadingPreview: true,
          previewMetadata: null,
          previewError: null,
        });
        this.previewTimeout = setTimeout(() => {
          this.loadMetadataPreview(value);
        }, 500);
      } else {
        this.setState({
          previewMetadata: null,
          isLoadingPreview: false,
          previewError: null,
        });
      }
    }
  }

  async loadMetadataPreview(tokenURI) {
    try {
      let metadata = null;
      let errorMessage = null;

      // data: URL形式の場合
      if (tokenURI.startsWith("data:application/json;base64,")) {
        try {
          const base64Data = tokenURI.split(",")[1];
          const jsonString = atob(base64Data);
          metadata = JSON.parse(jsonString);
        } catch (e) {
          errorMessage = "Base64デコードまたはJSON解析に失敗しました";
        }
      }
      // data: URL形式（base64なし）の場合
      else if (tokenURI.startsWith("data:application/json,")) {
        try {
          const jsonString = decodeURIComponent(tokenURI.split(",")[1]);
          metadata = JSON.parse(jsonString);
        } catch (e) {
          errorMessage = "JSON解析に失敗しました";
        }
      }
      // HTTP/HTTPS URLの場合
      else if (
        tokenURI.startsWith("http://") ||
        tokenURI.startsWith("https://")
      ) {
        try {
          const response = await fetch(tokenURI);
          if (!response.ok) {
            errorMessage = `URLからの取得に失敗しました (${response.status})`;
          } else {
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              errorMessage = "レスポンスがJSON形式ではありません";
            } else {
              metadata = await response.json();
            }
          }
        } catch (error) {
          errorMessage = "URLからのデータ取得に失敗しました";
        }
      }
      // IPFS URLの場合（簡易的な処理）
      else if (tokenURI.startsWith("ipfs://")) {
        // IPFSゲートウェイを使用
        const ipfsHash = tokenURI.replace("ipfs://", "");
        try {
          const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
          if (!response.ok) {
            errorMessage = "IPFSからの取得に失敗しました";
          } else {
            metadata = await response.json();
          }
        } catch (error) {
          errorMessage = "IPFSからのデータ取得に失敗しました";
        }
      } else {
        errorMessage = "サポートされていないURI形式です";
      }

      // メタデータの必須フィールドをチェック
      if (metadata && !errorMessage) {
        if (!metadata.name && !metadata.description && !metadata.image) {
          errorMessage =
            "メタデータに必須フィールド（name, description, image）が含まれていません";
        }
      }

      if (metadata && !errorMessage) {
        this.setState({
          previewMetadata: metadata,
          isLoadingPreview: false,
          previewError: null,
        });
      } else {
        this.setState({
          previewMetadata: null,
          isLoadingPreview: false,
          previewError: errorMessage || "不明なエラーが発生しました",
        });
      }
    } catch (error) {
      console.error("Failed to parse metadata:", error);
      this.setState({
        previewMetadata: null,
        isLoadingPreview: false,
        previewError: "メタデータの処理中にエラーが発生しました",
      });
    }
  }

  validateForm() {
    const { toAddress, tokenURI } = this.state.formData;

    if (!toAddress) {
      this.showMessage("ミント先アドレスを入力してください", "error");
      return false;
    }

    if (!ethers.isAddress(toAddress)) {
      this.showMessage("有効なアドレスを入力してください", "error");
      return false;
    }

    if (!tokenURI) {
      this.showMessage("Token URIを入力してください", "error");
      return false;
    }

    return true;
  }

  async mintNFT() {
    if (!this.validateForm()) return;

    this.setState({ isLoading: true, message: null });

    try {
      const provider = new ethers.BrowserProvider(walletManager.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ONCHAIN88_NFT,
        NFT_ABI,
        signer
      );

      const { toAddress, tokenURI, isLocked } = this.state.formData;
      const mintFee = await contract.mintFee();

      this.showMessage("トランザクションを送信中...", "info");

      const tx = await contract.mint(toAddress, tokenURI, isLocked, {
        value: mintFee,
      });

      this.showMessage("トランザクションを処理中...", "info");
      const receipt = await tx.wait();

      // TokenMintedイベントからtokenIdを取得
      const event = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "TokenMinted");

      const tokenId = event ? event.args.tokenId.toString() : "unknown";

      this.showMessage(
        `NFTのミントに成功しました！Token ID: #${tokenId}`,
        "success"
      );

      // フォームをリセット
      this.setState({
        formData: {
          toAddress: walletManager.account || "",
          tokenURI: "",
          isLocked: false,
        },
      });
    } catch (error) {
      console.error("Minting error:", error);

      let errorMessage = "ミントに失敗しました";
      if (error.message.includes("insufficient funds")) {
        errorMessage = "ガス代とミント費用が不足しています";
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

    const showMetaMaskLink = shouldShowMetaMaskRedirect();

    pageContent.innerHTML = `
      <div class="page mint-page">
        <div class="page-header">
          <h1>Mint onchain88 NFT</h1>
          <p class="page-subtitle">onchain88 NFTをミントする</p>
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
          !this.state.isConnected
            ? `
          <div class="wallet-notice">
            <p>NFTをミントするにはウォレットを接続してください</p>
          </div>

          ${
            showMetaMaskLink
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
              <h2>onchain88 NFTをミント</h2>
              <p>ウォレットを接続して、独自のNFTを作成しましょう</p>
              <button onclick="window.walletManager.connect()" class="cta-button">
                ウォレットを接続
              </button>
            </div>
          `
          }
        `
            : `
          <div class="mint-form-container">
            <div class="mint-info-box">
              <h3>ミント情報</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">コントラクト</span>
                  <span class="info-value">${AddressDisplay.render(
                    CONTRACT_ADDRESSES.ONCHAIN88_NFT,
                    { showCopyIcon: true }
                  )}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">ミント費用</span>
                  <span class="info-value">${this.state.mintFee} ${
                CHAIN_CONFIG.nativeCurrency.symbol
              }</span>
                </div>
              </div>
            </div>

            <div class="mint-form">
              <h3>NFT情報入力</h3>

              <div class="form-group">
                <label for="toAddress">ミント先アドレス</label>
                <input
                  type="text"
                  id="toAddress"
                  placeholder="0x..."
                  value="${this.state.formData.toAddress}"
                  onchange="window.mintPage.updateFormData('toAddress', this.value)"
                  ${this.state.isLoading ? "disabled" : ""}
                />
                <p class="form-hint">NFTを受け取るウォレットアドレス</p>
              </div>

              <div class="form-group">
                <label for="tokenURI">Token URI</label>
                <input
                  type="text"
                  id="tokenURI"
                  placeholder="https://... または ipfs://... または data:application/json..."
                  value="${this.state.formData.tokenURI}"
                  onchange="window.mintPage.updateFormData('tokenURI', this.value)"
                  ${this.state.isLoading ? "disabled" : ""}
                />
                <p class="form-hint">NFTのメタデータURI（JSON形式）</p>
              </div>

              ${
                this.state.isLoadingPreview
                  ? `
                <div class="preview-section">
                  <h4>NFTプレビュー</h4>
                  <div class="loading-container">
                    <span class="loading"></span>
                    <p>メタデータを読み込み中...</p>
                  </div>
                </div>
              `
                  : this.state.previewError
                  ? `
                <div class="preview-section preview-error">
                  <h4>NFTプレビュー</h4>
                  <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <p class="error-message">${this.state.previewError}</p>
                    <p class="error-hint">正しいJSON形式のメタデータURIを入力してください</p>
                  </div>
                </div>
              `
                  : this.state.previewMetadata
                  ? `
                <div class="preview-section">
                  <h4>NFTプレビュー</h4>
                  <div class="nft-preview-card">
                    <div class="nft-image">
                      <img
                        src="${
                          this.state.previewMetadata.image ||
                          "./assets/logo.svg"
                        }"
                        alt="${
                          this.state.previewMetadata.name || "NFT Preview"
                        }"
                        onerror="this.src='./assets/logo.svg'"
                      />
                      ${
                        this.state.formData.isLocked
                          ? '<span class="nft-badge locked">SBT</span>'
                          : ""
                      }
                    </div>
                    <div class="nft-info">
                      <h3>${
                        this.state.previewMetadata.name || "Untitled NFT"
                      }</h3>
                      <p class="nft-description">${
                        this.state.previewMetadata.description ||
                        "No description"
                      }</p>
                      ${
                        this.state.previewMetadata.attributes &&
                        this.state.previewMetadata.attributes.length > 0
                          ? `
                        <div class="attributes-preview">
                          ${this.state.previewMetadata.attributes
                            .map(
                              (attr) => `
                            <div class="preview-attribute-item">
                              <span class="preview-attribute-label">${
                                attr.trait_type
                              }:</span>
                              <span class="preview-attribute-value">${this.renderAttributeValue(
                                attr.value
                              )}</span>
                            </div>
                          `
                            )
                            .join("")}
                        </div>
                      `
                          : ""
                      }
                    </div>
                  </div>
                </div>
              `
                  : ""
              }

              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    id="isLocked"
                    ${this.state.formData.isLocked ? "checked" : ""}
                    onchange="window.mintPage.updateFormData('isLocked', this.checked)"
                    ${this.state.isLoading ? "disabled" : ""}
                  />
                  <span>Soul Bound Token（譲渡不可）にする</span>
                </label>
                <p class="form-hint">チェックするとこのNFTは譲渡できなくなります</p>
              </div>

              <button
                onclick="window.mintPage.mintNFT()"
                ${this.state.isLoading ? "disabled" : ""}
                class="mint-button"
              >
                ${
                  this.state.isLoading
                    ? '<span class="loading"></span>ミント中...'
                    : "NFTをミント"
                }
              </button>
            </div>

            <div class="metadata-tools-section">
              <h3>メタデータ作成ツール</h3>
              <p>NFTのメタデータをオンラインで簡単に作成できます</p>
              <a href="https://meta.bon-soleil.com/" target="_blank" class="metadata-tool-link">
                <span class="tool-icon">🛠️</span>
                <span class="tool-text">
                  <strong>メタデータジェネレーター</strong>
                  <small>meta.bon-soleil.com</small>
                </span>
                <span class="external-icon">↗</span>
              </a>
            </div>
          </div>
        `
        }
      </div>
    `;
  }
}

export const mintPage = new MintPage();
