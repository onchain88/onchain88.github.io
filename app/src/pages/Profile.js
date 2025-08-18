import { header } from "../components/Header";
import { nftMinter } from "../mint";
import {
  CHAIN_CONFIG,
  getExplorerUrl,
  getCurrencySymbol,
  isDevelopment,
  FORCE_PRIVATE_CHAIN,
} from "../config";
import { userProfileManager } from "../userProfile";
import {
  DEFAULT_AVATAR,
  processImageToBase64,
  validateImageFile,
  getBase64SizeKB,
} from "../imageUtils";
import { walletManager } from "../wallet";

export class ProfilePage {
  constructor() {
    this.isLoading = false;
    this.autoConnectAttempted = false;
  }

  async render() {
    const pageContent = document.getElementById("page-content");
    if (!pageContent) return;

    // モバイル判定
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isMetaMaskBrowser = window.ethereum && window.ethereum.isMetaMask;

    // 現在の接続状態を取得
    let { isConnected, account } = header.getConnectionStatus();

    // MetaMaskブラウザで未接続なら自動接続（初回のみ）
    if (!isConnected && isMetaMaskBrowser && !this.autoConnectAttempted) {
      console.log(
        "Profile: MetaMask browser detected, attempting auto-connect..."
      );
      this.autoConnectAttempted = true;

      try {
        // 既存の接続リクエストがないか確認
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts && accounts.length > 0) {
          // 既に接続されている場合は、ヘッダーの状態を更新
          await header.checkConnection();
          ({ isConnected, account } = header.getConnectionStatus());
        } else {
          // 接続されていない場合のみ新規接続
          await header.connectWallet();
          ({ isConnected, account } = header.getConnectionStatus());
        }
        console.log("Profile: Auto-connect result:", { isConnected, account });
      } catch (error) {
        // -32002エラーは無視（既に処理中）
        if (error.code !== -32002) {
          console.error("Profile: Auto-connect failed:", error);
        }
      }
    }

    // モバイルでMetaMaskブラウザ以外の場合、MetaMaskリンクを表示
    const shouldShowMetaMaskLink = isMobile && !isMetaMaskBrowser;

    let html = `
      <div class="page profile-page">
        <div class="page-header">
          <h1>Member Profile</h1>
          <p class="page-subtitle">Manage your onchain88 membership</p>
        </div>
    `;

    if (!isConnected) {
      html += `
        <div class="wallet-notice">
          <p>Please connect your wallet using the button in the header to access your profile.</p>
        </div>

        ${
          shouldShowMetaMaskLink
            ? `
          <div class="profile-cta metamask-mobile-cta">
            <h2>MetaMaskでアクセス</h2>
            <p>モバイルでご利用の場合は、MetaMaskアプリからアクセスしてください</p>
            <a href="https://metamask.app.link/dapp/${window.location.hostname}${window.location.pathname}${window.location.hash}"
               class="cta-button">
              <img src="/assets/metamaskicon.svg" alt="MetaMask" width="24" height="24" />
              MetaMaskで開く
            </a>
          </div>
        `
            : ""
        }
      </div>
      `;
      pageContent.innerHTML = html;
      return;
    }

    // コントラクト情報を取得
    try {
      await nftMinter.initialize();
      const contractInfo = await nftMinter.fetchContractData();
      const contractToUse = nftMinter.readOnlyContract || nftMinter.contract;
      const hasMinted = await contractToUse.hasMinted(account);

      if (hasMinted) {
        // NFTを既に持っている場合、プロフィール編集フォームを表示
        html += await this.renderProfileForm();
      } else {
        // NFTを持っていない場合、ミントフォームを表示
        html += this.renderMintForm(contractInfo);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
      html += `
        <div class="message error">
          Failed to load profile information. Please try again later.
        </div>
      `;
    }

    html += `</div>`;
    pageContent.innerHTML = html;

    // イベントリスナーを設定
    this.attachEventListeners();
  }

