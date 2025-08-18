export class AddressDisplay {
  /**
   * アドレスを短縮形式で表示し、クリックでコピー機能を提供
   * @param {string} address - 表示するアドレス
   * @param {Object} options - オプション設定
   * @param {boolean} options.showCopyIcon - コピーアイコンを表示するか
   * @param {string} options.explorerUrl - エクスプローラーのURL（指定時はリンクも追加）
   * @param {string} options.className - 追加のCSSクラス
   * @returns {string} HTMLコンテンツ
   */
  static render(address, options = {}) {
    if (!address) return '';
    
    const {
      showCopyIcon = true,
      explorerUrl = null,
      className = ''
    } = options;
    
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    const uniqueId = `addr-${Math.random().toString(36).substr(2, 9)}`;
    
    // グローバルにコピー関数を登録
    if (!window.__addressCopyHandlers) {
      window.__addressCopyHandlers = {};
    }
    
    window.__addressCopyHandlers[uniqueId] = async function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      const element = document.getElementById(uniqueId);
      if (!element) return;
      
      try {
        await navigator.clipboard.writeText(address);
        
        // コピー成功のフィードバック
        const addressElement = element.querySelector('.address-text') || element;
        const originalText = addressElement.textContent;
        const originalTitle = addressElement.title || '';
        
        addressElement.textContent = 'Copied!';
        addressElement.title = `${address} copied to clipboard`;
        element.classList.add('copied');
        
        // コピーアイコンのアニメーション
        const copyIcon = element.querySelector('.copy-icon');
        if (copyIcon) {
          copyIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        }
        
        setTimeout(() => {
          addressElement.textContent = originalText;
          addressElement.title = originalTitle;
          element.classList.remove('copied');
          if (copyIcon) {
            copyIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
          }
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        // フォールバック
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          element.classList.add('copied');
          setTimeout(() => element.classList.remove('copied'), 2000);
        } catch (err2) {
          alert('Failed to copy address');
        }
        document.body.removeChild(textArea);
      }
    };
    
    const addressContent = `
      <span class="address-text">${shortAddress}</span>
      ${showCopyIcon ? '<span class="copy-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></span>' : ''}
    `;
    
    if (explorerUrl) {
      // エクスプローラーリンク付きの場合
      return `
        <span id="${uniqueId}" class="address-display-wrapper ${className}">
          <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="address-link" title="View on explorer">
            <span class="address-text">${shortAddress}</span>
          </a>
          <button class="address-copy-btn copy-trigger" onclick="window.__addressCopyHandlers['${uniqueId}'](event)" title="Copy full address: ${address}">
            ${showCopyIcon ? '<span class="copy-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></span>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'}
          </button>
        </span>
      `;
    } else {
      // コピー機能のみの場合
      return `
        <button id="${uniqueId}" class="address-display ${className}" onclick="window.__addressCopyHandlers['${uniqueId}'](event)" title="Click to copy: ${address}">
          ${addressContent}
        </button>
      `;
    }
  }
  
  /**
   * 複数のアドレス要素を一括で初期化（ページ読み込み後に使用）
   */
  static initializeAll() {
    document.querySelectorAll('[data-address]').forEach(element => {
      const address = element.getAttribute('data-address');
      const showIcon = element.getAttribute('data-show-icon') !== 'false';
      const explorerUrl = element.getAttribute('data-explorer-url');
      
      element.innerHTML = AddressDisplay.render(address, {
        showCopyIcon: showIcon,
        explorerUrl: explorerUrl
      });
    });
  }
  
  /**
   * グローバルハンドラーのクリーンアップ
   */
  static cleanup() {
    if (window.__addressCopyHandlers) {
      window.__addressCopyHandlers = {};
    }
  }
}

// グローバルに公開
window.AddressDisplay = AddressDisplay;