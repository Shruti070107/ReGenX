/**
 * @fileoverview Offline Dispatch Sync Engine for ReGenX PWA
 * Handles offline action queuing, background sync, and retry logic
 */

const DB_NAME = 'ReGenX_OfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingActions';

let db = null;

/**
 * Initialize IndexedDB for offline storage
 * @returns {Promise<IDBDatabase>}
 */
export function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('[OfflineSync] IndexedDB initialized');
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('[OfflineSync] IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Generate unique UUID for each action
 * @returns {string}
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Queue an action for offline storage
 * @param {string} type - Action type (dispatch, pickup, gps, scan, etc.)
 * @param {Object} payload - Action data
 * @returns {Promise<string>} - UUID of queued action
 */
export function queueOfflineAction(type, payload) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('DB not initialized')); return; }

    const action = {
      id: generateUUID(),
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(action);

    request.onsuccess = () => {
      console.log(`[OfflineSync] Action queued: ${type} (${action.id})`);
      updateSyncUI('pending');
      resolve(action.id);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending actions from IndexedDB
 * @returns {Promise<Array>}
 */
export function getPendingActions() {
  return new Promise((resolve, reject) => {
    if (!db) { resolve([]); return; }

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove a successfully synced action from IndexedDB
 * @param {string} id - UUID of action to remove
 * @returns {Promise<void>}
 */
export function removeAction(id) {
  return new Promise((resolve, reject) => {
    if (!db) { resolve(); return; }

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Sync all pending actions when online
 * Uses exponential backoff for retries
 * @returns {Promise<void>}
 */
export async function syncPendingActions() {
  const actions = await getPendingActions();
  if (actions.length === 0) {
    updateSyncUI('synced');
    return;
  }

  console.log(`[OfflineSync] Syncing ${actions.length} pending actions...`);
  updateSyncUI('syncing');

  for (const action of actions) {
    try {
      await processAction(action);
      await removeAction(action.id);
      console.log(`[OfflineSync] Synced: ${action.type} (${action.id})`);
    } catch (error) {
      console.warn(`[OfflineSync] Failed to sync: ${action.id}`, error);
      await handleRetry(action);
    }
  }

  const remaining = await getPendingActions();
  updateSyncUI(remaining.length === 0 ? 'synced' : 'retry-failed');
}

/**
 * Process a single action (simulate API call)
 * @param {Object} action
 * @returns {Promise<void>}
 */
async function processAction(action) {
  // Replace with actual API endpoints per action type
  const endpoints = {
    dispatch: '/api/dispatch',
    pickup: '/api/pickup',
    gps: '/api/location',
    scan: '/api/scan',
    reward: '/api/rewards'
  };

  const url = endpoints[action.type] || '/api/sync';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action.payload)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

/**
 * Handle retry with exponential backoff
 * @param {Object} action
 */
async function handleRetry(action) {
  if (!db) return;
  const MAX_RETRIES = 3;
  if (action.retryCount >= MAX_RETRIES) {
    console.error(`[OfflineSync] Max retries reached for ${action.id}`);
    return;
  }

  const updatedAction = { ...action, retryCount: action.retryCount + 1 };
  const delay = Math.pow(2, updatedAction.retryCount) * 1000;

  setTimeout(async () => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(updatedAction);
  }, delay);
}

/**
 * Update sync status UI banner
 * @param {'pending'|'syncing'|'synced'|'retry-failed'} status
 */
export function updateSyncUI(status) {
  let banner = document.getElementById('sync-status-banner');

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'sync-status-banner';
    banner.style.cssText = `
      position: fixed; bottom: 20px; right: 20px;
      padding: 10px 20px; border-radius: 8px;
      font-family: sans-serif; font-size: 14px;
      font-weight: 600; z-index: 9999;
      transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(banner);
  }

  const states = {
    pending:      { text: '🕐 Pending Sync',  bg: '#f59e0b', color: '#fff' },
    syncing:      { text: '🔄 Syncing...',     bg: '#3b82f6', color: '#fff' },
    synced:       { text: '✅ Synced',          bg: '#10b981', color: '#fff' },
    'retry-failed': { text: '❌ Retry Failed', bg: '#ef4444', color: '#fff' }
  };

  const state = states[status] || states.pending;
  banner.textContent = state.text;
  banner.style.background = state.bg;
  banner.style.color = state.color;
  banner.style.display = 'block';

  if (status === 'synced') {
    setTimeout(() => { banner.style.display = 'none'; }, 3000);
  }
}

/**
 * Setup online/offline event listeners
 */
export function setupNetworkListeners() {
  window.addEventListener('online', async () => {
    console.log('[OfflineSync] Back online — starting sync...');
    showOfflineBanner(false);
    await syncPendingActions();
  });

  window.addEventListener('offline', () => {
    console.log('[OfflineSync] Gone offline');
    showOfflineBanner(true);
    updateSyncUI('pending');
  });
}

/**
 * Show/hide offline notification banner
 * @param {boolean} isOffline
 */
function showOfflineBanner(isOffline) {
  let offlineBanner = document.getElementById('offline-banner');

  if (!offlineBanner) {
    offlineBanner = document.createElement('div');
    offlineBanner.id = 'offline-banner';
    offlineBanner.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%;
      padding: 10px; text-align: center;
      font-family: sans-serif; font-size: 14px;
      font-weight: 600; z-index: 99999;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(offlineBanner);
  }

  if (isOffline) {
    offlineBanner.textContent = '📵 You are offline — actions will sync when connected';
    offlineBanner.style.background = '#1f2937';
    offlineBanner.style.color = '#f9fafb';
    offlineBanner.style.display = 'block';
  } else {
    offlineBanner.style.display = 'none';
  }
}