  renderMintForm(contractInfo) {
    return `
      <div class="mint-section">
        <div class="contract-info">
          <div class="info-item">
            <div class="info-label">Price</div>
            <div class="info-value">FREE</div>
          </div>
          <div class="info-item">
            <div class="info-label">Minted</div>
            <div class="info-value">${contractInfo.totalSupply}</div>
          </div>
        </div>

        <div class="mint-controls">
          <div class="sbt-info">
            <p class="sbt-notice">🎫 One membership card per wallet</p>
            <p class="sbt-notice">💎 Soul Bound Token (Non-transferable)</p>
            <p class="sbt-notice">🆓 Free mint (gas only)</p>
          </div>

          <div class="mint-form">
            <h3>Member Information</h3>

            <div class="form-group">
              <label for="mintMemberName">Member Name *</label>
              <input
                type="text"
                id="mintMemberName"
                placeholder="Enter your name"
                maxlength="50"
              />
            </div>

            <div class="form-group">
              <label for="mintDiscordId">Discord ID (Optional)</label>
              <input
                type="text"
                id="mintDiscordId"
                placeholder="username#1234"
                maxlength="50"
              />
            </div>

            <div class="form-group">
              <label>Avatar Image (Optional)</label>
              <div class="avatar-upload-section">
                <div class="avatar-placeholder" id="mintAvatarPreview">
                  <img src="${DEFAULT_AVATAR}" alt="Default avatar" />
                </div>
                <div class="avatar-upload-controls">
                  <input type="file" id="mintAvatarInput" accept="image/*" style="display: none;" />
                  <button class="secondary small" id="mintAvatarButton">Choose Avatar</button>
                  <p class="avatar-info">Max 200x200px, 100KB</p>
                </div>
              </div>
            </div>

            <button id="mintButton" class="mint-button">
              Mint Membership Card
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async renderProfileForm() {
    await userProfileManager.initialize();

    let memberName = "";
    let discordId = "";
    let avatarImage = DEFAULT_AVATAR;

    try {
      await userProfileManager.getUserInfo();
      const info = userProfileManager.currentUserInfo;
      if (info) {
        memberName = info.memberName || "";
        discordId = info.discordId || "";
        avatarImage = info.avatarImage || DEFAULT_AVATAR;
      }
    } catch (err) {
      console.log("No existing profile data");
    }

    return `
      <div class="user-profile-container">
        <div class="profile-header">
          <h3>Member Profile</h3>
          <p class="profile-subtitle">Update your membership information</p>
        </div>

        <div class="profile-form">
          <div class="avatar-section">
            <div class="avatar-preview" id="avatarPreview">
              <img src="${avatarImage}" alt="Avatar preview" />
            </div>
            <div class="avatar-upload">
              <input type="file" id="avatarInput" accept="image/*" style="display: none;" />
              <button class="secondary small" id="uploadButton">Choose Avatar</button>
              <button class="secondary small" id="removeButton" style="${
                avatarImage === DEFAULT_AVATAR ? "display: none;" : ""
              }">Remove</button>
              <p class="avatar-info">Max 200x200px, 100KB</p>
            </div>
          </div>

          <div class="form-group">
            <label for="memberName">Member Name</label>
            <input type="text" id="memberName" placeholder="Enter your name" maxlength="50" value="${memberName}" />
          </div>

          <div class="form-group">
            <label for="discordId">Discord ID</label>
            <input type="text" id="discordId" placeholder="username#1234" maxlength="50" value="${discordId}" />
          </div>

          <div class="profile-actions">
            <button id="saveProfile" class="primary">Save Profile</button>
          </div>

          <div id="profileMessage" class="message" style="display: none;"></div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // ミントフォームのイベントリスナー
    const mintButton = document.getElementById("mintButton");
    if (mintButton) {
      mintButton.addEventListener("click", () => this.handleMint());

      const avatarButton = document.getElementById("mintAvatarButton");
      const avatarInput = document.getElementById("mintAvatarInput");

      avatarButton.addEventListener("click", () => avatarInput.click());
      avatarInput.addEventListener("change", (e) =>
        this.handleMintAvatarUpload(e)
      );
    }

