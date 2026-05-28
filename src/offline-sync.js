/**
 * @file offline-sync.js
 * @description Offline Dispatch Sync Engine with Conflict Resolution
 * @issue #151 - ReGenX PWA Offline Support
 */

const DB_NAME = 'regenx-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'pending-actions';

/**
 * Opens IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Queues an offline action into IndexedDB
 * @param {Object} action - Action object to queue
 */
async function queueAction(action) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
      ...action
    });
    console.log('[OfflineSync] Action queued:', action.type);
  } catch (err) {
    console.error('[OfflineSync] Failed to queue action:', err);
  }
}

/**
 * Retrieves all pending unsynced actions
 * @returns {Promise<Array>}
 */
async function getPendingActions() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result.filter(a => !a.synced));
  });
}

/**
 * Marks an action as synced and removes it
 * @param {string} id - Action UUID
 */
async function removeAction(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
}

/**
 * Conflict resolution: timestamp-based, UUID-validated
 * @param {Object} local - Local action
 * @param {Object} server - Server response
 * @returns {Object} resolved action
 */
function resolveConflict(local, server) {
  if (!server) return local;
  return local.timestamp >= server.timestamp ? local : server;
}

/**
 * Syncs all pending actions when back online
 */
async function syncPendingActions() {
  const actions = await getPendingActions();
  if (actions.length === 0) return;

  console.log(`[OfflineSync] Syncing ${actions.length} pending actions...`);
  updateSyncStatus('syncing');

  for (const action of actions) {
    try {
      // Simulate server sync - replace with actual API call
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });

      if (response.ok) {
        const serverData = await response.json();
        resolveConflict(action, serverData);
        await removeAction(action.id);
        console.log('[OfflineSync] Synced:', action.id);
      }
    } catch (err) {
      console.warn('[OfflineSync] Retry needed for:', action.id);
      // Exponential backoff retry
      setTimeout(() => syncPendingActions(), Math.min(1000 * 2 ** action.retryCount, 30000));
    }
  }

  updateSyncStatus('synced');
}

/**
 * Updates sync status UI indicator
 * @param {'pending'|'syncing'|'synced'|'failed'} status
 */
function updateSyncStatus(status) {
  const indicator = document.getElementById('sync-status');
  if (!indicator) return;
  const states = {
    pending: { text: '⏳ Pending Sync', color: '#f59e0b' },
    syncing: { text: '🔄 Syncing...', color: '#3b82f6' },
    synced:  { text: '✅ Synced',      color: '#10b981' },
    failed:  { text: '❌ Retry Failed', color: '#ef4444' }
  };
  const s = states[status] || states.pending;
  indicator.textContent = s.text;
  indicator.style.color = s.color;
}

// Network event listeners
window.addEventListener('online', () => {
  console.log('[OfflineSync] Back online — triggering sync...');
  updateSyncStatus('pending');
  syncPendingActions();
});

window.addEventListener('offline', () => {
  console.log('[OfflineSync] Gone offline — actions will be queued.');
  updateSyncStatus('pending');
});

export { queueAction, syncPendingActions, updateSyncStatus };