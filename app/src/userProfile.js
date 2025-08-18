// User Profile Management
import { ethers } from 'ethers';
import { walletManager } from './wallet';
import { NFT_CONTRACT_ABI, NFT_CONTRACT_ADDRESS } from './contract';
import { 
  processImageToBase64, 
  validateImageFile, 
  createImagePreview,
  getBase64SizeKB,
  DEFAULT_AVATAR 
} from './imageUtils';

class UserProfileManager {
  constructor() {
    this.contract = null;
    this.currentUserInfo = null;
  }

  /**
   * Initialize the user profile manager with contract
   */
  async initialize() {
    const provider = walletManager.getProvider();
    const signer = walletManager.getSigner();
    
    if (!signer) {
      throw new Error('No wallet connected');
    }

    this.contract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_CONTRACT_ABI,
      signer
    );
  }

  /**
   * Get user information from contract
   * @param {string} address - User address (optional, defaults to current user)
   * @returns {Promise<Object>} User information
   */
  async getUserInfo(address = null) {
    if (!this.contract) {
      await this.initialize();
    }

    const userAddress = address || walletManager.getAccount();
    if (!userAddress) {
      throw new Error('No address provided');
    }

    try {
      const [memberName, discordId, avatarImage] = await this.contract.getUserInfo(userAddress);
      
      this.currentUserInfo = {
        memberName,
        discordId,
        avatarImage: avatarImage || DEFAULT_AVATAR,
        address: userAddress
      };

      return this.currentUserInfo;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Set user information on contract
   * @param {Object} userInfo - User information to set
   * @param {string} userInfo.memberName - Member name
   * @param {string} userInfo.discordId - Discord ID
   * @param {string} userInfo.avatarImage - Base64 encoded avatar image
   * @returns {Promise<Object>} Transaction receipt
   */
  async setUserInfo({ memberName, discordId, avatarImage }) {
    if (!this.contract) {
      await this.initialize();
    }

    // Check if user has minted token
    const hasMinted = await this.contract.hasMinted(walletManager.getAccount());
    if (!hasMinted) {
      throw new Error('You must mint a membership card first');
    }

    // Validate inputs
    if (!memberName || memberName.trim().length === 0) {
      throw new Error('Member name is required');
    }

    // Use empty string if no avatar provided (contract will use default)
    const avatar = avatarImage || '';

    // Check avatar size if provided
    if (avatar && avatar !== DEFAULT_AVATAR) {
      const sizeKB = getBase64SizeKB(avatar);
      if (sizeKB > 100) { // 100KB limit for on-chain storage
        throw new Error(`Avatar image too large (${sizeKB}KB). Maximum size: 100KB`);
      }
    }

    try {
      const tx = await this.contract.setUserInfo(
        memberName.trim(),
        discordId ? discordId.trim() : '',
        avatar
      );

      const receipt = await tx.wait();
      
      // Update cached info
      this.currentUserInfo = {
        memberName: memberName.trim(),
        discordId: discordId ? discordId.trim() : '',
        avatarImage: avatar || DEFAULT_AVATAR,
        address: walletManager.getAccount()
      };

      return receipt;
    } catch (error) {
      console.error('Error setting user info:', error);
      
      if (error.message.includes('user rejected')) {
        throw new Error('Transaction cancelled by user');
      }
      
      throw new Error('Failed to update user information');
    }
  }

  /**
   * Process and validate avatar image
   * @param {File} file - Image file to process
   * @returns {Promise<string>} Base64 encoded image
   */
  async processAvatarImage(file) {
    // Validate file
    const validation = validateImageFile(file, {
      maxSizeMB: 1, // 1MB limit before processing
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Process image
    const base64Image = await processImageToBase64(file, {
      maxWidth: 200,
      maxHeight: 200,
      quality: 0.7 // Lower quality for smaller size
    });

    // Check final size
    const finalSizeKB = getBase64SizeKB(base64Image);
    if (finalSizeKB > 100) {
      throw new Error(`Processed image still too large (${finalSizeKB}KB). Try a simpler image.`);
    }

    return base64Image;
  }

  /**
   * Create user profile UI element
   * @returns {HTMLElement} Profile form element
   */
  createProfileUI() {
    const container = document.createElement('div');
    container.className = 'user-profile-container';
    container.innerHTML = `
      <div class="profile-header">
        <h3>Member Profile</h3>
        <p class="profile-subtitle">Update your membership information</p>
      </div>
      
      <div class="profile-form">
        <div class="avatar-section">
          <div class="avatar-preview" id="avatarPreview">
            <img src="${DEFAULT_AVATAR}" alt="Avatar preview" />
          </div>
          <div class="avatar-upload">
            <input type="file" id="avatarInput" accept="image/*" style="display: none;" />
            <button class="secondary small" id="uploadButton">Choose Avatar</button>
            <button class="secondary small" id="removeButton" style="display: none;">Remove</button>
            <p class="avatar-info">Max 200x200px, 100KB</p>
          </div>
        </div>
        
        <div class="form-group">
          <label for="memberName">Member Name</label>
          <input type="text" id="memberName" placeholder="Enter your name" maxlength="50" />
        </div>
        
        <div class="form-group">
          <label for="discordId">Discord ID</label>
          <input type="text" id="discordId" placeholder="username#1234" maxlength="50" />
        </div>
        
        <div class="profile-actions">
          <button id="saveProfile" class="primary">Save Profile</button>
          <button id="loadProfile" class="secondary">Refresh</button>
        </div>
        
        <div id="profileMessage" class="message" style="display: none;"></div>
      </div>
    `;

    // Add event listeners
    this.attachEventListeners(container);
    
    return container;
  }

  /**
   * Attach event listeners to profile UI
   * @param {HTMLElement} container - Profile container element
   */
  attachEventListeners(container) {
    const avatarInput = container.querySelector('#avatarInput');
    const uploadButton = container.querySelector('#uploadButton');
    const removeButton = container.querySelector('#removeButton');
    const avatarPreview = container.querySelector('#avatarPreview img');
    const saveButton = container.querySelector('#saveProfile');
    const loadButton = container.querySelector('#loadProfile');
    const messageEl = container.querySelector('#profileMessage');
    
    let currentAvatarBase64 = null;

    // Upload button
    uploadButton.addEventListener('click', () => {
      avatarInput.click();
    });

    // File input change
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        messageEl.style.display = 'none';
        uploadButton.disabled = true;
        uploadButton.textContent = 'Processing...';

        currentAvatarBase64 = await this.processAvatarImage(file);
        avatarPreview.src = currentAvatarBase64;
        removeButton.style.display = 'inline-block';
        
        uploadButton.textContent = 'Change Avatar';
      } catch (error) {
        this.showMessage(messageEl, error.message, 'error');
        uploadButton.textContent = 'Choose Avatar';
      } finally {
        uploadButton.disabled = false;
      }
    });

    // Remove button
    removeButton.addEventListener('click', () => {
      currentAvatarBase64 = null;
      avatarPreview.src = DEFAULT_AVATAR;
      avatarInput.value = '';
      removeButton.style.display = 'none';
    });

    // Save button
    saveButton.addEventListener('click', async () => {
      const memberName = container.querySelector('#memberName').value;
      const discordId = container.querySelector('#discordId').value;

      try {
        messageEl.style.display = 'none';
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="loading"></span>Saving...';

        await this.setUserInfo({
          memberName,
          discordId,
          avatarImage: currentAvatarBase64
        });

        this.showMessage(messageEl, 'Profile updated successfully!', 'success');
      } catch (error) {
        this.showMessage(messageEl, error.message, 'error');
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Profile';
      }
    });

    // Load button
    loadButton.addEventListener('click', async () => {
      try {
        messageEl.style.display = 'none';
        loadButton.disabled = true;
        loadButton.innerHTML = '<span class="loading"></span>Loading...';

        const info = await this.getUserInfo();
        
        container.querySelector('#memberName').value = info.memberName || '';
        container.querySelector('#discordId').value = info.discordId || '';
        avatarPreview.src = info.avatarImage || DEFAULT_AVATAR;
        
        if (info.avatarImage && info.avatarImage !== DEFAULT_AVATAR) {
          currentAvatarBase64 = info.avatarImage;
          removeButton.style.display = 'inline-block';
        }

        this.showMessage(messageEl, 'Profile loaded successfully!', 'success');
      } catch (error) {
        this.showMessage(messageEl, error.message, 'error');
      } finally {
        loadButton.disabled = false;
        loadButton.textContent = 'Refresh';
      }
    });
  }

  /**
   * Show message in UI
   * @param {HTMLElement} element - Message element
   * @param {string} text - Message text
   * @param {string} type - Message type (success/error/info)
   */
  showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message ${type}`;
    element.style.display = 'block';
    
    if (type === 'success') {
      setTimeout(() => {
        element.style.display = 'none';
      }, 5000);
    }
  }
}

export const userProfileManager = new UserProfileManager();