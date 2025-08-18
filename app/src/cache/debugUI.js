// Cache Debug UI for Development

import { indexedDbCache } from "./indexedDbCache.js";

export class CacheDebugUI {
  constructor() {
    this.isVisible = false;
    this.container = null;
  }

  init() {
    // Create debug UI container
    this.container = document.createElement("div");
    this.container.id = "cache-debug-ui";
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      min-width: 250px;
      max-width: 400px;
      z-index: 10000;
      display: none;
    `;

    // Add toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "🔧";
    toggleBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #333;
      color: white;
      border: none;
      cursor: pointer;
      z-index: 10001;
      font-size: 20px;
    `;
    toggleBtn.onclick = () => this.toggle();

    document.body.appendChild(toggleBtn);
    document.body.appendChild(this.container);

    // Update metrics every 2 seconds
    setInterval(() => {
      if (this.isVisible) {
        this.updateMetrics();
      }
    }, 2000);
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? "block" : "none";
    if (this.isVisible) {
      this.updateMetrics();
    }
  }

  async updateMetrics() {
    const metrics = indexedDbCache.getMetrics();
    const cacheSize = await indexedDbCache.db.getCacheSize();
    const cacheSizeMB = (cacheSize / 1024 / 1024).toFixed(2);

    this.container.innerHTML = `
      <h3 style="margin: 0 0 10px 0;">onchain88 Cache Debug</h3>
      <div style="margin-bottom: 10px;">
        <strong>Hit Rate:</strong> ${metrics.hitRate}<br>
        <strong>Hits:</strong> ${metrics.hits}<br>
        <strong>Misses:</strong> ${metrics.misses}<br>
        <strong>Total Requests:</strong> ${metrics.totalRequests}<br>
        <strong>Evictions:</strong> ${metrics.evictions}<br>
        <strong>Errors:</strong> ${metrics.errors}<br>
        <strong>Cache Size:</strong> ${cacheSizeMB} MB
      </div>
      <div style="display: flex; gap: 5px; flex-wrap: wrap;">
        <button onclick="window.cacheDebug.clearAll()" style="padding: 5px 10px; cursor: pointer;">
          Clear All
        </button>
        <button onclick="window.cacheDebug.clearGallery()" style="padding: 5px 10px; cursor: pointer;">
          Clear Gallery
        </button>
        <button onclick="window.cacheDebug.clearMetadata()" style="padding: 5px 10px; cursor: pointer;">
          Clear Metadata
        </button>
        <button onclick="window.cacheDebug.exportMetrics()" style="padding: 5px 10px; cursor: pointer;">
          Export Metrics
        </button>
      </div>
    `;
  }

  async clearAll() {
    if (confirm("Clear all caches?")) {
      await indexedDbCache.clearAll();
      alert("All caches cleared!");
      this.updateMetrics();
    }
  }

  async clearGallery() {
    await indexedDbCache.db.clear("gallery_cache");
    alert("Gallery cache cleared!");
    this.updateMetrics();
  }

  async clearMetadata() {
    await indexedDbCache.db.clear("metadata_cache");
    alert("Metadata cache cleared!");
    this.updateMetrics();
  }

  exportMetrics() {
    const metrics = indexedDbCache.getMetrics();
    const data = JSON.stringify(metrics, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cache-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Initialize debug UI in development mode
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  const debugUI = new CacheDebugUI();

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => debugUI.init());
  } else {
    debugUI.init();
  }

  // Expose to window for button onclick handlers
  window.cacheDebug = {
    clearAll: () => debugUI.clearAll(),
    clearGallery: () => debugUI.clearGallery(),
    clearMetadata: () => debugUI.clearMetadata(),
    exportMetrics: () => debugUI.exportMetrics(),
  };
}
