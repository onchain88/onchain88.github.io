// モバイル用コンソールログビューア
class MobileConsole {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.isVisible = false;
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };
  }

  init() {
    this.createUI();
    this.interceptConsoleMethods();
    this.addToggleButton();
  }

  createUI() {
    // コンソールビューアのHTML
    const consoleHtml = `
      <div id="mobile-console" class="mobile-console" style="display: none;">
        <div class="console-header">
          <h3>Console Log</h3>
          <div class="console-actions">
            <button onclick="mobileConsole.clearCache()">Clear Cache</button>
            <button onclick="mobileConsole.clear()">Clear Logs</button>
            <button onclick="mobileConsole.toggle()">×</button>
          </div>
        </div>
        <div id="console-logs" class="console-logs"></div>
      </div>
    `;

    // スタイル
    const style = document.createElement("style");
    style.textContent = `
      .mobile-console {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 40vh;
        background: #1a1a1a;
        border-top: 2px solid #333;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        font-family: monospace;
      }
      .console-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background: #2a2a2a;
        border-bottom: 1px solid #333;
      }
      .console-header h3 {
        margin: 0;
        font-size: 14px;
        color: #fff;
      }
      .console-actions {
        display: flex;
        gap: 0.5rem;
      }
      .console-actions button {
        padding: 0.25rem 0.5rem;
        background: #444;
        color: #fff;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
      }
      .console-actions button:hover {
        background: #555;
      }
      .console-logs {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
        font-size: 12px;
      }
      .console-log-entry {
        padding: 0.25rem 0.5rem;
        border-bottom: 1px solid #333;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .console-log-entry.log {
        color: #ddd;
      }
      .console-log-entry.error {
        color: #ff6b6b;
        background: rgba(255, 107, 107, 0.1);
      }
      .console-log-entry.warn {
        color: #ffd93d;
        background: rgba(255, 217, 61, 0.1);
      }
      .console-log-entry.info {
        color: #4ecdc4;
      }
      .console-log-time {
        color: #888;
        font-size: 10px;
        margin-right: 0.5rem;
      }
      .console-toggle-btn {
        position: fixed;
        bottom: 70px;
        right: 2px;
        width: 40px;
        padding: 3px 0;
        background: rgba(33, 33, 33, 0.3);
        color: rgba(255, 255, 255, 0.7);
        border: none;
        border-radius: 3px 3px 0 0 ;
        font-size: 6px;
        font-weight: 400;
        cursor: pointer;
        z-index: 10;
        transition: all 0.3s ease;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        text-align: center;
      }
      .console-toggle-btn:before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: rgba(255, 255, 255, 0.1);
      }
      .console-toggle-btn:hover {
        background: rgba(66, 66, 66, 0.3);
        color: rgba(255, 255, 255, 1);
      }
      .console-toggle-btn.has-errors {
        background: rgba(255, 107, 107, 0.5);
      }
      @keyframes pulse {
        0% { opacity: 0.7; }
        50% { opacity: 1; }
        100% { opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);

    // HTMLを追加
    document.body.insertAdjacentHTML("beforeend", consoleHtml);
  }

  addToggleButton() {
    const button = document.createElement("button");
    button.id = "console-toggle-btn";
    button.className = "console-toggle-btn";
    button.textContent = "LOG";
    button.onclick = () => this.toggle();
    document.body.appendChild(button);
  }

  interceptConsoleMethods() {
    // console.log
    console.log = (...args) => {
      this.addLog("log", args);
      this.originalConsole.log.apply(console, args);
    };

    // console.error
    console.error = (...args) => {
      this.addLog("error", args);
      this.originalConsole.error.apply(console, args);
      // エラーがある場合はボタンを赤くする
      const btn = document.getElementById("console-toggle-btn");
      if (btn) btn.classList.add("has-errors");
    };

    // console.warn
    console.warn = (...args) => {
      this.addLog("warn", args);
      this.originalConsole.warn.apply(console, args);
    };

    // console.info
    console.info = (...args) => {
      this.addLog("info", args);
      this.originalConsole.info.apply(console, args);
    };

    // グローバルエラーをキャッチ
    window.addEventListener("error", (event) => {
      this.addLog("error", [
        `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
      ]);
      const btn = document.getElementById("console-toggle-btn");
      if (btn) btn.classList.add("has-errors");
    });

    // Promiseのエラーをキャッチ
    window.addEventListener("unhandledrejection", (event) => {
      this.addLog("error", ["Unhandled Promise Rejection:", event.reason]);
      const btn = document.getElementById("console-toggle-btn");
      if (btn) btn.classList.add("has-errors");
    });
  }

  addLog(type, args) {
    const timestamp = new Date().toLocaleTimeString();
    const message = args
      .map((arg) => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(" ");

    this.logs.push({ type, message, timestamp });

    // 最大ログ数を超えたら古いものを削除
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // UIを更新
    this.updateUI();
  }

  updateUI() {
    const logsContainer = document.getElementById("console-logs");
    if (!logsContainer || !this.isVisible) return;

    logsContainer.innerHTML = this.logs
      .map(
        (log) => `
      <div class="console-log-entry ${log.type}">
        <span class="console-log-time">${log.timestamp}</span>
        ${this.escapeHtml(log.message)}
      </div>
    `
      )
      .join("");

    // 最新のログまでスクロール
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  toggle() {
    this.isVisible = !this.isVisible;
    const consoleEl = document.getElementById("mobile-console");
    const bottomNav = document.querySelector(".bottom-nav");

    if (consoleEl) {
      consoleEl.style.display = this.isVisible ? "flex" : "none";
      if (this.isVisible) {
        this.updateUI();
      }
    }

    // ボトムナビゲーションとページコンテンツを調整
    if (bottomNav) {
      if (this.isVisible) {
        bottomNav.style.bottom = "40vh";
        bottomNav.style.transition = "bottom 0.3s ease";
      } else {
        bottomNav.style.bottom = ""; // スタイルを削除してCSSの初期値に戻す
        bottomNav.style.removeProperty("bottom");
        bottomNav.style.transition = "bottom 0.3s ease";
      }
    }

    // ページコンテンツの高さを調整
    const pageContent = document.getElementById("page-content");
    if (pageContent) {
      if (this.isVisible) {
        pageContent.style.paddingBottom = "calc(60px + 40vh)"; // ボトムナビ + コンソール
      } else {
        pageContent.style.paddingBottom = "60px"; // ボトムナビのみ
      }
    }

    // LOGボタンの位置を調整
    const toggleBtn = document.getElementById("console-toggle-btn");
    if (toggleBtn) {
      if (this.isVisible) {
        toggleBtn.style.bottom = "calc(40vh + 70px)";
      } else {
        toggleBtn.style.bottom = "70px";
      }
    }
  }

  clear() {
    this.logs = [];
    this.updateUI();
    const btn = document.getElementById("console-toggle-btn");
    if (btn) btn.classList.remove("has-errors");
  }

  async clearCache() {
    try {
      // ローカルストレージをクリア
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
        this.addLog('info', ['LocalStorage cleared']);
      }

      // セッションストレージをクリア
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
        this.addLog('info', ['SessionStorage cleared']);
      }

      // Service Workerのキャッシュをクリア
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            return caches.delete(cacheName);
          })
        );
        this.addLog('info', [`Service Worker caches cleared (${cacheNames.length} caches)`]);
      }

      // Service Workerの登録を解除して再登録（完全リセット）
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
        this.addLog('info', ['Service Workers unregistered']);
      }

      // IndexedDBをクリア（もし使用している場合）
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        for (let db of databases) {
          indexedDB.deleteDatabase(db.name);
          this.addLog('info', [`IndexedDB '${db.name}' deleted`]);
        }
      }

      // 成功メッセージ
      this.addLog('info', ['✅ All caches cleared successfully!']);
      
      // 少し待ってからページをリロード
      setTimeout(() => {
        this.addLog('info', ['Reloading page...']);
        window.location.reload(true); // true = キャッシュを無視してリロード
      }, 1000);

    } catch (error) {
      this.addLog('error', ['Failed to clear cache:', error.message]);
    }
  }

  show() {
    this.isVisible = true;
    const consoleEl = document.getElementById("mobile-console");
    const bottomNav = document.querySelector(".bottom-nav");

    if (consoleEl) {
      consoleEl.style.display = "flex";
      this.updateUI();
    }

    // ボトムナビゲーションを調整
    if (bottomNav) {
      bottomNav.style.bottom = "40vh";
      bottomNav.style.transition = "bottom 0.3s ease";
    }

    // ページコンテンツの高さを調整
    const pageContent = document.getElementById("page-content");
    if (pageContent) {
      pageContent.style.paddingBottom = "calc(60px + 40vh)";
    }

    // LOGボタンの位置を調整
    const toggleBtn = document.getElementById("console-toggle-btn");
    if (toggleBtn) {
      toggleBtn.style.bottom = "calc(40vh + 70px)";
    }
  }

  hide() {
    this.isVisible = false;
    const consoleEl = document.getElementById("mobile-console");
    const bottomNav = document.querySelector(".bottom-nav");

    if (consoleEl) {
      consoleEl.style.display = "none";
    }

    // ボトムナビゲーションを元に戻す
    if (bottomNav) {
      bottomNav.style.removeProperty("bottom");
      bottomNav.style.removeProperty("transition");
    }

    // ページコンテンツの高さを元に戻す
    const pageContent = document.getElementById("page-content");
    if (pageContent) {
      pageContent.style.paddingBottom = "60px";
    }

    // LOGボタンの位置を元に戻す
    const toggleBtn = document.getElementById("console-toggle-btn");
    if (toggleBtn) {
      toggleBtn.style.bottom = "70px";
    }
  }
}

// グローバルインスタンスを作成
window.mobileConsole = new MobileConsole();

// DOMContentLoadedで初期化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.mobileConsole.init();
  });
} else {
  window.mobileConsole.init();
}

export { MobileConsole };
