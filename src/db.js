/**
 * @fileoverview ReGenX Asynchronous IndexedDB Storage Driver
 * Intercepts Storage.prototype to transparently redirect heavy datasets 
 * (orders, logs, ledgers, notifications) from localStorage to IndexedDB.
 * Provides in-memory write-through cache for synchronous access compatibility.
 * Includes storage estimation quota checks and LRU eviction for notifications.
 */

const DB_NAME = 'ReGenXDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';
const STORAGE_PREFIX = 'regenx-v3:';

let dbPromise = null;

/**
 * Initializes/opens the IndexedDB connection.
 * @returns {Promise<IDBDatabase>}
 */
function getDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
    return dbPromise;
}

/**
 * Retrieves a key value from IndexedDB.
 */
async function idbGet(key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Puts a key value into IndexedDB.
 */
async function idbSet(key, val) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(val, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/**
 * Removes a key from IndexedDB.
 */
async function idbRemove(key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/**
 * Gets all keys currently stored in IndexedDB.
 */
async function idbGetAllKeys() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Clears the IndexedDB store.
 */
async function idbClear() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ── Heavy Storage Key Detection ──
const HEAVY_KEYS = new Set([
  'regenx-v3:trust-ledger',
  'regenx-v3:notifications',
  'regenx-v3:esg-alerts',
  'regenx-v3:credit-ledger',
  'regenx-v3:sla-ledger',
  'regenx-v3:energy-ledger',
  'regenx-v3:sensor-ledger',
  'regenx-v3:emissions-ledger',
  'regenx-v3:quality-ledger',
  'regenx-v3:automation-pipeline',
  'regenx-v3:audit-registry',
  'audit-registry',
  'trust-ledger',
  'notifications',
  'esg-alerts',
  'credit-ledger',
  'sla-ledger',
  'energy-ledger',
  'sensor-ledger',
  'emissions-ledger',
  'quality-ledger',
  'automation-pipeline',
  'regenx-offline-queue'
]);

/**
 * Decides whether a given key represents a heavy dataset that belongs in IndexedDB.
 * @param {string} key - Storage key name.
 * @returns {boolean} True if the key should be stored in IndexedDB.
 */
function isHeavyKey(key) {
    if (!key) return false;
    if (HEAVY_KEYS.has(key)) return true;
    if (key.startsWith('regenx-v3:ord:')) return true;
    if (key.startsWith('regenx-v3:log:')) return true;
    if (key.startsWith('regenx-v3:acc:')) return true;
    if (key.startsWith('ord:')) return true;
    if (key.startsWith('log:')) return true;
    if (key.startsWith('acc:')) return true;
    return false;
}

// ── Write-Through In-Memory Cache ──
const idbCache = new Map();

// ── Storage.prototype Overrides ──
const originalGetItem = Storage.prototype.getItem;
const originalSetItem = Storage.prototype.setItem;
const originalRemoveItem = Storage.prototype.removeItem;
const originalClear = Storage.prototype.clear;
const originalKey = Storage.prototype.key;
const originalLengthDescriptor = Object.getOwnPropertyDescriptor(Storage.prototype, 'length');

Storage.prototype.getItem = function (key) {
    if (isHeavyKey(key)) {
        const val = idbCache.get(key);
        if (val === undefined) return null;
        return typeof val === 'string' ? val : JSON.stringify(val);
    }
    return originalGetItem.call(this, key);
};

Storage.prototype.setItem = function (key, value) {
    if (isHeavyKey(key)) {
        let parsed = value;
        try {
            parsed = JSON.parse(value);
        } catch (e) {}

        idbCache.set(key, parsed);
        idbSet(key, parsed).catch((err) => {
            console.error(`[ReGenXDB] Failed to set IndexedDB key "${key}":`, err);
        });

        // Run LRU / Quota Check for notifications
        if (key === 'regenx-v3:notifications' || key === 'notifications') {
            checkAndEvictOldNotifications(parsed);
        }
        return;
    }
    originalSetItem.call(this, key, value);
};

Storage.prototype.removeItem = function (key) {
    if (isHeavyKey(key)) {
        idbCache.delete(key);
        idbRemove(key).catch((err) => {
            console.error(`[ReGenXDB] Failed to delete IndexedDB key "${key}":`, err);
        });
        return;
    }
    originalRemoveItem.call(this, key);
};

Storage.prototype.clear = function () {
    idbCache.clear();
    idbClear().catch((err) => {
        console.error('[ReGenXDB] Failed to clear IndexedDB:', err);
    });
    originalClear.call(this);
};

Storage.prototype.key = function (index) {
    const lsKeys = [];
    const len = originalLengthDescriptor.get.call(this);
    for (let i = 0; i < len; i++) {
        const k = originalKey.call(this, i);
        if (k) lsKeys.push(k);
    }
    const allKeys = [...lsKeys, ...idbCache.keys()];
    return allKeys[index] || null;
};

Object.defineProperty(Storage.prototype, 'length', {
    configurable: true,
    enumerable: true,
    get: function () {
        const lsKeys = [];
        const len = originalLengthDescriptor.get.call(this);
        for (let i = 0; i < len; i++) {
            const k = originalKey.call(this, i);
            if (k) lsKeys.push(k);
        }
        const uniqueKeys = new Set([...lsKeys, ...idbCache.keys()]);
        return uniqueKeys.size;
    }
});

// ── Quota Management & Eviction Policy ──
const MAX_NOTIF_HISTORY = 60;

/**
 * Checks storage quota and evicts old notifications if space or count limits are exceeded.
 * @param {Array} notifications - Array of notifications.
 */
async function checkAndEvictOldNotifications(notifications) {
    if (!Array.isArray(notifications)) return;
    
    let needsUpdate = false;
    let list = [...notifications];

    // Check capacity quota
    if (navigator.storage && navigator.storage.estimate) {
        try {
            const est = await navigator.storage.estimate();
            const usageRatio = est.usage / est.quota;
            
            // If storage usage exceeds 85%, aggressively reduce history
            if (usageRatio > 0.85 && list.length > 20) {
                console.warn(`[ReGenXDB] High storage usage detected: ${(usageRatio * 100).toFixed(2)}%. Evicting notifications.`);
                list = list.sort((a, b) => b.ts - a.ts).slice(0, 20);
                needsUpdate = true;
            }
        } catch (e) {
            console.warn('[ReGenXDB] Quota estimation failed:', e);
        }
    }

    // Standard LRU count limit
    if (!needsUpdate && list.length > MAX_NOTIF_HISTORY) {
        list = list.sort((a, b) => b.ts - a.ts).slice(0, MAX_NOTIF_HISTORY);
        needsUpdate = true;
    }

    if (needsUpdate) {
        idbCache.set('regenx-v3:notifications', list);
        idbCache.set('notifications', list);
        await idbSet('regenx-v3:notifications', list);
    }
}

/**
 * Migrates heavy datasets out of localStorage into IndexedDB.
 */
async function migrateFromLocalStorage() {
    const keysToMigrate = [];
    const len = originalLengthDescriptor.get.call(localStorage);
    for (let i = 0; i < len; i++) {
        const key = originalKey.call(localStorage, i);
        if (key && isHeavyKey(key)) {
            keysToMigrate.push(key);
        }
    }

    if (keysToMigrate.length > 0) {
        console.log(`[ReGenXDB] Migrating ${keysToMigrate.length} items from localStorage to IndexedDB...`);
        for (const key of keysToMigrate) {
            const rawVal = originalGetItem.call(localStorage, key);
            try {
                const parsed = JSON.parse(rawVal);
                await idbSet(key, parsed);
                idbCache.set(key, parsed);
                originalRemoveItem.call(localStorage, key);
            } catch (err) {
                await idbSet(key, rawVal);
                idbCache.set(key, rawVal);
                originalRemoveItem.call(localStorage, key);
            }
        }
        console.info(`[ReGenXDB] Successfully migrated keys to IndexedDB.`);
    }
}

/**
 * Preloads all data from IndexedDB into the in-memory cache on startup.
 */
export const dbReady = (async () => {
    try {
        // Open/upgrade DB
        await getDB();
        
        // Execute migration if needed
        await migrateFromLocalStorage();

        // Preload keys
        const keys = await idbGetAllKeys();
        for (const key of keys) {
            const val = await idbGet(key);
            idbCache.set(key, val);
        }
        console.log(`[ReGenXDB] Database loaded. In-memory cache holding ${idbCache.size} elements.`);
    } catch (e) {
        console.error('[ReGenXDB] Initialization failed:', e);
    }
})();

/**
 * Returns storage usage and quota information.
 * @returns {Promise<{usage: string, quota: string, percent: string}|null>}
 */
export async function getStorageStats() {
    if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        return {
            usage: (est.usage / (1024 * 1024)).toFixed(2) + ' MB',
            quota: (est.quota / (1024 * 1024)).toFixed(2) + ' MB',
            percent: (est.usage / est.quota * 100).toFixed(2) + '%'
        };
    }
    return null;
}
