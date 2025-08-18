import { header } from "../components/Header";
import { nftContract } from "../nftContract";
import { getExplorerUrl, CONTRACT_ADDRESSES, CHAIN_CONFIG } from "../config";
import { tbaManager } from "../tbaManager";
import { walletManager } from "../wallet";
import { AddressDisplay } from "../components/AddressDisplay";
import { ethers } from "ethers";
import NFT_ABI from "../NFT_ABI.js";

export class NftDetailPage {
  constructor() {
    this.state = {
      isLoading: true,
      nft: null,
      error: null,
      tokenId: null,
      tbaAddress: null,
      tbaExists: false,
      tbaLoading: false,
      tbaNFTs: [],
      isOwner: false,
      tbaAvailable: true,
      activeTab: "image",
    };
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  async loadNFTDetail(tokenId) {
    try {
      this.setState({ isLoading: true, error: null, tokenId });

      // Initialize contract
      const initialized = await nftContract.initialize();

      if (!initialized) {
        this.setState({
          isLoading: false,
          error:
            "ウォレットを接続してNFT詳細を表示してください（ローカル環境ではCORSエラーが発生します）",
        });
        return;
      }

      // Fetch NFT details
      const [tokenURI, owner, isLocked, creator] = await Promise.all([
        nftContract.contract.tokenURI(tokenId),
        nftContract.contract.ownerOf(tokenId),
        nftContract.contract.isLocked(tokenId),
        nftContract.contract.tokenCreator(tokenId),
      ]);

      console.log(`Loading details for NFT #${tokenId}`);
      console.log("Token URI:", tokenURI);

      // Parse metadata
      let metadata = {};
      if (tokenURI) {
        try {
          if (tokenURI.startsWith("data:application/json;base64,")) {
            const base64Data = tokenURI.split(",")[1];
            const jsonString = atob(base64Data);
            metadata = JSON.parse(jsonString);
          } else if (tokenURI.includes("arweave.net")) {
            try {
              const response = await fetch(tokenURI);
              if (response.ok) {
                metadata = await response.json();
              }
            } catch (fetchErr) {
              console.error("Failed to fetch from Arweave:", fetchErr);
            }
          }
        } catch (err) {
          console.error("Failed to parse metadata:", err);
        }
      }

      const nft = {
        tokenId: tokenId.toString(),
        name: metadata.name || `onchain88 NFT #${tokenId}`,
        description: metadata.description || "onchain88 NFT",
        image: metadata.image || "/assets/logo.svg",
        animationUrl: metadata.animation_url || metadata.animationUrl || null,
        youtubeUrl: metadata.youtube_url || metadata.youtubeUrl || null,
        mimeType: metadata.mime_type || metadata.mimeType || null,
        owner,
        creator,
        isLocked,
        tokenURI,
        attributes: metadata.attributes || [],
      };

      console.log("NFT metadata:", {
        animationUrl: nft.animationUrl,
        youtubeUrl: nft.youtubeUrl,
        mimeType: nft.mimeType,
      });

      // Check if current user is the owner
      const { account } = header.getConnectionStatus();
      const isOwner = account && owner.toLowerCase() === account.toLowerCase();

      // animation_urlがある場合はanimationタブをデフォルトにする
      const defaultTab = nft.animationUrl ? "animation" : "image";

      this.setState({ isLoading: false, nft, isOwner, activeTab: defaultTab });

      // Load TBA information
      await this.loadTBAInfo(tokenId);
    } catch (error) {
      console.error("Failed to load NFT details:", error);
      this.setState({
        isLoading: false,
        error: "NFTの詳細を読み込めませんでした",
      });
    }
  }

  formatAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
        return `<img src="${value}" alt="Attribute image" class="attribute-image clickable-image" onclick="window.nftDetailPage.showImageModal('${value}')" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" /><a href="${value}" target="_blank" class="attribute-link" style="display:none;">link <span class="link-icon">↗</span></a>`;
      }

      // 3Dモデルの場合
      if (url.match(/\.(glb|gltf)$/i)) {
        return `<a href="${value}" target="_blank" class="attribute-link attribute-3d">3D Model <span class="link-icon">↗</span></a>`;
      }

      // Arweave URLの場合、画像として試してみる
      if (value.includes("arweave.net")) {
        return `<img src="${value}" alt="Attribute image" class="attribute-image clickable-image" onclick="window.nftDetailPage.showImageModal('${value}')" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" /><a href="${value}" target="_blank" class="attribute-link" style="display:none;">link <span class="link-icon">↗</span></a>`;
      }

