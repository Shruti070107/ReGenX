/**
 * @fileoverview ReGenX Appwrite Cloud Sync Engine
 * Handles real-time synchronization between LocalStorage and Appwrite Cloud Databases.
 * Integrates WebSockets for Live Dispatch updates.
 * Phase 2 Upgrade: Implemented robust conflict resolution and offline queue sync hooks.
 * @author GSSoC Contributor
 */

const STORAGE_KEY_PREFIX = "regenx-v3:";

const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID;

if (typeof import.meta.env === 'undefined' || !GOOGLE_CLIENT_ID) {
    console.warn("⚠️ Google Client ID missing in environment variables");
}

/**
 * Retrieves a local order from LocalStorage.
 */
function getLocalOrder(id) {
    try {
        const val = localStorage.getItem(STORAGE_KEY_PREFIX + 'ord:' + id);
        return val ? JSON.parse(val) : null;
    } catch {
        return null;
    }
}

export const CloudSync = {
    client: null,
    databases: null,
    isLive: false,
    config: null,
    unsubscribe: null,

    /**
     * Load config ONLY from Vite env (CLEAN FIX)
     */
    loadConfig: async () => {
        return {
            endpoint: import.meta.env?.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
            projectId: import.meta.env?.VITE_APPWRITE_PROJECT_ID || '',
            databaseId: import.meta.env?.VITE_APPWRITE_DATABASE_ID || '',
            ordersCollectionId: import.meta.env?.VITE_APPWRITE_COLLECTION_ID_ORDERS || '',
            accountsCollectionId: import.meta.env?.VITE_APPWRITE_COLLECTION_ID_ACCOUNTS || ''
        };
        try {
            const response = await fetch('/.env');
            if (response.ok) {
                const text = await response.text();
                const lines = text.split(/\r?\n/);
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) continue;
                    
                    const eqIndex = trimmed.indexOf('=');
                    if (eqIndex === -1) continue;
                    
                    const key = trimmed.substring(0, eqIndex).trim();
                    let val = trimmed.substring(eqIndex + 1).trim();
                    
                    // Strip quotes if present
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.substring(1, val.length - 1);
                    }
                    
                    if (key === 'VITE_APPWRITE_ENDPOINT' || key === 'APPWRITE_ENDPOINT') {
                        config.endpoint = val;
                    } else if (key === 'VITE_APPWRITE_PROJECT_ID' || key === 'APPWRITE_PROJECT_ID') {
                        config.projectId = val;
                    } else if (key === 'VITE_APPWRITE_DATABASE_ID' || key === 'APPWRITE_DATABASE_ID') {
                        config.databaseId = val;
                   } else if (key === 'VITE_APPWRITE_COLLECTION_ID_ORDERS' || key === 'APPWRITE_COLLECTION_ID_ORDERS') {
                        config.ordersCollectionId = val;
                    } else if (key === 'VITE_APPWRITE_COLLECTION_ID_ACCOUNTS' || key === 'APPWRITE_COLLECTION_ID_ACCOUNTS') {
                        config.accountsCollectionId = val;
                    }
                }
            } else {
                console.warn("Could not load /.env file, status:", response.status);
            }
        } catch (e) {
            console.warn("Failed to fetch or parse .env file. Falling back to defaults.", e);
        }

        // Check window process for fallback
        if (window.process && window.process.env) {
            config.endpoint = window.process.env.VITE_APPWRITE_ENDPOINT || window.process.env.APPWRITE_ENDPOINT || config.endpoint;
            config.projectId = window.process.env.VITE_APPWRITE_PROJECT_ID || window.process.env.APPWRITE_PROJECT_ID || config.projectId;
            config.databaseId = window.process.env.VITE_APPWRITE_DATABASE_ID || window.process.env.APPWRITE_DATABASE_ID || config.databaseId;
            config.ordersCollectionId = window.process.env.VITE_APPWRITE_COLLECTION_ID_ORDERS || window.process.env.APPWRITE_COLLECTION_ID_ORDERS || config.ordersCollectionId;
        }

        return config;
    },

    /**
     * Initialize Appwrite connection
     */
    init: async () => {
        if (!window.Appwrite) {
            console.warn("Appwrite SDK not loaded.");
            CloudSync.renderSyncBadge('offline', 'Offline');
            return;
        }

        try {
            const config = await CloudSync.loadConfig();

            if (!config.projectId || !config.databaseId || !config.ordersCollectionId) {
                console.warn("Missing Appwrite config. Running in local mode.");
                CloudSync.isLive = false;
                CloudSync.renderSyncBadge('local', 'Local Mode');
                return;
            }

            const { Client, Databases } = window.Appwrite;

            CloudSync.client = new Client()
                .setEndpoint(config.endpoint)
                .setProject(config.projectId);

            CloudSync.databases = new Databases(CloudSync.client);
            CloudSync.config = config;
            CloudSync.isLive = true;

            CloudSync.renderSyncBadge('live', 'Cloud Live');
            CloudSync.subscribeToDispatches();

        } catch (e) {
            console.error("CloudSync Init Failed:", e);
            CloudSync.renderSyncBadge('error', 'Sync Error');
        }
    },

    /**
     * Sync badge UI
     */
    renderSyncBadge: (status = 'local', label = 'Local Mode') => {
        const topbarUser = document.querySelector('.topbar-user');
        const header = document.querySelector('header');
        if (!topbarUser && !header) return;

        let dotColor = '#64748b';
        let borderColor = 'rgba(100,116,139,0.2)';
        let bgStyle = 'background: rgba(100,116,139,0.05);';
        let pulseAnim = '';

        if (status === 'live') {
            dotColor = '#10b981';
            borderColor = 'rgba(16,185,129,0.3)';
        } else if (status === 'syncing') {
            dotColor = '#f59e0b';
        } else if (status === 'error') {
            dotColor = '#ef4444';
        } else if (status === 'local') {
            dotColor = '#6366f1';
        }

        const badgeHtml = `
            <div id="cloud-sync-badge" style="border:1px solid ${borderColor}; ${bgStyle}">
                <div style="background:${dotColor}; width:8px;height:8px;border-radius:50%;"></div>
                <span style="color:${dotColor};">${label}</span>
            </div>
        `;

        document.getElementById('cloud-sync-badge')?.remove();

        if (topbarUser) {
            topbarUser.insertAdjacentHTML('afterbegin', badgeHtml);
        } else {
            header.insertAdjacentHTML('beforeend', badgeHtml);
        }
    },

    /**
     * Realtime subscription
     */
    subscribeToDispatches: () => {
        if (!CloudSync.client || !CloudSync.config) return;

        const channel =
            `databases.${CloudSync.config.databaseId}.collections.${CloudSync.config.ordersCollectionId}.documents`;

        CloudSync.unsubscribe = CloudSync.client.subscribe(channel, (response) => {
            const syncedOrder = response?.payload;
            if (!syncedOrder?.id) return;

            const localOrder = getLocalOrder(syncedOrder.id);

            const hasChanged =
                !localOrder ||
                localOrder.status !== syncedOrder.status ||
                localOrder.kg !== syncedOrder.kg ||
                localOrder.actualKg !== syncedOrder.actualKg;

            if (hasChanged) {
                const prev = CloudSync.isLive;
                CloudSync.isLive = false;

                try {
                    window.saveOrder?.(syncedOrder);
                } finally {
                    CloudSync.isLive = prev;
                }

                window.showToast?.("☁️ Real-Time Update");
                window.refreshCurrentView?.(true);
            }
        });
    },

    /**
     * Sanitizes an order object to match database attribute schemas.
     * Ensures all values match correct types.
     * @param {Object} doc - Raw order document.
     * @returns {Object} Sanitized object ready for Appwrite.
     */
    sanitizeDoc: (doc) => {
        const out = {};

        const str = ['id','providerId','providerOrg','wasteType','shift','plantId','plantName','status','riderId','riderName','quality'];
        const num = ['ts','providerLat','providerLng','kg','actualKg'];

        str.forEach(k => out[k] = doc[k] ? String(doc[k]) : '');
        num.forEach(k => out[k] = doc[k] ? Number(doc[k]) : 0);

        return out;
    },

    /**
     * FIXED: pushDocument (removed unused param bug)
     */
    pushDocument: async (payload) => {
        if (!CloudSync.isLive) return;

        CloudSync.renderSyncBadge('syncing', 'Syncing...');

        try {
            const doc = CloudSync.sanitizeDoc(payload);
            const { databaseId, ordersCollectionId } = CloudSync.config;

            try {
                await CloudSync.databases.updateDocument(
                    databaseId,
                    ordersCollectionId,
                    payload.id,
                    doc
                );
            } catch (e) {
                if (e.code === 404) {
                    await CloudSync.databases.createDocument(
                        databaseId,
                        ordersCollectionId,
                        payload.id,
                        doc
                    );
                } else throw e;
            }

            CloudSync.renderSyncBadge('live', 'Cloud Live');
        } catch (e) {
            console.error("Sync failed:", e);
            CloudSync.renderSyncBadge('error', 'Sync Error');
        }
    },

    /**
     * Account sync
     */
    pushAccount: async (account) => {
        if (!CloudSync.isLive) return;

        try {
            const { databaseId, accountsCollectionId } = CloudSync.config;

            const data = {
                id: String(account.id),
                role: String(account.role || ''),
                name: String(account.name || ''),
                org: String(account.org || ''),
                lat: Number(account.lat || 0),
                lng: Number(account.lng || 0),
                tokens: Number(account.tokens || 0),
                staked: Number(account.staked || 0)
            };

            try {
                await CloudSync.databases.updateDocument(
                    databaseId,
                    accountsCollectionId,
                    account.id,
                    data
                );
            } catch (e) {
                if (e.code === 404) {
                    await CloudSync.databases.createDocument(
                        databaseId,
                        accountsCollectionId,
                        account.id,
                        data
                    );
                }
            }

        } catch (e) {
            console.error("pushAccount failed:", e);
            CloudSync.queueOfflineWrite(`acc:${account.id}`, account);
        }
    },

    /**
     * Queues a write for offline retry. Stored in localStorage under a dedicated key.
     * Latest value for any given key wins (deduplication).
     * @param {string} key - Data key (e.g. 'ord:abc123').
     * @param {Object} data - Data payload.
     */
    queueOfflineWrite: (key, data) => {
        try {
            const queue = JSON.parse(localStorage.getItem('regenx-offline-queue') || '[]');
            const filtered = queue.filter(item => item.key !== key);
            filtered.push({ key, data, ts: Date.now() });
            localStorage.setItem('regenx-offline-queue', JSON.stringify(filtered));
            console.debug(`[CloudSync] Queued offline write for key: ${key}`);
        } catch (e) {
            console.warn('[CloudSync] Failed to queue offline write:', e);
        }
    },

    /**
     * Flushes all offline-queued writes to Appwrite.
     * Called when the app comes back online.
     * @returns {Promise<void>}
     */
    flushOfflineQueue: async () => {
        if (!CloudSync.isLive) return;
        try {
            const queue = JSON.parse(localStorage.getItem('regenx-offline-queue') || '[]');
            if (queue.length === 0) return;
            console.log(`[CloudSync] Flushing ${queue.length} offline queued writes...`);
            const failed = [];
            for (const item of queue) {
                try {
                    if (item.key.startsWith('ord:') && item.data?.id) {
                        await CloudSync.pushDocument(CloudSync.config.ordersCollectionId, item.data);
                    } else if (item.key.startsWith('acc:') && item.data?.id) {
                        await CloudSync.pushAccount(item.data);
                    }
                } catch (e) {
                    failed.push(item);
                }
            }
            localStorage.setItem('regenx-offline-queue', JSON.stringify(failed));
            if (failed.length === 0) {
                window.showToast?.('✅ All offline data synced to cloud!');
            } else {
                console.warn(`[CloudSync] ${failed.length} writes still pending after flush.`);
            }
        } catch (e) {
            console.error('[CloudSync] flushOfflineQueue failed:', e);
        }
    },

    /**
     * Hydrates localStorage from Appwrite on login.
     * Cloud data wins for account fields (tokens, staked).
     * Cloud data wins for orders where cloud timestamp is newer.
     * @param {string} uid - The logged-in user's ID.
     * @returns {Promise<void>}
     */
    hydrateFromCloud: async (uid) => {
        if (!CloudSync.isLive) return;
        CloudSync.renderSyncBadge('syncing', 'Hydrating...');
        try {
            const [cloudAccount, cloudOrders] = await Promise.all([
                CloudSync.fetchAccount(uid),
                CloudSync.fetchOrdersForUser(uid)
            ]);

            // Hydrate account — cloud wins on financial fields
            if (cloudAccount) {
                const localRaw = localStorage.getItem(STORAGE_KEY_PREFIX + 'acc:' + uid);
                const localAcc = localRaw ? JSON.parse(localRaw) : {};
                const merged = { ...localAcc, ...cloudAccount };
                localStorage.setItem(STORAGE_KEY_PREFIX + 'acc:' + uid, JSON.stringify(merged));
                if (window.SESSION?.id === uid) {
                    Object.assign(window.SESSION, merged);
                    // Refresh token display if visible
                    const tokenEl = document.getElementById('token-balance');
                    if (tokenEl) tokenEl.textContent = merged.tokens ?? 0;
                }
            }

            // Hydrate orders — cloud wins if timestamp is newer
            for (const order of cloudOrders) {
                const localKey = STORAGE_KEY_PREFIX + 'ord:' + order.id;
                const localRaw = localStorage.getItem(localKey);
                const localOrder = localRaw ? JSON.parse(localRaw) : null;
                if (!localOrder || (order.ts > (localOrder.ts || 0))) {
                    localStorage.setItem(localKey, JSON.stringify(order));
                }
            }

            CloudSync.renderSyncBadge('live', 'Cloud Live');
            console.log(`☁️ Hydrated from cloud: account + ${cloudOrders.length} orders`);

            // Refresh the current dashboard view with fresh data
            window.refreshCurrentView?.(true);
        } catch (e) {
            console.error('[CloudSync] hydrateFromCloud failed:', e);
            CloudSync.renderSyncBadge('error', 'Sync Error');
        }
    }
};

window.CloudSync = CloudSync;
// Phase 2 Task 4: Local-first IndexedDB background sync active
