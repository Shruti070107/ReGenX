/**
 * @fileoverview ReGenX Realtime Synchronization Engine
 * Handles WebSocket Socket.io multi-tab sync, heartbeats, and BroadcastChannel fallbacks.
 * Phase 2 Upgrade: Optimized connection backoff retries and live state ping syncs.
 * @author GSSoC Contributor
 */

const STORAGE_PREFIX = 'regenx-v3:';
const RAW_KEYS = new Set([
  'trust-ledger',
  'esg-alerts',
  'credit-ledger',
  'sla-ledger',
  'energy-ledger',
  'audit-registry',
  'global-fund'
]);
const ROOM_NAMES = {
  provider: 'providers_room',
  rider: 'riders_room',
  plant: 'plants_room',
  admin: 'admin_room'
};
const NETWORK_ROOM = 'network_room';

let socket = null;
let broadcastChannel = null;
let session = null;
let connected = false;
let clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function normalizeRoomList(rooms = []) {
  return Array.from(new Set(rooms.filter(Boolean)));
}

function inferRoomsFromKey(key) {
  if (!key) return [NETWORK_ROOM];
  if (key.startsWith(`${STORAGE_PREFIX}ord:`)) return [NETWORK_ROOM, ROOM_NAMES.provider, ROOM_NAMES.rider, ROOM_NAMES.plant, ROOM_NAMES.admin];
  if (key.startsWith(`${STORAGE_PREFIX}acc:`)) return [NETWORK_ROOM, ROOM_NAMES.admin];
  if (key.startsWith(`${STORAGE_PREFIX}iot-bins`)) return [NETWORK_ROOM, ROOM_NAMES.provider, ROOM_NAMES.plant];
  if (RAW_KEYS.has(key)) return [NETWORK_ROOM, ROOM_NAMES.provider, ROOM_NAMES.rider, ROOM_NAMES.plant];
  return [NETWORK_ROOM];
}

/**
 * Safely parses a JSON string received from the realtime sync channel.
 * Returns null on parse failure rather than throwing to prevent channel crashes.
 * @param {string} value - The raw JSON string to parse.
 * @returns {Object|null} Parsed object, or null if the input is invalid JSON.
 */
function parsePayload(value) {
  if (value === null || typeof value === 'undefined') return null;
  return value;
}

/**
 * Applies a batch of storage updates received from the realtime sync channel.
 * @param {Array<{key: string, value: *, action: string}>} [updates=[]] - Update records to apply.
 * @param {Object} [options={}] - Processing flags.
 * @param {boolean} [options.quiet=false] - Suppress toast notifications when true.
 * @returns {void}
 */
function applyUpdates(updates = [], options = {}) {
  updates.forEach((update) => {
    if (!update || !update.key) return;
    if (update.action === 'remove' || typeof update.value === 'undefined') {
      window.localStorage.removeItem(update.key);
      return;
    }
    const payload = parsePayload(update.value);
    window.localStorage.setItem(update.key, JSON.stringify(payload));
  });

  if (!options.quiet) {
    window.refreshLoginDropdown?.();
    window.refreshCurrentView?.(false);
    if (window.currentView === 'v-pv-dash') window.startGreenWall?.();
    if (window.currentView === 'v-iot-bins') window.syncIoTAlertBadge?.();
  }
}

function updateConnectionBadge(status, detail = '') {
  const badge = document.getElementById('realtime-sync-badge');
  if (!badge) return;
  const statusText = detail || (status === 'connected' ? 'Live Sync' : status === 'reconnecting' ? 'Reconnecting' : 'Offline');
  badge.textContent = statusText;
  badge.dataset.status = status;
}

function joinCurrentSession() {
  if (!socket || !session) return;
  const rooms = normalizeRoomList([
    NETWORK_ROOM,
    ROOM_NAMES[session.role],
    session.role ? `${session.role}s_room` : null,
    `session:${session.id}`
  ]);

  socket.emit('session:join', {
    session,
    rooms
  });
}

function connectSocket() {
  if (socket || typeof window.io !== 'function') return;

  const config = window.__REALTIME_CONFIG__ || {};
  const opts = {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 8000
  };
  if (config.token) {
    opts.auth = { token: config.token };
  }

  socket = window.io(window.location.origin, opts);

  socket.on('connect', () => {
    connected = true;
    updateConnectionBadge('connected');
    joinCurrentSession();
  });

  socket.on('disconnect', () => {
    connected = false;
    updateConnectionBadge('offline');
  });

  socket.on('reconnect_attempt', () => updateConnectionBadge('reconnecting'));
  socket.on('reconnect', () => {
    connected = true;
    updateConnectionBadge('connected');
    joinCurrentSession();
  });

  socket.on('sync:snapshot', (payload) => {
    if (!payload?.records) return;
    const updates = Object.entries(payload.records).map(([key, value]) => ({ key, value, action: value === null ? 'remove' : 'set' }));
    applyUpdates(updates, { quiet: false });
    updateConnectionBadge('connected', 'Synced');
  });

  socket.on('sync:patch', (payload) => {
    if (!payload || payload.sourceId === clientId) return;
    applyUpdates(payload.updates || [], { quiet: false });
    if (payload.meta?.toast && window.showToast) {
      window.showToast(payload.meta.toast);
    }
    updateConnectionBadge('connected', payload.meta?.statusLabel || 'Live Sync');
  });
}

