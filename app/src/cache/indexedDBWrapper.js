// IndexedDB Wrapper for onchain88 Cache

export class IndexedDBWrapper {
  constructor(dbName, version) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create main cache store
        if (!db.objectStoreNames.contains("cache")) {
          const cacheStore = db.createObjectStore("cache", { keyPath: "key" });
          cacheStore.createIndex("timestamp", "timestamp", { unique: false });
          cacheStore.createIndex("expiry", "expiry", { unique: false });
          cacheStore.createIndex("category", "category", { unique: false });
          cacheStore.createIndex("size", "size", { unique: false });
        }

        // Create gallery cache store
        if (!db.objectStoreNames.contains("gallery_cache")) {
          const galleryStore = db.createObjectStore("gallery_cache", {
            keyPath: "creator",
          });
          galleryStore.createIndex("lastUpdated", "lastUpdated", {
            unique: false,
          });
        }

        // Create metadata cache store
        if (!db.objectStoreNames.contains("metadata_cache")) {
          const metadataStore = db.createObjectStore("metadata_cache", {
            keyPath: "uri",
          });
          metadataStore.createIndex("lastFetched", "lastFetched", {
            unique: false,
          });
        }
      };
    });
  }

  async get(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error("Error getting from IndexedDB:", error);
        reject(error);
      }
    });
  }

  async set(storeName, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error("Error setting in IndexedDB:", error);
        reject(error);
      }
    });
  }

  async delete(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error("Error deleting from IndexedDB:", error);
        reject(error);
      }
    });
  }

  async deleteExpired(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const index = store.index("expiry");
        const now = Date.now();
        const range = IDBKeyRange.upperBound(now);
        const request = index.openCursor(range);
        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            // Skip permanent entries (expiry = null)
            if (cursor.value.expiry !== null) {
              store.delete(cursor.value.key);
              deletedCount++;
            }
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };

        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error("Error deleting expired entries:", error);
        reject(error);
      }
    });
  }

  async clear(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error("Error clearing store:", error);
        reject(error);
      }
    });
  }

  async getAll(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error("Error getting all from IndexedDB:", error);
        reject(error);
      }
    });
  }

  async getCacheSize() {
    if (!this.db) await this.init();

    try {
      const stores = ["cache", "gallery_cache", "metadata_cache"];
      let totalSize = 0;

      for (const storeName of stores) {
        const entries = await this.getAll(storeName);
        entries.forEach((entry) => {
          if (entry.size) {
            totalSize += entry.size;
          } else {
            // Estimate size if not stored
            totalSize += JSON.stringify(entry).length;
          }
        });
      }

      return totalSize;
    } catch (error) {
      console.error("Error calculating cache size:", error);
      return 0;
    }
  }

  async deleteOldestEntries(storeName, targetSize) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const index = store.index("timestamp");
        const request = index.openCursor();
        let currentSize = 0;
        let deletedCount = 0;

        request.onsuccess = async (event) => {
          const cursor = event.target.result;
          if (cursor) {
            currentSize +=
              cursor.value.size || JSON.stringify(cursor.value).length;

            if (currentSize > targetSize) {
              // Don't delete permanent entries
              if (cursor.value.expiry !== null) {
                await store.delete(cursor.value.key);
                deletedCount++;
              }
            }
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };

        request.onerror = () => reject(request.error);
      } catch (error) {
        console.error("Error deleting oldest entries:", error);
        reject(error);
      }
    });
  }
}