    // プロフィールフォームのイベントリスナー
    const saveButton = document.getElementById("saveProfile");
    if (saveButton) {
      saveButton.addEventListener("click", () => this.handleSaveProfile());

      const uploadButton = document.getElementById("uploadButton");
      const avatarInput = document.getElementById("avatarInput");
      const removeButton = document.getElementById("removeButton");

      uploadButton.addEventListener("click", () => avatarInput.click());
      avatarInput.addEventListener("change", (e) =>
        this.handleProfileAvatarUpload(e)
      );
      removeButton.addEventListener("click", () => this.handleRemoveAvatar());
    }
  }

  async handleMint() {
    const memberName = document.getElementById("mintMemberName").value.trim();
    const discordId = document.getElementById("mintDiscordId").value.trim();
    const avatarImage =
      document.getElementById("mintAvatarPreview").querySelector("img").dataset
        .base64 || "";

    if (!memberName) {
      alert("Please enter your member name");
      return;
    }

    if (this.isLoading) return;
    this.isLoading = true;

    const button = document.getElementById("mintButton");
    button.innerHTML = '<span class="loading"></span>Minting...';
    button.disabled = true;

    try {
      const result = await nftMinter.mint(1);

      await userProfileManager.initialize();
      await userProfileManager.setUserInfo({
        memberName,
        discordId,
        avatarImage,
      });

      alert("Membership card minted and profile set!");

      // ページを再レンダリング
      await this.render();
    } catch (error) {
      console.error("Minting error:", error);
      alert(error.message || "Failed to mint membership card");
      button.innerHTML = "Mint Membership Card";
      button.disabled = false;
    } finally {
      this.isLoading = false;
    }
  }

  async handleSaveProfile() {
    const memberName = document.getElementById("memberName").value.trim();
    const discordId = document.getElementById("discordId").value.trim();
    const avatarImage =
      document.getElementById("avatarPreview").querySelector("img").dataset
        .base64 ||
      document.getElementById("avatarPreview").querySelector("img").src;

    if (!memberName) {
      this.showMessage("Please enter your member name", "error");
      return;
    }

    if (this.isLoading) return;
    this.isLoading = true;

    const button = document.getElementById("saveProfile");
    button.innerHTML = '<span class="loading"></span>Saving...';
    button.disabled = true;

    try {
      await userProfileManager.setUserInfo({
        memberName,
        discordId,
        avatarImage: avatarImage === DEFAULT_AVATAR ? "" : avatarImage,
      });

      this.showMessage("Profile updated successfully!", "success");
    } catch (error) {
      console.error("Save error:", error);
      this.showMessage(error.message || "Failed to update profile", "error");
    } finally {
      button.innerHTML = "Save Profile";
      button.disabled = false;
      this.isLoading = false;
    }
  }

  async handleMintAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const validation = validateImageFile(file, {
        maxSizeMB: 1,
        allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
      });

      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      const base64Image = await processImageToBase64(file, {
        maxWidth: 200,
        maxHeight: 200,
        quality: 0.7,
      });

      const sizeKB = getBase64SizeKB(base64Image);
      if (sizeKB > 100) {
        alert(`Image too large (${sizeKB}KB). Maximum: 100KB`);
        return;
      }

      const preview = document
        .getElementById("mintAvatarPreview")
        .querySelector("img");
      preview.src = base64Image;
      preview.dataset.base64 = base64Image;

      document.getElementById("mintAvatarButton").textContent = "Change Avatar";
    } catch (error) {
      alert("Failed to process image");
    }
  }

  async handleProfileAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const base64Image = await userProfileManager.processAvatarImage(file);

      const preview = document
        .getElementById("avatarPreview")
        .querySelector("img");
      preview.src = base64Image;
      preview.dataset.base64 = base64Image;

      document.getElementById("removeButton").style.display = "inline-block";
      document.getElementById("uploadButton").textContent = "Change Avatar";
    } catch (error) {
      this.showMessage(error.message, "error");
    }
  }

  handleRemoveAvatar() {
    const preview = document
      .getElementById("avatarPreview")
      .querySelector("img");
    preview.src = DEFAULT_AVATAR;
    preview.dataset.base64 = "";

    document.getElementById("removeButton").style.display = "none";
    document.getElementById("uploadButton").textContent = "Choose Avatar";
    document.getElementById("avatarInput").value = "";
  }

  showMessage(text, type = "info") {
    const messageEl = document.getElementById("profileMessage");
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = "block";

    if (type !== "error") {
      setTimeout(() => {
        messageEl.style.display = "none";
      }, 5000);
    }
  }
}

export const profilePage = new ProfilePage();