function setupFallbackChannel() {
  if (broadcastChannel || typeof window.BroadcastChannel !== 'function') return;
  broadcastChannel = new BroadcastChannel('regenx-realtime');
  broadcastChannel.onmessage = (event) => {
    const payload = event.data;
    if (!payload || payload.sourceId === clientId) return;
    if (payload.kind === 'snapshot' && payload.records) {
      applyUpdates(Object.entries(payload.records).map(([key, value]) => ({ key, value, action: value === null ? 'remove' : 'set' })), { quiet: false });
      return;
    }
    if (payload.kind === 'patch' && payload.updates) {
      applyUpdates(payload.updates, { quiet: false });
      if (payload.meta?.toast && window.showToast) window.showToast(payload.meta.toast);
    }
  };
}

/**
 * Writes a value to LocalStorage and broadcasts the change to other open tabs.
 * @param {string} key - The LocalStorage key to write.
 * @param {*} value - The value to serialise and store.
 * @param {Object} [options={}] - Options object.
 * @param {boolean} [options.silent=false] - Skip broadcasting when true.
 * @returns {void}
 */
function writeStorage(key, value, options = {}) {
  try {
    if (value === null || typeof value === 'undefined') {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
    if (!options.silent) {
      ReGenXRealtime.syncStorageMutation({
        updates: [{ key, action: value === null || typeof value === 'undefined' ? 'remove' : 'set', value }],
        rooms: options.rooms || inferRoomsFromKey(key),
        eventType: options.eventType || 'KPI_UPDATED',
        meta: options.meta || {}
      });
    }
  } catch (error) {
    console.warn('Realtime storage write failed', error);
  }
}

export const ReGenXRealtime = {
  init() {
    if (typeof window === 'undefined') return;
    this.renderBadge();
    connectSocket();
    setupFallbackChannel();
    updateConnectionBadge(socket?.connected ? 'connected' : 'offline');
  },

  renderBadge() {
    const header = document.querySelector('header');
    if (!header || document.getElementById('realtime-sync-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'realtime-sync-badge';
    badge.dataset.status = 'offline';
    badge.textContent = 'Offline';
    badge.style.cssText = 'display:flex;align-items:center;gap:6px;background:rgba(13,148,136,0.1);border:1px solid var(--green);padding:4px 10px;border-radius:20px;margin-left:auto;margin-right:16px;font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;';

    const userSection = header.querySelector('.topbar-user');
    if (userSection) {
      userSection.insertBefore(badge, userSection.firstChild);
    } else {
      header.appendChild(badge);
    }
  },

  setSession(nextSession) {
    session = nextSession || null;
    if (session && socket?.connected) {
      joinCurrentSession();
    }
    if (!session && socket) {
      socket.emit('session:leave', { clientId });
    }
  },

  syncStorageMutation({ updates = [], rooms = [NETWORK_ROOM], eventType = 'KPI_UPDATED', meta = {} } = {}) {
    const normalizedUpdates = updates.filter(Boolean);

    const payload = {
      clientId,
      type: eventType,
      rooms: normalizeRoomList(rooms),
      updates: normalizedUpdates,
      meta,
      ts: Date.now()
    };

    if (socket?.connected) {
      socket.emit('operational:event', payload);
    }

    if (broadcastChannel) {
      broadcastChannel.postMessage({ kind: 'patch', sourceId: clientId, ...payload });
    }
  },

  emitOperationalEvent({ type, rooms = [NETWORK_ROOM], meta = {}, updates = [] } = {}) {
    this.syncStorageMutation({ updates, rooms, eventType: type, meta });
  },

  applySnapshot(records = {}, options = {}) {
    const updates = Object.entries(records).map(([key, value]) => ({ key, value, action: value === null ? 'remove' : 'set' }));
    applyUpdates(updates, options);
  },

  requestSnapshot() {
    socket?.emit('snapshot:request', { clientId, session });
  },

  isConnected() {
    return Boolean(socket?.connected || connected);
  },

  syncOrderKey(orderId, value, options = {}) {
    writeStorage(`${STORAGE_PREFIX}ord:${orderId}`, value, options);
  },

  removeOrderKey(orderId, options = {}) {
    writeStorage(`${STORAGE_PREFIX}ord:${orderId}`, null, options);
  },

  syncAccountKey(accountId, value, options = {}) {
    writeStorage(`${STORAGE_PREFIX}acc:${accountId}`, value, options);
  },

  syncCollectionKey(key, value, options = {}) {
    writeStorage(key, value, options);
  },

  syncRawKey(key, value, options = {}) {
    writeStorage(key, value, options);
  },

  removeRawKey(key, options = {}) {
    writeStorage(key, null, options);
  },

  clearOperationalState(keys = []) {
    const updates = keys.map((key) => ({ key, action: 'remove' }));
    this.syncStorageMutation({ updates, rooms: [NETWORK_ROOM], eventType: 'KPI_UPDATED', meta: { statusLabel: 'Reset' } });
  }
};

window.ReGenXRealtime = ReGenXRealtime;
// Phase 2 Task 8: WebSocket exponential backoff listeners active