      // その他のURLの場合
      return `<a href="${value}" target="_blank" class="attribute-link">link <span class="link-icon">↗</span></a>`;
    }

    // URL以外の場合はそのまま表示
    return value;
  }

  async loadTBAInfo(tokenId) {
    try {
      const initialized = await tbaManager.initialize();

      // If TBA Manager failed to initialize, show TBA as not available
      if (!initialized) {
        console.log("TBA functionality not available");
        this.setState({
          tbaAddress: null,
          tbaExists: false,
          tbaAvailable: false,
        });
        return;
      }

      // Get TBA address
      const tbaAddress = await tbaManager.getTBAAddress(
        CONTRACT_ADDRESSES.ONCHAIN88_NFT,
        tokenId
      );
      const tbaExists = await tbaManager.isTBACreated(
        CONTRACT_ADDRESSES.ONCHAIN88_NFT,
        tokenId
      );

      this.setState({
        tbaAddress,
        tbaExists,
        tbaAvailable: true,
      });

      // If TBA exists, load NFTs inside it
      if (tbaExists) {
        await this.loadTBANFTs();
      }
    } catch (error) {
      console.error("Failed to load TBA info:", error);
      this.setState({
        tbaAddress: null,
        tbaExists: false,
        tbaAvailable: false,
      });
    }
  }

  async loadTBANFTs() {
    if (!this.state.tbaAddress) return;

    try {
      this.setState({ tbaLoading: true });
      const nfts = await tbaManager.getTBANFTs(this.state.tbaAddress);
      this.setState({ tbaNFTs: nfts, tbaLoading: false });
    } catch (error) {
      console.error("Failed to load TBA NFTs:", error);
      this.setState({ tbaLoading: false });
    }
  }

  async createTBA() {
    if (!this.state.isOwner || !walletManager.isConnected()) {
      alert("NFTのオーナーのみがTBAを作成できます");
      return;
    }

    try {
      this.setState({ tbaLoading: true });

      // Debug: Check the current chain ID
      const provider = walletManager.ethereum;
      const chainId = await provider.request({ method: "eth_chainId" });
      console.log(
        "Current chain ID:",
        chainId,
        "Expected:",
        CHAIN_CONFIG.chainId
      );

      if (chainId !== CHAIN_CONFIG.chainId) {
        alert(`Wrong network! Please switch to ${CHAIN_CONFIG.chainName}`);
        this.setState({ tbaLoading: false });
        return;
      }

      const tbaAddress = await tbaManager.createTBA(
        CONTRACT_ADDRESSES.ONCHAIN88_NFT,
        parseInt(this.state.tokenId) // Ensure tokenId is a number
      );

      this.setState({
        tbaAddress,
        tbaExists: true,
        tbaLoading: false,
      });

      // Reload TBA NFTs
      await this.loadTBANFTs();
    } catch (error) {
      console.error("Failed to create TBA:", error);
      alert("TBAの作成に失敗しました: " + error.message);
      this.setState({ tbaLoading: false });
    }
  }

  render() {
    const pageContent = document.getElementById("page-content");
    if (!pageContent) return;

    const { isConnected } = header.getConnectionStatus();

    pageContent.innerHTML = `
      <div class="page nft-detail-page">
        ${
          this.state.isLoading
            ? `
          <div class="loading-container">
            <span class="loading"></span>
            <p>NFT詳細を読み込み中...</p>
          </div>
        `
            : this.state.error
            ? `
          <div class="error-container">
            <div class="message error">
              ${this.state.error}
            </div>
            <button onclick="window.router.navigate('nft')" class="back-button">
              ← NFT一覧に戻る
            </button>
          </div>
        `
            : this.state.nft
            ? `
          <div class="nft-detail-container">
            <button onclick="window.router.navigate('nft')" class="back-button">
              ← NFT一覧に戻る
            </button>

            <div class="nft-detail-content">
              <div class="nft-detail-media">
                ${this.renderMediaTabs()}
                <div class="media-viewer">
                  ${this.renderMediaContent()}
                </div>
                ${
                  this.state.nft.isLocked
                    ? '<span class="nft-badge locked">SBT</span>'
                    : ""
                }
              </div>

              <div class="nft-detail-info">
                <h1>${this.state.nft.name}</h1>
                <p class="nft-detail-description">${
                  this.state.nft.description
                }</p>

                <div class="nft-detail-section">
                  <h3>詳細情報</h3>
                  <div class="detail-grid">
                    <div class="detail-row">
                      <span class="detail-label">トークンID</span>
                      <span class="detail-value">#${
                        this.state.nft.tokenId
                      }</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">オーナー</span>
                      <span class="detail-value">
                        ${AddressDisplay.render(this.state.nft.owner, {
                          explorerUrl: getExplorerUrl(
                            this.state.nft.owner,
                            "address"
                          ),
                        })}
                      </span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">作成者</span>
                      <span class="detail-value">
                        ${AddressDisplay.render(this.state.nft.creator, {
                          explorerUrl: getExplorerUrl(
                            this.state.nft.creator,
                            "address"
                          ),
                        })}
                      </span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">タイプ</span>
                      <span class="detail-value">${
                        this.state.nft.isLocked
                          ? "Soul Bound Token (譲渡不可)"
                          : "ERC721 (譲渡可能)"
                      }</span>
                    </div>
                  </div>
                </div>

                ${
                  this.state.nft.attributes &&
                  this.state.nft.attributes.length > 0
                    ? `
                  <div class="nft-detail-section">
                    <h3>属性</h3>
                    <div class="attributes-list">
                      ${this.state.nft.attributes
                        .map(
                          (attr) => `
                        <div class="attribute-item">
                          <span class="attribute-label">${
                            attr.trait_type || "Property"
                          }</span>
                          <span class="attribute-content">${this.renderAttributeValue(
                            attr.value
                          )}</span>
                        </div>
                      `
                        )
                        .join("")}
                    </div>
                  </div>
                `
                    : ""
                }

                <div class="nft-detail-section">
                  <h3>メタデータ</h3>
                  <div class="metadata-info">
                    <p class="metadata-uri">
                      ${
                        this.state.nft.tokenURI.startsWith("http")
                          ? `<a href="${this.state.nft.tokenURI}" target="_blank" class="metadata-link">
                          ${this.state.nft.tokenURI}
                        </a>`
                          : `<span class="metadata-text">${this.state.nft.tokenURI.slice(
                              0,
                              50
                            )}...</span>`
                      }
                    </p>
                  </div>
                </div>

                ${
                  this.state.isOwner && !this.state.nft.isLocked
                    ? `
                  <div class="nft-detail-section">
                    <h3>NFT管理</h3>
                    <div class="nft-actions">
                      <button class="action-button transfer-button" onclick="window.nftDetailPage.showTransferModal()">
                        <span class="action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></span>
                        Transfer NFT
                      </button>
                      <button class="action-button burn-button" onclick="window.nftDetailPage.showBurnModal()">
                        <span class="action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C10 2 9 3.5 9 5c0 1.8.7 3.3 1.5 4.5C9.6 10.6 9 12 9 13.5c0 2 1.5 3.5 3.5 3.5s3.5-1.5 3.5-3.5c0-1.5-.6-2.9-1.5-4C15.3 8.3 16 6.8 16 5c0-1.5-1-3-4-3z"></path><path d="M8.5 18c0 2.5 1.5 4 3.5 4s3.5-1.5 3.5-4"></path></svg></span>
                        Burn NFT
                      </button>
                    </div>
                  </div>
                `
                    : ""
                }

                <div class="nft-detail-section tba-section">
                  <h3>Token Bound Account (TBA)</h3>
                  ${
                    !this.state.tbaAvailable
                      ? `
                    <div class="tba-unavailable">
                      <p class="info-text">TBA機能は現在利用できません（コントラクトがデプロイされていません）</p>
                    </div>
                  `
                      : this.state.tbaExists
                      ? `
                    <div class="tba-info">
                      <div class="detail-row">
                        <span class="detail-label">TBAアドレス</span>
                        <span class="detail-value">
                          ${AddressDisplay.render(this.state.tbaAddress, {
                            explorerUrl: getExplorerUrl(
                              this.state.tbaAddress,
                              "address"
                            ),
                          })}
                        </span>
                      </div>

                      <div class="tba-nfts">
                        <h4>TBA内のNFT (${this.state.tbaNFTs.length}個)</h4>
                        ${
                          this.state.tbaLoading
                            ? `
                          <div class="loading-container">
                            <span class="loading"></span>
                          </div>
                        `
                            : this.state.tbaNFTs.length > 0
                            ? `
                          <div class="tba-nft-grid">
                            ${this.state.tbaNFTs
                              .map(
                                (nft) => `
                              <div class="tba-nft-card">
                                <div onclick="window.router.navigate('nft/${
                                  nft.tokenId
                                }')" style="cursor: pointer;">
                                  <img src="${nft.image}" alt="${
                                  nft.name
                                }" onerror="this.src='./assets/logo.svg'">
                                  <h5>${nft.name}</h5>
                                  <p class="tba-nft-id">#${nft.tokenId}</p>
                                  ${
                                    nft.isLocked
                                      ? '<span class="nft-badge locked">SBT</span>'
                                      : ""
                                  }
                                </div>
                                ${
                                  this.state.isOwner && !nft.isLocked
                                    ? `
                                  <button class="tba-nft-send-btn" onclick="window.nftDetailPage.showTBASendModal('${
                                    nft.tokenId
                                  }', '${nft.name.replace(/'/g, "\\'")}')">
                                    Send
                                  </button>
                                `
                                    : ""
                                }
                              </div>
                            `
                              )
                              .join("")}
                          </div>
                        `
                            : `
                          <p class="no-nfts">TBA内にNFTがありません</p>
                        `
                        }
                      </div>
                    </div>
                  `
                      : `
                    <div class="tba-create">
                      <p>このNFTのTBAはまだ作成されていません</p>
                      ${
                        this.state.isOwner && isConnected
                          ? `
                        <button
                          onclick="window.nftDetailPage.createTBA()"
                          class="create-tba-button"
                          ${this.state.tbaLoading ? "disabled" : ""}
                        >
                          ${
                            this.state.tbaLoading
                              ? '<span class="loading"></span>作成中...'
                              : "TBAを作成"
                          }
                        </button>
                      `
                          : this.state.isOwner && !isConnected
                          ? `
                        <p class="info-text">TBAを作成するにはウォレットを接続してください</p>
                      `
                          : `
                        <p class="info-text">NFTのオーナーのみがTBAを作成できます</p>
                      `
                      }
                    </div>
                  `
                  }
                </div>
              </div>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  setActiveTab(tab) {
    this.setState({ activeTab: tab });
  }

  renderMediaTabs() {
    const { nft } = this.state;
    if (!nft) return "";

    const tabs = [];

    // Always show image tab
    tabs.push({
      id: "image",
      label: "Image",
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
    });

    // Show animation tab if animation_url exists
    if (nft.animationUrl) {
      tabs.push({
        id: "animation",
        label: "Animation",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
      });
    }

    // Show YouTube tab if youtube_url exists
    if (nft.youtubeUrl) {
      tabs.push({
        id: "youtube",
        label: "YouTube",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',
      });
    }

    // Return empty if only image tab
    if (tabs.length === 1) return "";

    return `
      <div class="media-tabs">
        ${tabs
          .map(
            (tab) => `
          <button
            class="media-tab ${this.state.activeTab === tab.id ? "active" : ""}"
            onclick="window.nftDetailPage.setActiveTab('${tab.id}')"
          >
            <span class="tab-icon">${tab.icon}</span>
            <span class="tab-label">${tab.label}</span>
          </button>
        `
          )
          .join("")}
      </div>
    `;
  }

  renderMediaContent() {
    const { nft, activeTab } = this.state;
    if (!nft) return "";

    switch (activeTab) {
      case "animation":
        if (!nft.animationUrl) return this.renderImage();
        return this.renderAnimation();

      case "youtube":
        if (!nft.youtubeUrl) return this.renderImage();
        return this.renderYouTube();

      case "image":
      default:
        return this.renderImage();
    }
  }

  renderImage() {
    const { nft } = this.state;
    return `<img src="${nft.image}" alt="${nft.name}" onerror="this.src='./assets/logo.svg'">`;
  }

  async detectContentType(url) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      const contentType = response.headers.get("content-type");
      console.log("Detected content-type:", contentType, "for URL:", url);
      return contentType;
    } catch (error) {
      console.error("Failed to detect content type:", error);
      return null;
    }
  }

  renderAnimation() {
    const { nft } = this.state;
    const animationUrl = nft.animationUrl;

    // For Arweave URLs without extension or mime type, try to detect
    if (
      !nft.mimeType &&
      animationUrl.includes("arweave.net") &&
      !animationUrl.match(/\.\w+$/)
    ) {
      // Assume it might be a 3D model if no extension
      console.log("Arweave URL without extension, trying 3D viewer");
      return `
        <iframe
          src="https://3d.bon-soleil.com/?src=${encodeURIComponent(
            animationUrl
          )}"
          frameborder="0"
          allowfullscreen
        ></iframe>
      `;
    }

    // Check mime type or file extension
    if (nft.mimeType) {
      if (nft.mimeType.startsWith("video/")) {
        return `
          <video controls autoplay loop muted>
            <source src="${animationUrl}" type="${nft.mimeType}">
            Your browser does not support the video tag.
          </video>
        `;
      } else if (nft.mimeType.startsWith("audio/")) {
        return `
          <div class="audio-container">
            <img src="${nft.image}" alt="${nft.name}" onerror="this.src='./assets/logo.svg'">
            <audio controls autoplay>
              <source src="${animationUrl}" type="${nft.mimeType}">
              Your browser does not support the audio element.
            </audio>
          </div>
        `;
      } else if (
        nft.mimeType === "text/html" ||
        animationUrl.endsWith(".html")
      ) {
        return `
          <iframe
            src="${animationUrl}"
            frameborder="0"
            sandbox="allow-scripts allow-same-origin"
            allowfullscreen
          ></iframe>
        `;
      } else if (
        nft.mimeType === "model/gltf-binary" ||
        nft.mimeType === "model/gltf+json"
      ) {
        // 3D model with specified mime type
        return `
          <iframe
            src="https://3d.bon-soleil.com/?src=${encodeURIComponent(
              animationUrl
            )}"
            frameborder="0"
            allowfullscreen
          ></iframe>
        `;
      }
    }

    // Guess by file extension
    if (animationUrl.match(/\.(glb|gltf)$/i)) {
      // 3D model viewer
      return `
        <iframe
          src="https://3d.bon-soleil.com/?src=${encodeURIComponent(
            animationUrl
          )}"
          frameborder="0"
          allowfullscreen
        ></iframe>
      `;
    } else if (animationUrl.match(/\.(mp4|webm|ogv)$/i)) {
      return `
        <video controls autoplay loop muted>
          <source src="${animationUrl}">
          Your browser does not support the video tag.
        </video>
      `;
    } else if (animationUrl.match(/\.(mp3|wav|ogg)$/i)) {
      return `
        <div class="audio-container">
          <img src="${nft.image}" alt="${nft.name}" onerror="this.src='./assets/logo.svg'">
          <audio controls autoplay>
            <source src="${animationUrl}">
            Your browser does not support the audio element.
          </audio>
        </div>
      `;
    } else if (animationUrl.match(/\.(html|htm)$/i)) {
      return `
        <iframe
          src="${animationUrl}"
          frameborder="0"
          sandbox="allow-scripts allow-same-origin"
          allowfullscreen
        ></iframe>
      `;
    } else if (animationUrl.match(/\.(gif|png|jpg|jpeg|svg|webp)$/i)) {
      return `<img src="${animationUrl}" alt="${nft.name} animation">`;
    }

    // Default to iframe for unknown types
    return `
      <iframe
        src="${animationUrl}"
        frameborder="0"
        sandbox="allow-scripts allow-same-origin"
        allowfullscreen
      ></iframe>
    `;
  }

  renderYouTube() {
    const { nft } = this.state;
    let videoId = "";

    // Extract video ID from various YouTube URL formats
    const youtubeUrl = nft.youtubeUrl;
    const match = youtubeUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    );

    if (match) {
      videoId = match[1];
    } else if (youtubeUrl.length === 11) {
      // Assume it's just the video ID
      videoId = youtubeUrl;
    }

    if (!videoId) {
      return this.renderImage();
    }

    return `
      <iframe
        src="https://www.youtube.com/embed/${videoId}?rel=0"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
  }

  showTransferModal() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Transfer NFT #${this.state.nft.tokenId}</h2>
        <div class="modal-body">
          <div class="form-group">
            <label>送信先アドレス</label>
            <input type="text" id="transfer-address" placeholder="0x..." />
          </div>
          <p class="warning-text">⚠️ この操作は取り消せません。送信先アドレスを確認してください。</p>
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" onclick="window.nftDetailPage.closeModal()">キャンセル</button>
          <button class="confirm-btn" onclick="window.nftDetailPage.transferNFT()">送信</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showBurnModal() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Burn NFT #${this.state.nft.tokenId}</h2>
        <div class="modal-body">
          <p class="warning-text">⚠️ この操作は取り消せません。このNFTは永久に失われます。</p>
          <p>本当にこのNFTをBurnしますか？</p>
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" onclick="window.nftDetailPage.closeModal()">キャンセル</button>
          <button class="burn-confirm-btn" onclick="window.nftDetailPage.burnNFT()">Burn</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showTBASendModal(tokenId, tokenName) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <h2>TBAからNFTを送信</h2>
        <div class="modal-body">
          <p>NFT: ${tokenName} (#${tokenId})</p>
          <div class="form-group">
            <label>送信先アドレス</label>
            <input type="text" id="tba-send-address" placeholder="0x..." />
          </div>
          <p class="info-text">TBA (${this.formatAddress(
            this.state.tbaAddress
          )}) から送信されます</p>
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" onclick="window.nftDetailPage.closeModal()">キャンセル</button>
          <button class="confirm-btn" onclick="window.nftDetailPage.sendFromTBA('${tokenId}')">送信</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  closeModal() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) {
      modal.remove();
    }
  }

  showImageModal(imageUrl) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay image-modal-overlay";
    modal.innerHTML = `
      <div class="image-modal-content">
        <button class="image-modal-close" onclick="window.nftDetailPage.closeModal()">×</button>
        <img src="${imageUrl}" alt="Expanded image" class="expanded-image" />
      </div>
    `;
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    };
    document.body.appendChild(modal);
  }

  async transferNFT() {
    const toAddress = document.getElementById("transfer-address").value;
    if (!toAddress || !ethers.isAddress(toAddress)) {
      alert("有効なアドレスを入力してください");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(walletManager.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ONCHAIN88_NFT,
        NFT_ABI,
        signer
      );

      const tx = await contract.transferFrom(
        this.state.nft.owner,
        toAddress,
        this.state.nft.tokenId
      );

      this.closeModal();
      alert("トランザクションを送信しました。処理完了までお待ちください。");

      await tx.wait();
      alert("NFTの転送が完了しました");
      window.router.navigate("nft");
    } catch (error) {
      console.error("Transfer failed:", error);
      alert("転送に失敗しました: " + error.message);
    }
  }

  async burnNFT() {
    try {
      const provider = new ethers.BrowserProvider(walletManager.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.ONCHAIN88_NFT,
        NFT_ABI,
        signer
      );

      const tx = await contract.burn(this.state.nft.tokenId);

      this.closeModal();
      alert("トランザクションを送信しました。処理完了までお待ちください。");

      await tx.wait();
      alert("NFTのBurnが完了しました");
      window.router.navigate("nft");
    } catch (error) {
      console.error("Burn failed:", error);
      alert("Burnに失敗しました: " + error.message);
    }
  }

  async sendFromTBA(tokenId) {
    const toAddress = document.getElementById("tba-send-address").value;
    if (!toAddress || !ethers.isAddress(toAddress)) {
      alert("有効なアドレスを入力してください");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(walletManager.ethereum);
      const signer = await provider.getSigner();
      const currentUser = await signer.getAddress();

      // Check if the current user is the owner of the NFT
      if (currentUser.toLowerCase() !== this.state.nft.owner.toLowerCase()) {
        alert("NFTのオーナーのみがTBAを操作できます");
        return;
      }

      // Create ERC721 contract interface
      const nftInterface = new ethers.Interface(NFT_ABI);

      // Encode the transferFrom function call
      const calldata = nftInterface.encodeFunctionData("transferFrom", [
        this.state.tbaAddress,
        toAddress,
        tokenId,
      ]);

      console.log("TBA Address:", this.state.tbaAddress);
      console.log("NFT Contract:", CONTRACT_ADDRESSES.ONCHAIN88_NFT);
      console.log("Calldata:", calldata);

      // TBA ABI for executeCall function
      const TBA_ABI = [
        "function executeCall(address to, uint256 value, bytes calldata data) payable returns (bytes memory result)",
      ];

      // Create TBA contract instance
      const tbaContract = new ethers.Contract(
        this.state.tbaAddress,
        TBA_ABI,
        signer
      );

      // Execute transfer via TBA using executeCall
      const tx = await tbaContract.executeCall(
        CONTRACT_ADDRESSES.ONCHAIN88_NFT, // to: NFT contract
        0, // value: 0 ETH
        calldata, // data: transferFrom calldata
        { gasLimit: 300000 } // Add gas limit
      );

      this.closeModal();
      alert("トランザクションを送信しました。処理完了までお待ちください。");

      await tx.wait();
      alert("TBAからのNFT送信が完了しました");

      // Reload TBA NFTs
      await this.loadTBANFTs();
    } catch (error) {
      console.error("Send from TBA failed:", error);
      alert("送信に失敗しました: " + error.message);
    }
  }
}

export const nftDetailPage = new NftDetailPage();
