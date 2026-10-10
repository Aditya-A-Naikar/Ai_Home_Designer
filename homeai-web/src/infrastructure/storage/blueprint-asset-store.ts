/**
 * Bounded, Safe Binary Asset Store for Floor Plan Blueprint Underlays.
 *
 * Guarantees Stage 1.2 Storage Hardening compliance:
 * - Keeps large binary blobs (PNG, JPG, PDF) completely out of localStorage.
 * - Stores assets in IndexedDB when available, with in-memory Blob/URL fallback.
 * - Safely handles quota limits, asset revocation, and missing asset recovery.
 */

const DB_NAME = "homeai_assets_v1";
const STORE_NAME = "blueprint_images";
const DB_VERSION = 1;

class BlueprintAssetStore {
  private memoryUrls: Map<string, string> = new Map();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private isClient(): boolean {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  }

  private getDB(): Promise<IDBDatabase | null> {
    if (!this.isClient()) return Promise.resolve(null);
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn("Failed to open IndexedDB for blueprint assets, using memory fallback.");
          resolve(null);
        };
      } catch (err) {
        console.warn("IndexedDB unavailable:", err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Saves a binary blob or file in IndexedDB under the given asset ID, and creates an Object URL.
   */
  public async saveAsset(id: string, blob: Blob): Promise<string> {
    const url = URL.createObjectURL(blob);
    this.memoryUrls.set(id, url);

    try {
      const db = await this.getDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(blob, id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    } catch (err) {
      console.warn("Could not persist blueprint blob to IndexedDB:", err);
    }

    return url;
  }

  /**
   * Retrieves an active Object URL for the given asset ID.
   * If already loaded in memory, returns the existing URL.
   * Otherwise rehydrates from IndexedDB.
   */
  public async getAssetUrl(id: string): Promise<string | null> {
    if (this.memoryUrls.has(id)) {
      return this.memoryUrls.get(id)!;
    }

    try {
      const db = await this.getDB();
      if (db) {
        const blob = await new Promise<Blob | null>((resolve) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });

        if (blob) {
          const url = URL.createObjectURL(blob);
          this.memoryUrls.set(id, url);
          return url;
        }
      }
    } catch (err) {
      console.warn("Failed to load blueprint blob from IndexedDB:", err);
    }

    return null;
  }

  /**
   * Deletes a blueprint asset from memory and IndexedDB.
   */
  public async deleteAsset(id: string): Promise<void> {
    const existingUrl = this.memoryUrls.get(id);
    if (existingUrl) {
      try {
        URL.revokeObjectURL(existingUrl);
      } catch {
        // Ignore revoke errors
      }
      this.memoryUrls.delete(id);
    }

    try {
      const db = await this.getDB();
      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      }
    } catch {
      // Ignore delete errors
    }
  }

  /**
   * Cleans up all memory Object URLs.
   */
  public disposeAll(): void {
    for (const [, url] of this.memoryUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore
      }
    }
    this.memoryUrls.clear();
  }
}

export const blueprintAssetStore = new BlueprintAssetStore();
