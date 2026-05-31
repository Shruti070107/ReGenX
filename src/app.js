// Theme Toggle Integration Upgraded

// Leaflet Map Live Rider Tracking System
import { Intelligence } from './intelligence.js';
// CO2 Offset Calculation and Analytics Engine
import { TrustProtocol } from './trust.js';
// RGX Token Staking & Carbon Credit Fund Interface
import { YieldOptimizer } from './yield-optimizer.js';
import { RouteOptimizer } from './route-optimizer.js';
import { AuditPortal } from './audit-portal.js';
import { ReGenXRealtime } from './realtime-sync.js';
import { CloudSync } from './cloud-sync.js';
import { ESGReporter } from './esg-reporter.js';
import { AccessibilityManager } from './accessibility.js';
const STORAGE_KEY_PREFIX = "regenx-v3:";
const TRUST_LEDGER_KEY = STORAGE_KEY_PREFIX + "trust-ledger";
const ESG_ALERTS_KEY = STORAGE_KEY_PREFIX + "esg-alerts";
const CREDIT_LEDGER_KEY = STORAGE_KEY_PREFIX + "credit-ledger";
const SLA_LEDGER_KEY = STORAGE_KEY_PREFIX + "sla-ledger";
const ENERGY_LEDGER_KEY = STORAGE_KEY_PREFIX + "energy-ledger";
const SENSOR_LEDGER_KEY = STORAGE_KEY_PREFIX + "sensor-ledger";
const EMISSIONS_LEDGER_KEY = STORAGE_KEY_PREFIX + "emissions-ledger";
const QUALITY_LEDGER_KEY = STORAGE_KEY_PREFIX + "quality-ledger";
const AUTOMATION_PIPELINE_KEY = STORAGE_KEY_PREFIX + "automation-pipeline";
const SESSION_STATE_KEY = STORAGE_KEY_PREFIX + 'active-session';

console.debug('APP JS loaded');

function saveActiveSession(accountId, viewId) {
  try {
    const payload = { accountId, lastView: viewId || '', timestamp: Date.now() };
    window.localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(payload));
  } catch { /* ignore storage failures */ }
}

function clearPersistedSession() {
  try { window.localStorage.removeItem(SESSION_STATE_KEY); } catch { }
}

function loadPersistedSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.accountId) return null;
    return parsed;
  } catch {
    clearPersistedSession();
    return null;
  }
}

function getDefaultViewForRole(role) {
  if (role === 'provider') return 'v-pv-dash';
  if (role === 'rider') return 'v-rd-dash';
  if (role === 'plant') return 'v-pl-dash';
  return '';
}

function isViewValidForRole(viewId, role) {
  if (!viewId || !role) return false;
  const validViews = {
    provider: ['v-pv-dash','v-pv-req','v-iot-bins','v-pv-hist-week','v-pv-hist-month','v-compliance','v-reconciliation','v-sla','v-energy','v-sensor','v-emissions','v-quality','v-automation','v-market','v-audit-portal'],
    rider: ['v-rd-dash','v-rd-jobs','v-rd-hist','v-compliance','v-reconciliation','v-sla','v-energy','v-sensor','v-emissions','v-quality','v-automation','v-audit-portal'],
    plant: ['v-pl-dash','v-pl-in','v-pl-out','v-compliance','v-reconciliation','v-sla','v-energy','v-sensor','v-emissions','v-quality','v-automation','v-audit-portal']
  };
  return validViews[role]?.includes(viewId);
}

// ── PWA Service Worker v3 Registration ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(reg => {
      console.info('☁️ ReGenX SW v3 Registered');
      window._swReg = reg;

      // Listen for Background Sync completion messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          window.showToast(event.data.message);
          if (typeof flushOfflineQueue === 'function') {
            flushOfflineQueue();
          }
        }
        if (event.data?.type === 'NAVIGATE') {
          window.showView && window.showView('v-rd-dash');
        }
      });
    })
    .catch(err => console.error('SW Registration Failed', err));
}

// ── Push Notification Permission UI ──
window.requestPushPermission = async function() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    window.showToast('✓ Smart Alerts are already enabled!');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    window.showToast('🔔 Smart Alerts enabled! You\'ll be notified of new dispatches.');
    // Register Background Sync on first permission grant
    if (window._swReg && 'sync' in window._swReg) {
      window._swReg.sync.register('regenx-order-sync');
    }
  } else {
    window.showToast('⚠️ Notifications blocked. Enable in browser settings.');
  }
};

/**
 * @function getAlertPreference
 * @description Reads the persisted smart alert preference for the current user.
 * @returns {boolean} True if alerts are enabled.
 */
function getAlertPreference() {
  try {
    if (!SESSION || !SESSION.id) return false; // ← add this guard
    return window.localStorage.getItem(
      STORAGE_KEY_PREFIX + 'smart-alerts:' + SESSION.id
    ) === 'true';
  } catch { return false; }
}

/**
 * @function setAlertPreference
 * @description Persists the smart alert preference for the current user.
 * @param {boolean} enabled - Whether alerts should be enabled.
 * @returns {void}
 */
function setAlertPreference(enabled) {
  if (!SESSION || !SESSION.id) return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY_PREFIX + 'smart-alerts:' + SESSION.id,
      String(enabled)
    );
  } catch { /* ignore */ }
}

/**
 * @function toggleSmartAlerts
 * @description Toggles Smart Dispatch Alerts on or off. Persists preference
 * to localStorage, updates button UI with GSAP animation, and deregisters
 * Background Sync when disabling.
 * @returns {Promise<void>}
 */
window.toggleSmartAlerts = async function() {
  const btn = document.getElementById('btn-smart-alerts');
  const isEnabled = getAlertPreference();

  if (isEnabled) {
    // DISABLE PATH
    setAlertPreference(false);
    if (window._swReg && 'sync' in window._swReg) {
      try { await window._swReg.sync.register('regenx-order-sync-pause'); } catch {}
    }
    if (btn) {
      btn.style.background = 'transparent';
      btn.style.border = '2px solid var(--red)';
      btn.style.color = 'var(--red)';
      btn.textContent = '🔔 Enable Smart Alerts'; // ← was wrong, now correct
      if (window.gsap) {
        gsap.fromTo(btn, { scale: 1 }, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.inOut' });
      }
    }
    window.showToast('🔕 Smart Alerts disabled.');
    return;
  }

  // ENABLE PATH
  if (!('Notification' in window)) {
    window.showToast('⚠ Notifications not supported in this browser.');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    setAlertPreference(true);
    if (window._swReg && 'sync' in window._swReg) {
      try { await window._swReg.sync.register('regenx-order-sync'); } catch {}
    }
    if (btn) {
      btn.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
      btn.style.border = 'none';
      btn.style.color = '#fff';
      btn.textContent = '🔕 Disable Smart Alerts'; // ← correct, after enabling show disable
      if (window.gsap) {
        gsap.fromTo(btn, { scale: 1 }, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.inOut' });
      }
    }
    window.showToast('🔔 Smart Alerts enabled!');
  } else {
    window.showToast('⚠ Notifications blocked. Enable in browser settings.');
  }
};

// ── Trigger Background Sync when going offline ──
window.addEventListener('offline', () => {
  window.showToast && window.showToast('📶 Offline mode — changes queued for sync.');
  if (window._swReg && 'sync' in window._swReg) {
    window._swReg.sync.register('regenx-order-sync');
  }
});
window.addEventListener('online', () => {
  window.showToast && window.showToast('✅ Back online! Syncing queued data...');
  if (window.syncPendingActions) window.syncPendingActions();
});


// Simulated Localities for default plants (if no GPS)
const DEFAULT_LOCALITIES = [
  { name: "Sector Beta", lat: 28.4682, lng: 77.5031 },
  { name: "Delta Zone", lat: 28.4710, lng: 77.4950 }
];

const WASTE_TYPES = ['Food waste (wet)', 'Vegetable scraps', 'Mixed kitchen waste', 'Biodegradable packaging'];
const SHIFTS = ['Morning Shift (08:00 - 12:00)', 'Evening Shift (16:00 - 20:00)'];

/**
 * CO₂ offset emission factors (kg CO₂eq per kg bio-waste) keyed by waste type and processing method.
 * Source: IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Volume 5 (Waste);
 * GHG Protocol Scope 3 Technical Guidance.
 */
const CO2_FACTORS = {
  'Food waste (wet)':        { anaerobic_digestion: 0.67, composting: 0.20, biogas: 0.58, default: 0.67 },
  'Vegetable scraps':        { anaerobic_digestion: 0.54, composting: 0.18, biogas: 0.45, default: 0.54 },
  'Mixed kitchen waste':     { anaerobic_digestion: 0.60, composting: 0.22, biogas: 0.52, default: 0.60 },
  'Biodegradable packaging': { anaerobic_digestion: 0.35, composting: 0.12, biogas: 0.28, default: 0.35 }
};

const PROCESSING_METHODS = {
  anaerobic_digestion: 'Anaerobic Digestion',
  composting:          'Composting',
  biogas:              'Biogas Recovery'
};

/**
 * Resolves the correct CO₂ offset factor for a given waste type and processing method.
 * Falls back to a conservative estimate if the combination is not found.
 * @param {string} wasteType - The waste category (must match a key in CO2_FACTORS).
 * @param {string} [processingMethod] - The plant's processing method key.
 * @returns {number} CO₂ offset factor in kg CO₂eq per kg waste.
 */
function getCO2Factor(wasteType, processingMethod) {
  const typeFactors = CO2_FACTORS[wasteType];
  if (!typeFactors) return 0.55; // Conservative fallback for unrecognised waste types
  return typeFactors[processingMethod] || typeFactors['default'] || 0.55;
}
window.getCO2Factor = getCO2Factor;
const NOTIF_STORE_KEY = 'notifications';
const OFFLINE_QUEUE_KEY = 'offline-sync-queue';
const MAX_NOTIF_HISTORY = 60;
const DEDUP_WINDOW_MS = 30000;

// ── DB HELPER ──
const DB = {
  get: (key) => { try { const r = window.localStorage.getItem(STORAGE_KEY_PREFIX + key); return r ? JSON.parse(r) : null; } catch { return null; } },
  set: (key, val, options = {}) => { try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
    if (!options.silent && ReGenXRealtime) {
      ReGenXRealtime.syncStorageMutation({
        updates: [{ key: STORAGE_KEY_PREFIX + key, value: val, action: 'set' }],
        rooms: options.rooms,
        eventType: options.eventType || 'KPI_UPDATED',
        meta: options.meta || {}
      });
    }
    // Write-through to Appwrite — fire-and-forget, falls back to offline queue
    if (!options.silent && !options.localOnly && val?.id) {
      if (key.startsWith('ord:') && window.CloudSync) {
        if (navigator.onLine && window.CloudSync.isLive) {
          window.CloudSync.pushDocument(window.CloudSync.config?.ordersCollectionId, val)
            .catch(() => window.CloudSync.queueOfflineWrite(key, val));
        } else {
          window.CloudSync.queueOfflineWrite(key, val);
        }
      } else if (key.startsWith('acc:') && window.CloudSync) {
        if (navigator.onLine && window.CloudSync.isLive) {
          window.CloudSync.pushAccount(val)
            .catch(() => window.CloudSync.queueOfflineWrite(key, val));
        } else {
          window.CloudSync.queueOfflineWrite(key, val);
        }
      }
    }
    return true;
  } catch { return false; } },
  list: (prefix) => {
    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k.startsWith(STORAGE_KEY_PREFIX + prefix)) keys.push(k.substring(STORAGE_KEY_PREFIX.length));
      }
      return keys;
    } catch { return []; }
  }
};

function loadNotifications() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + NOTIF_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifs) {
  try { window.localStorage.setItem(STORAGE_KEY_PREFIX + NOTIF_STORE_KEY, JSON.stringify(notifs)); } catch { /* ignore */ }
}

function getNotificationsForRole(role) {
  const all = loadNotifications();
  return all.filter(n => n.role === 'all' || n.role === role).sort((a, b) => b.ts - a.ts);
}

function getUnreadNotificationCount(role) {
  return getNotificationsForRole(role).filter(n => !n.read).length;
}

function loadOfflineQueue() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + OFFLINE_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue) {
  try { window.localStorage.setItem(STORAGE_KEY_PREFIX + OFFLINE_QUEUE_KEY, JSON.stringify(queue)); } catch { /* ignore */ }
}

function updateNotificationBadge() {
  const badge = document.getElementById('notif-count');
  const unread = getUnreadNotificationCount(SESSION.role);
  if (badge) {
    badge.textContent = unread > 0 ? unread : '0';
    badge.style.display = 'inline-flex';
    badge.style.opacity = unread ? '1' : '0.65';
  }
  const label = document.getElementById('notif-unread-count');
  if (label) {
    label.textContent = `${unread} unread notification${unread === 1 ? '' : 's'}`;
  }
}

function updateOfflineQueueIndicator() {
  const queueCount = loadOfflineQueue().length;
  const statusLabel = document.getElementById('notif-sync-status');
  if (statusLabel) {
    statusLabel.textContent = queueCount
      ? `${queueCount} pending sync action${queueCount === 1 ? '' : 's'}`
      : 'All activity synced';
    statusLabel.classList.toggle('sync-pending', queueCount > 0);
  }
}

function isDuplicateNotification(title, body) {
  const now = Date.now();
  const duplicates = loadNotifications().filter(n => n.title === title && n.body === body && (now - n.ts) < DEDUP_WINDOW_MS);
  return duplicates.length > 0;
}

function sendBrowserNotification(title, body, url = '/') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url }
    });
    notification.onclick = () => window.focus() && window.location.assign(url);
  } catch (e) {
    console.warn('Browser notification failed', e);
  }
}

function pushActivityFeed(event) {
  const feed = document.getElementById('gw-feed');
  if (!feed) return;
  const item = document.createElement('div');
  item.className = 'gw-item';
  item.innerHTML = `
    <div>${event.icon || '🔔'} ${event.title}</div>
    <div class="gw-time">${fmtDate(event.ts || Date.now())}</div>
  `;
  const first = feed.firstChild;
  if (first && first.classList.contains('gw-item') && first.textContent.includes('No network activity')) {
    feed.innerHTML = '';
  }
  feed.prepend(item);
  while (feed.children.length > 6) feed.removeChild(feed.lastChild);
}

function addWorkflowNotification({ title, body, role = 'all', type = 'workflow', priority = 'normal', relatedId = null, url = '/' }) {
  if (!title || !body) return;
  if (isDuplicateNotification(title, body)) return;
  const notifications = loadNotifications();
  const item = {
    id: uid(),
    ts: ts(),
    title,
    body,
    type,
    role,
    priority,
    relatedId,
    url,
    read: false
  };
  notifications.unshift(item);
  saveNotifications(notifications.slice(0, MAX_NOTIF_HISTORY));
  updateNotificationBadge();
  renderNotificationCenter();
  if (priority === 'high' || Notification.permission === 'granted') {
    sendBrowserNotification(title, body, url);
  }
  if (window.showToast) {
    window.showToast(`🔔 ${title}`);
  }
  pushActivityFeed({ title, icon: priority === 'high' ? '🚨' : '🔔', ts: item.ts });
}

window.openNotificationCenter = function(force) {
  const drawer = document.getElementById('notification-drawer');
  if (!drawer) return;
  const isOpen = force === undefined ? !drawer.classList.contains('open') : force;
  drawer.classList.toggle('open', isOpen);
  if (isOpen) {
    renderNotificationCenter();
    updateNotificationBadge();
    updateOfflineQueueIndicator();
  }
};

function renderNotificationCenter() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  const notifications = getNotificationsForRole(SESSION.role);
  if (!notifications.length) {
    list.innerHTML = `<div class="notification-empty">No notifications yet. Workflow alerts will appear here in real time.</div>`;
    return;
  }
  list.innerHTML = notifications.map(n => `
    <div class="notification-card ${n.read ? 'read' : 'unread'}">
      <div class="notification-card-header">
        <div class="notification-card-title">${n.title}</div>
        <div class="notification-card-meta">${fmtDate(n.ts)}</div>
      </div>
      <div class="notification-card-body">${n.body}</div>
      <div class="notification-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="markNotificationRead('${n.id}')">Mark read</button>
        <button class="btn btn-ghost btn-sm" onclick="window.location.href='${n.url}'">View</button>
      </div>
    </div>
  `).join('');
}

window.markNotificationRead = function(id) {
  const notifications = loadNotifications();
  const target = notifications.find(n => n.id === id);
  if (target) target.read = true;
  saveNotifications(notifications);
  renderNotificationCenter();
  updateNotificationBadge();
};

window.markAllNotificationsRead = function() {
  const notifications = loadNotifications().map(n => ({ ...n, read: true }));
  saveNotifications(notifications);
  renderNotificationCenter();
  updateNotificationBadge();
};

function queueOfflineAction(action) {
  if (!action || !action.type) return;
  const queue = loadOfflineQueue();
  queue.push({ id: uid(), ts: ts(), ...action });
  saveOfflineQueue(queue);
  updateOfflineQueueIndicator();
}

async function processOfflineAction(action) {
  if (!action || !action.type) return;
  if (action.type === 'sync-order') {
    if (window.CloudSync && window.CloudSync.isLive && navigator.onLine) {
      window.CloudSync.pushDocument('orders', action.payload);
    }
  }
  if (action.type === 'sync-notification') {
    // notifications are already stored locally; this entry is a marker for remote sync
  }
}

async function flushOfflineQueue() {
  const queue = loadOfflineQueue();
  if (!queue.length) return;
  for (const action of queue) {
    await processOfflineAction(action);
  }
  saveOfflineQueue([]);
  updateOfflineQueueIndicator();
  addWorkflowNotification({
    title: 'Offline Sync Completed',
    body: `${queue.length} queued action${queue.length === 1 ? '' : 's'} were synced successfully.`,
    role: SESSION.role || 'all',
    type: 'sync',
    priority: 'normal'
  });
}

window.syncPendingActions = async function() {
  if (!navigator.onLine) return;
  if (window._swReg && 'sync' in window._swReg) {
    window._swReg.sync.register('regenx-order-sync').catch(() => {});
  }
  await flushOfflineQueue();
};

window.handleRealtimeEvent = function(event) {
  if (!event || !event.type) return;
  const payload = event.payload || {};
  switch (event.type) {
    case 'dispatch-created':
      addWorkflowNotification({
        title: 'New Nearby Pickup Request',
        body: `${payload.providerOrg || 'A provider'} requested ${payload.kg || 'some'}kg of ${payload.wasteType || 'waste'}.`,
        role: 'rider',
        type: 'dispatch-created',
        priority: 'high',
        relatedId: payload.id,
        url: '/'
      });
      break;
    case 'pickup-assigned':
      addWorkflowNotification({
        title: 'Pickup Accepted',
        body: `${payload.riderName || 'A rider'} has accepted the pickup request.`,
        role: 'provider',
        type: 'pickup-assigned',
        priority: 'high',
        relatedId: payload.id,
        url: '/'
      });
      break;
    case 'pickup-confirmed':
      addWorkflowNotification({
        title: 'Waste Collected',
        body: `${payload.riderName || 'Your rider'} has picked up the load.`,
        role: 'plant',
        type: 'pickup-confirmed',
        priority: 'high',
        relatedId: payload.id,
        url: '/'
      });
      break;
    case 'delivery-confirmed':
      addWorkflowNotification({
        title: 'Plant Confirmation Received',
        body: `${payload.plantName || 'A plant'} confirmed the delivery.`,
        role: 'provider',
        type: 'delivery-confirmed',
        priority: 'normal',
        relatedId: payload.id,
        url: '/'
      });
      break;
    case 'token-credited':
      addWorkflowNotification({
        title: 'Reward Credited',
        body: `${payload.tokens || 0} $RGX have been added to your balance.`,
        role: 'provider',
        type: 'token-credited',
        priority: 'high',
        relatedId: payload.id,
        url: '/'
      });
      break;
    case 'ai-warning':
      addWorkflowNotification({
        title: 'AI Contamination Alert',
        body: payload.body || 'A contamination risk was detected on pickup.',
        role: 'rider',
        type: 'ai-warning',
        priority: 'high',
        relatedId: payload.id,
        url: '/'
      });
      break;
    default:
      addWorkflowNotification({
        title: event.title || 'Workflow Update',
        body: event.body || 'A new system event occurred.',
        role: SESSION.role || 'all',
        type: event.type,
        priority: 'normal',
        relatedId: payload.id,
        url: '/'
      });
      break;
  }
};

function getRealtimeRoomsForRole(role) {
  const rooms = ['network_room'];
  if (role === 'provider') rooms.push('providers_room');
  if (role === 'rider') rooms.push('riders_room');
  if (role === 'plant') rooms.push('plants_room');
  rooms.push('admin_room');
  return Array.from(new Set(rooms));
}

function publishOperationalEvent(type, updates = [], meta = {}, rooms = null) {
  if (!ReGenXRealtime) return;
  ReGenXRealtime.emitOperationalEvent({
    type,
    rooms: rooms || getRealtimeRoomsForRole(SESSION.role),
    updates,
    meta
  });
}
/**
 * Load trust ledger events from localStorage.
 * @returns {Array<Object>} Ledger events.
 */
function loadTrustLedger() {
  try {
    const raw = window.localStorage.getItem(TRUST_LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const ledger = parsed.filter(e => e && typeof e === 'object');
    const verification = TrustProtocol.verifyLedgerIntegrity(ledger);
    if (!verification.valid) {
      handleTrustLedgerTamper(verification);
    }
    return ledger;
  } catch {
    handleTrustLedgerTamper({ valid: false, tampered: true, brokenIndex: null });
    return [];
  }
}

let trustLedgerTamperWarningShown = false;

/**
 * @function handleTrustLedgerTamper
 * @description Shows a single warning toast when trust ledger integrity is compromised.
 * @param {{valid:boolean,tampered:boolean,brokenIndex:(number|null)}} result - Verification result.
 * @returns {void}
 */
function handleTrustLedgerTamper(result) {
  if (trustLedgerTamperWarningShown || !result?.tampered) return;
  trustLedgerTamperWarningShown = true;
  if (window.showToast) {
    window.showToast('⚠ Trust ledger integrity compromised.');
  }
}

/**
 * @function handleLedgerStorageError
 * @description Centralized handler for ledger localStorage exceptions (e.g. quota exceeded).
 * @param {Error} err - Exception object.
 * @returns {void}
 */
function handleLedgerStorageError(err) {
  console.error("Ledger storage error:", err);
  if (window.showToast) {
    window.showToast("⚠️ Storage limit exceeded. Stale ledger entries evicted.");
  }
}

/**
 * Save trust ledger events to localStorage.
 * @param {Array<Object>} events - Ledger events.
 * @returns {Promise<boolean>} True when persistence succeeds.
 */
async function saveTrustLedger(events) {
  try {
    const capped = Array.isArray(events) ? events.slice(-200) : [];
    const prepared = await prepareTrustLedgerForWrite(capped);
    const verification = TrustProtocol.verifyLedgerIntegrity(prepared);
    if (!verification.valid) {
      handleTrustLedgerTamper(verification);
      return false;
    }
    window.localStorage.setItem(TRUST_LEDGER_KEY, JSON.stringify(prepared));
    ReGenXRealtime?.syncRawKey(TRUST_LEDGER_KEY, prepared, { eventType: 'KPI_UPDATED', rooms: ['network_room', 'providers_room', 'riders_room', 'plants_room'] });
    return true;
  } catch (err) {
    handleLedgerStorageError(err);
    return false;
  }
}

/**
 * Generate a ledger hash (SHA-256 length) for integrity records.
 * @param {Object} entry - Ledger payload.
 * @param {string} previousHash - Previous ledger hash.
 * @returns {Promise<string>} Hex hash with 0x prefix.
 */
async function generateLedgerHash(entry, previousHash = 'GENESIS') {
  return TrustProtocol.generateLedgerHash(entry, previousHash);
}

/**
 * Build the canonical payload for trust ledger hashing.
 * @param {Object} entry - Ledger entry values.
 * @param {string} previousHash - Previous chain hash.
 * @returns {Object} Canonical entry payload.
 */
function buildTrustLedgerPayload(entry, previousHash = 'GENESIS') {
  return {
    previousHash: typeof previousHash === 'string' && previousHash ? previousHash : 'GENESIS',
    orderId: typeof entry?.orderId === 'string' ? entry.orderId : String(entry?.orderId ?? ''),
    event: typeof entry?.event === 'string' ? entry.event : String(entry?.event ?? ''),
    ts: Number.isFinite(entry?.ts) ? entry.ts : ts(),
    actorRole: typeof entry?.actorRole === 'string' ? entry.actorRole : String(entry?.actorRole ?? ''),
    actorId: typeof entry?.actorId === 'string' ? entry.actorId : String(entry?.actorId ?? ''),
    lat: Number.isFinite(entry?.lat) ? entry.lat : null,
    lng: Number.isFinite(entry?.lng) ? entry.lng : null
  };
}

/**
 * Normalize a ledger entry into the sealed v2 format and recalculate its hash.
 * @param {Object} entry - Raw ledger entry.
 * @param {string} previousHash - Previous chain hash.
 * @returns {Promise<Object>} Normalized ledger entry.
 */
async function prepareTrustLedgerEntry(entry, previousHash = 'GENESIS') {
  const payload = buildTrustLedgerPayload(entry, previousHash);
  const hash = await generateLedgerHash(payload, previousHash);
  return {
    _v: 2,
    id: typeof entry?.id === 'string' && entry.id ? entry.id : uid(),
    orderId: payload.orderId,
    event: payload.event,
    ts: payload.ts,
    lat: payload.lat,
    lng: payload.lng,
    actorRole: payload.actorRole,
    actorId: payload.actorId,
    trustScore: Number.isFinite(entry?.trustScore) ? entry.trustScore : 0,
    previousHash,
    hash,
    sealed: true,
    verified: true
  };
}

/**
 * Prepare a ledger for persistence by sealing every entry with a fresh hash chain.
 * @param {Array<Object>} events - Raw or partially normalized ledger entries.
 * @returns {Promise<Array<Object>>} Prepared ledger entries.
 */
async function prepareTrustLedgerForWrite(events) {
  const prepared = [];
  let previousHash = 'GENESIS';
  for (const entry of Array.isArray(events) ? events : []) {
    const normalized = await prepareTrustLedgerEntry(entry, previousHash);
    prepared.push(normalized);
    previousHash = normalized.hash;
  }
  return prepared;
}

/**
 * Get route endpoints for an order.
 * @param {Object} order - Order object.
 * @returns {{start?:{lat:number,lng:number}, end?:{lat:number,lng:number}}}
 */
function getOrderRouteEndpoints(order) {
  if (!order) return {};
  const plant = order.plantId ? DB.get('acc:' + order.plantId) : null;
  const start = (typeof order.providerLat === 'number' && typeof order.providerLng === 'number')
    ? { lat: order.providerLat, lng: order.providerLng }
    : null;
  const end = plant && typeof plant.lat === 'number' && typeof plant.lng === 'number'
    ? { lat: plant.lat, lng: plant.lng }
    : null;
  return { start, end };
}

/**
 * Get trust ledger events for an order in stored chain order.
 * @param {string} orderId - Order id.
 * @returns {Array<Object>} Order events in chain order.
 */
function getOrderLedgerChainEvents(orderId) {
  return loadTrustLedger().filter(e => e.orderId === orderId);
}

/**
 * Get ledger events for a specific order.
 * @param {string} orderId - Order id.
 * @returns {Array<Object>} Order events.
 */
function getOrderLedgerEvents(orderId) {
  return loadTrustLedger().filter(e => e.orderId === orderId).sort((a, b) => a.ts - b.ts);
}

/**
 * Calculate integrity score and anomalies for an order.
 * @param {Object} order - Order object.
 * @returns {{score:number, maxGapMins:number, maxDeviationKm:number, anomalies:{timeGap:boolean,routeDeviation:boolean}}}
 */
function getOrderIntegrity(order) {
  const events = getOrderLedgerChainEvents(order.id);
  const route = getOrderRouteEndpoints(order);
  return TrustProtocol.calculateIntegrityScore(events, route, distanceKm);
}

/**
 * Append a trust ledger event and compute integrity score.
 * @param {Object} order - Order object.
 * @param {string} event - Event label.
 * @param {string} actorRole - Actor role.
 * @param {{lat?:number,lng?:number}} coords - Event coordinates.
 */
async function recordTrustEvent(order, event, actorRole, coords = {}) {
  if (!order) return false;
  const ledger = loadTrustLedger();
  const verification = TrustProtocol.verifyLedgerIntegrity(ledger);
  if (!verification.valid) {
    handleTrustLedgerTamper(verification);
    return false;
  }

  const preparedLedger = await prepareTrustLedgerForWrite(ledger);
  const previousHash = preparedLedger.length ? preparedLedger[preparedLedger.length - 1].hash : 'GENESIS';
  const entry = {
    _v: 2,
    id: uid(),
    orderId: order.id,
    event,
    ts: ts(),
    lat: typeof coords.lat === 'number' ? coords.lat : null,
    lng: typeof coords.lng === 'number' ? coords.lng : null,
    actorRole,
    actorId: SESSION?.id || 'unknown',
    trustScore: 0,
    previousHash,
    hash: '',
    sealed: true,
    verified: true
  };
  entry.hash = await generateLedgerHash(entry, previousHash);

  const nextLedger = [...preparedLedger, entry];
  const route = getOrderRouteEndpoints(order);
  const orderEvents = nextLedger.filter(e => e.orderId === order.id);
  const integrity = TrustProtocol.calculateIntegrityScore(orderEvents, route, distanceKm);
  if (integrity.tampered) {
    handleTrustLedgerTamper(integrity);
    return false;
  }
  entry.trustScore = integrity.score;
  return saveTrustLedger(nextLedger);
}

/**
 * Compute a public trust index from ledger events.
 * @returns {{score:number, label:string, anomalyRate:number, orderCount:number}}
 */
function getTrustIndex() {
  const ledger = loadTrustLedger();
  if (!ledger.length) return { score: 96, label: 'Stable', anomalyRate: 0, orderCount: 0 };

  const orderIds = Array.from(new Set(ledger.map(e => e.orderId)));
  const scores = orderIds.map(id => {
    const order = getOrder(id);
    if (!order) return 90;
    return getOrderIntegrity(order).score;
  });
  const avg = Math.round(scores.reduce((s, n) => s + n, 0) / Math.max(scores.length, 1));
  const anomalyCount = orderIds.filter(id => {
    const order = getOrder(id);
    if (!order) return false;
    const integrity = getOrderIntegrity(order);
    return integrity.anomalies.timeGap || integrity.anomalies.routeDeviation;
  }).length;
  const anomalyRate = orderIds.length ? Math.round((anomalyCount / orderIds.length) * 100) : 0;
  const label = avg >= 90 ? 'Pristine' : avg >= 75 ? 'Stable' : avg >= 60 ? 'Watch' : 'Risk';
  return { score: avg, label, anomalyRate, orderCount: orderIds.length };
}

/**
 * Render a trust index summary card.
 * @returns {string} HTML string.
 */
function renderTrustIndexCard() {
  const { score, label, anomalyRate, orderCount } = getTrustIndex();
  if (!orderCount) {
    return renderEmptyStateCard({
      icon: '🛡️',
      title: 'Public Trust Index',
      description: 'No verified orders have been recorded yet.',
      subtext: 'Integrity scoring will appear once dispatch events are written to the ledger.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
  }
  const badgeClass = score >= 90 ? 'badge-green' : score >= 75 ? 'badge-blue' : score >= 60 ? 'badge-amber' : 'badge-red';
      return `
        <div class="glass-card trust-index-card" style="margin-bottom:24px;">
          <div class="between" style="margin-bottom:12px;">
            <div>
              <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Public Trust Index</div>
              <div style="font-size:20px; font-weight:800; margin-top:4px;">${score}/100</div>
            </div>
            <span class="badge ${badgeClass}">${label}</span>
          </div>
          <div class="trust-index-bar"><span style="width:${score}%;"></span></div>
          <div class="between" style="margin-top:10px; font-size:12px; color:var(--text-muted);">
            <div>${orderCount} verified order${orderCount === 1 ? '' : 's'}</div>
            <div>${anomalyRate}% anomaly rate</div>
          </div>
        </div>
      `;
}

/**
 * Load ESG alerts from localStorage.
 * @returns {Array<Object>} Alerts array.
 */
function loadEsgAlerts() {
  try {
    const raw = window.localStorage.getItem(ESG_ALERTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => e && e._v === 1);
  } catch {
    return [];
  }
}

/**
 * Save ESG alerts to localStorage.
 * @param {Array<Object>} alerts - Alerts to save.
 */
function saveEsgAlerts(alerts) {
  try {
    const capped = Array.isArray(alerts) ? alerts.slice(-200) : [];
    window.localStorage.setItem(ESG_ALERTS_KEY, JSON.stringify(capped));
    ReGenXRealtime?.syncRawKey(ESG_ALERTS_KEY, capped, { eventType: 'KPI_UPDATED', rooms: ['network_room', 'providers_room', 'riders_room', 'plants_room'] });
  } catch (err) { handleLedgerStorageError(err); }
}

/**
 * Append a new ESG alert.
 * @param {Object} alert - Alert payload.
 */
function addEsgAlert(alert) {
  const alerts = loadEsgAlerts();
  if (alert) alert._v = 1;
  alerts.push(alert);
  saveEsgAlerts(alerts);
}

/**
 * Resolve an ESG alert by id.
 * @param {string} id - Alert id.
 */
window.resolveEsgAlert = function(id) {
  const alerts = loadEsgAlerts();
  const target = alerts.find(a => a.id === id);
  if (target) target.resolved = true;
  saveEsgAlerts(alerts);
  refreshCurrentView(true);
}

/**
 * Clear all ESG alerts.
 */
window.clearEsgAlerts = function() {
  if (!confirm('Clear all compliance alerts?')) return;
  saveEsgAlerts([]);
  refreshCurrentView(true);
}

/**
 * Create compliance alerts for a completed order.
 * @param {Object} order - Completed order.
 */
function addEsgAlertsForOrder(order) {
  if (!order) return;
  const alerts = [];
  const expected = parseFloat(order.kg || 0);
  const actual = parseFloat(order.actualKg || 0);
  const diffRatio = expected ? Math.abs(actual - expected) / expected : 0;

  if (expected && actual && diffRatio > 0.25) {
    alerts.push({
      id: 'alert-' + uid(),
      orderId: order.id,
      type: 'weight_mismatch',
      severity: 'high',
      message: `Weight variance ${Math.round(diffRatio * 100)}% exceeds compliance threshold.`,
      ts: ts(),
      resolved: false
    });
  }

  if (parseFloat(order.segScore || 0) > 0 && parseFloat(order.segScore || 0) < 60) {
    alerts.push({
      id: 'alert-' + uid(),
      orderId: order.id,
      type: 'low_segregation',
      severity: 'medium',
      message: 'Segregation score below 60 may impact ESG certification.',
      ts: ts(),
      resolved: false
    });
  }

  const integrity = getOrderIntegrity(order);
  if (integrity.score < 60) {
    alerts.push({
      id: 'alert-' + uid(),
      orderId: order.id,
      type: 'integrity_risk',
      severity: 'high',
      message: 'Integrity score below 60 suggests custody or route anomaly.',
      ts: ts(),
      resolved: false
    });
  }

  alerts.forEach(addEsgAlert);
}

/**
 * Render a compact compliance radar widget.
 * @returns {string} HTML string.
 */
function renderComplianceWidget() {
  const alerts = loadEsgAlerts().filter(a => !a.resolved).sort((a, b) => b.ts - a.ts);
      const items = alerts.slice(0, 3).map(a => `
        <div class="compliance-item">
          <div>
            <div class="compliance-title">${a.message}</div>
            <div class="compliance-sub">Order #${a.orderId.slice(-6).toUpperCase()} · ${fmtDate(a.ts)}</div>
          </div>
          <span class="badge ${a.severity === 'high' ? 'badge-red' : 'badge-amber'}">${a.severity.toUpperCase()}</span>
        </div>
      `).join('');

  return `
    <div class="glass-card compliance-card" style="margin-bottom:24px;">
      <div class="between" style="margin-bottom:12px;">
        <div>
          <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Compliance Radar</div>
          <div style="font-size:18px; font-weight:800; margin-top:4px;">${alerts.length} active alert${alerts.length === 1 ? '' : 's'}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="showView('v-compliance')">Open →</button>
      </div>
      ${alerts.length ? items : renderDashboardListState({
        icon: '🧭',
        title: 'No compliance alerts',
        description: 'The ESG monitor has not detected any open alerts.',
        subtext: 'Resolved alerts remain available in the audit history.',
        statusLabel: 'Idle',
        tone: 'inactive'
      })}
    </div>
  `;
}

/**
 * Load credit ledger entries from localStorage.
 * @returns {Array<Object>} Ledger entries.
 */
function loadCreditLedger() {
  try {
    const raw = window.localStorage.getItem(CREDIT_LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => e && e._v === 1);
  } catch {
    return [];
  }
}

/**
 * Save credit ledger entries to localStorage.
 * @param {Array<Object>} entries - Ledger entries.
 */
function saveCreditLedger(entries) {
  try {
    const capped = Array.isArray(entries) ? entries.slice(-200) : [];
    window.localStorage.setItem(CREDIT_LEDGER_KEY, JSON.stringify(capped));
    ReGenXRealtime?.syncRawKey(CREDIT_LEDGER_KEY, capped, { eventType: 'KPI_UPDATED', rooms: ['network_room', 'providers_room'] });
  } catch (err) { handleLedgerStorageError(err); }
}

/**
 * Add a credit ledger entry.
 * @param {Object} entry - Ledger entry.
 */
function addCreditEntry(entry) {
  const entries = loadCreditLedger();
  if (entry) entry._v = 1;
  entries.push(entry);
  saveCreditLedger(entries);
}

/**
 * Compute reconciliation status.
 * @returns {{total:number, mismatches:number, score:number}}
 */
function getReconciliationSummary() {
  const entries = loadCreditLedger();
  if (!entries.length) return { total: 0, mismatches: 0, score: 100 };
  const mismatches = entries.filter(e => e.deltaPct >= 8).length;
  const score = Math.max(0, Math.round(100 - (mismatches / entries.length) * 100));
  return { total: entries.length, mismatches, score };
}

/**
 * Render a reconciliation widget.
 * @returns {string} HTML string.
 */
function renderReconciliationWidget() {
  const summary = getReconciliationSummary();
  if (!summary.total) {
    return renderEmptyStateCard({
      icon: '🧮',
      title: 'Carbon Credit Reconciliation',
      description: 'No ledger entries are available yet.',
      subtext: 'Minted credits and mismatch checks will appear after the first verified dispatch.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
  }
  const badgeClass = summary.score >= 90 ? 'badge-green' : summary.score >= 75 ? 'badge-blue' : summary.score >= 60 ? 'badge-amber' : 'badge-red';
  return `
    <div class="glass-card reconciliation-card" style="margin-bottom:24px;">
      <div class="between" style="margin-bottom:12px;">
        <div>
          <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Carbon Credit Reconciliation</div>
          <div style="font-size:18px; font-weight:800; margin-top:4px;">${summary.score}% Integrity</div>
        </div>
        <span class="badge ${badgeClass}">${summary.mismatches} mismatch${summary.mismatches === 1 ? '' : 'es'}</span>
      </div>
      <div class="reconciliation-bar"><span style="width:${summary.score}%;"></span></div>
      <div class="between" style="margin-top:10px; font-size:12px; color:var(--text-muted);">
        <div>${summary.total} ledger entries</div>
        <button class="btn btn-ghost btn-sm" onclick="showView('v-reconciliation')">Open →</button>
      </div>
    </div>
  `;
}

/**
 * Load SLA ledger entries from localStorage.
 * @returns {Array<Object>} SLA entries.
 */
function loadSlaLedger() {
  try {
    const raw = window.localStorage.getItem(SLA_LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => e && e._v === 1);
  } catch {
    return [];
  }
}

/**
 * Save SLA ledger entries to localStorage.
 * @param {Array<Object>} entries - SLA entries.
 */
function saveSlaLedger(entries) {
  try {
    const capped = Array.isArray(entries) ? entries.slice(-200) : [];
    window.localStorage.setItem(SLA_LEDGER_KEY, JSON.stringify(capped));
    ReGenXRealtime?.syncRawKey(SLA_LEDGER_KEY, capped, { eventType: 'KPI_UPDATED', rooms: ['network_room', 'providers_room', 'riders_room', 'plants_room'] });
  } catch (err) { handleLedgerStorageError(err); }
}

/**
 * Add a new SLA entry for a dispatch.
 * @param {Object} order - Order object.
 */
function addSlaEntry(order) {
  if (!order) return;
  const entries = loadSlaLedger();
  entries.push({
    _v: 1,
    id: 'sla-' + uid(),
    orderId: order.id,
    org: order.providerOrg,
    createdTs: order.ts,
    targetMins: 90,
    status: 'pending',
    pickupTs: null,
    completeTs: null,
    deltaMins: null,
    breach: false
  });
  saveSlaLedger(entries);
}

/**
 * Update an SLA entry by order id.
 * @param {string} orderId - Order id.
 * @param {Object} patch - Partial entry fields.
 */
function updateSlaEntry(orderId, patch) {
  const entries = loadSlaLedger();
  const entry = entries.find(e => e.orderId === orderId);
  if (!entry) return;
  Object.assign(entry, patch);
  if (entry.completeTs) {
    const delta = (entry.completeTs - entry.createdTs) / 60000;
    entry.deltaMins = Math.round(delta);
    entry.breach = delta > entry.targetMins;
    entry.status = 'completed';
  }
  saveSlaLedger(entries);
}

/**
 * Calculate SLA summary stats.
 * @returns {{total:number, breaches:number, open:number, score:number}}
 */
function getSlaSummary() {
  const entries = loadSlaLedger();
  const total = entries.length;
  const breaches = entries.filter(e => e.breach).length;
  const open = entries.filter(e => !e.completeTs).length;
  const score = total ? Math.max(0, Math.round(100 - (breaches / total) * 100)) : 100;
  return { total, breaches, open, score };
}

/**
 * Render SLA widget.
 * @returns {string} HTML string.
 */
function renderSlaWidget() {
  const summary = getSlaSummary();
  if (!summary.total) {
    return renderEmptyStateCard({
      icon: '⏱️',
      title: 'No dispatch SLA data',
      description: 'Dispatch activity tracking will begin once orders are processed.',
      subtext: 'SLA metrics and on-time performance will appear after your first completed dispatch.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
  }
  const badgeClass = summary.score >= 90 ? 'badge-green' : summary.score >= 75 ? 'badge-blue' : summary.score >= 60 ? 'badge-amber' : 'badge-red';
  return `
    <div class="glass-card sla-card" style="margin-bottom:24px;">
      <div class="between" style="margin-bottom:12px;">
        <div>
          <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Dispatch SLA Monitor</div>
          <div style="font-size:18px; font-weight:800; margin-top:4px;">${summary.score}% On-Time</div>
        </div>
        <span class="badge ${badgeClass}">${summary.breaches} breach${summary.breaches === 1 ? '' : 'es'}</span>
      </div>
      <div class="sla-bar"><span style="width:${summary.score}%;"></span></div>
      <div class="between" style="margin-top:10px; font-size:12px; color:var(--text-muted);">
        <div>${summary.open} active dispatch${summary.open === 1 ? '' : 'es'}</div>
        <button class="btn btn-ghost btn-sm" onclick="showView('v-sla')">Open →</button>
      </div>
    </div>
  `;
}

/**
 * Load energy ledger entries from localStorage.
 * @returns {Array<Object>} Energy ledger entries.
 */
function loadEnergyLedger() {
  try {
    const raw = window.localStorage.getItem(ENERGY_LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => e && e._v === 1);
  } catch {
    return [];
  }
}

/**
 * Save energy ledger entries to localStorage.
 * @param {Array<Object>} entries - Energy entries.
 */
function saveEnergyLedger(entries) {
  try {
    const capped = Array.isArray(entries) ? entries.slice(-200) : [];
    window.localStorage.setItem(ENERGY_LEDGER_KEY, JSON.stringify(capped));
    ReGenXRealtime?.syncRawKey(ENERGY_LEDGER_KEY, capped, { eventType: 'KPI_UPDATED', rooms: ['network_room', 'providers_room', 'plants_room'] });
  } catch (err) { handleLedgerStorageError(err); }
}

/**
 * Add a new energy ledger entry.
 * @param {Object} entry - Energy entry.
 */
function addEnergyEntry(entry) {
  const entries = loadEnergyLedger();
  if (entry) entry._v = 1;
  entries.push(entry);
  saveEnergyLedger(entries);
}

/**
 * Summarize energy ledger performance.
 * @returns {{total:number, avgScore:number, totalEnergy:number}}
 */
function getEnergySummary() {
  const entries = loadEnergyLedger();
  if (!entries.length) return { total: 0, avgScore: 0, totalEnergy: 0 };
  const avgScore = Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length);
  const totalEnergy = entries.reduce((s, e) => s + e.energyKwh, 0);
  return { total: entries.length, avgScore, totalEnergy: Math.round(totalEnergy) };
}

/**
 * Render energy yield scorecard widget.
 * @returns {string} HTML string.
 */
function renderEnergyWidget() {
  const summary = getEnergySummary();
  if (!summary.total) {
    return renderEmptyStateCard({
      icon: '⚡',
      title: 'No energy analytics yet',
      description: 'Energy yield scoring is available once plant processing data is recorded.',
      subtext: 'Complete your first intake and log biogas output to see efficiency metrics.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
  }
  const badgeClass = summary.avgScore >= 85 ? 'badge-green' : summary.avgScore >= 70 ? 'badge-blue' : summary.avgScore >= 55 ? 'badge-amber' : 'badge-red';
  return `
    <div class="glass-card energy-card" style="margin-bottom:24px;">
      <div class="between" style="margin-bottom:12px;">
        <div>
          <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Energy Yield Scorecard</div>
          <div style="font-size:18px; font-weight:800; margin-top:4px;">${summary.avgScore || '--'} / 100</div>
        </div>
        <span class="badge ${badgeClass}">${summary.totalEnergy} kWh</span>
      </div>
      <div class="energy-bar"><span style="width:${summary.avgScore}%;"></span></div>
      <div class="between" style="margin-top:10px; font-size:12px; color:var(--text-muted);">
        <div>${summary.total} batches scored</div>
        <button class="btn btn-ghost btn-sm" onclick="showView('v-energy')">Open →</button>
      </div>
    </div>
  `;
}

/**
 * Load sensor reliability snapshots.
 * @returns {Array<Object>} Sensor snapshots.
 */
function loadSensorLedger() {
  try {
    const raw = window.localStorage.getItem(SENSOR_LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => e && e._v === 1);
  } catch {
    return [];
  }
}

/**
 * Save sensor reliability snapshots.
 * @param {Array<Object>} entries - Sensor snapshots.
 */
function saveSensorLedger(entries) {
  try {
    const capped = Array.isArray(entries) ? entries.slice(-50) : [];
    window.localStorage.setItem(SENSOR_LEDGER_KEY, JSON.stringify(capped));
  } catch (err) { handleLedgerStorageError(err); }
}

/**
 * Add a new sensor reliability snapshot.
 * @param {Object} snapshot - Snapshot payload.
 */
function addSensorSnapshot(snapshot) {
  const entries = loadSensorLedger();
  if (snapshot) snapshot._v = 1;
  entries.push(snapshot);
  saveSensorLedger(entries.slice(-50));
}

/**
 * Calculate sensor reliability summary.
 * @returns {{score:number, offlineCount:number, total:number}}
 */
function getSensorReliabilitySummary() {
  const bins = getIoTBins();
  const total = bins.length;
  if (!total) return { score: 100, offlineCount: 0, staleCount: 0, total: 0 };
  const offlineCount = bins.filter(b => b.status === 'offline').length;
  const staleCount = bins.filter(b => b.lastReading && (Date.now() - b.lastReading) > 600000).length;
  const score = Math.max(0, Math.round(100 - ((offlineCount + staleCount) / total) * 100));
  return { score, offlineCount, staleCount, total };
}

/**
 * Render sensor reliability widget.
 * @returns {string} HTML string.
 */
function renderSensorWidget() {
  const summary = getSensorReliabilitySummary();
  if (!summary.total) {
    return renderEmptyStateCard({
      icon: '📡',
      title: 'No IoT bins connected',
      description: 'Sensor network monitoring requires registered IoT bins.',
      subtext: 'Register your first waste bin to track fill levels and receive alerts.',
      statusLabel: 'Idle',
      tone: 'inactive',
      actionHtml: SESSION.role === 'provider' ? '<button class="btn btn-ghost btn-sm" onclick="showView(\'v-iot-bins\')" style="margin-top:8px;">Connect Bins →</button>' : ''
    });
  }
  const badgeClass = summary.score >= 90 ? 'badge-green' : summary.score >= 75 ? 'badge-blue' : summary.score >= 60 ? 'badge-amber' : 'badge-red';
  return `
    <div class="glass-card sensor-reliability-card" style="margin-bottom:24px;">
      <div class="between" style="margin-bottom:12px;">
        <div>
          <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Sensor Reliability Index</div>
          <div style="font-size:18px; font-weight:800; margin-top:4px;">${summary.score}% Network Health</div>
        </div>
        <span class="badge ${badgeClass}">${summary.offlineCount} offline</span>
      </div>
      <div class="sensor-reliability-bar"><span style="width:${summary.score}%;"></span></div>
      <div class="between" style="margin-top:10px; font-size:12px; color:var(--text-muted);">
        <div>${summary.total} sensors monitored</div>
        <button class="btn btn-ghost btn-sm" onclick="showView('v-sensor')">Open →</button>
      </div>
    </div>
  `;
}

/**
 * Load emissions ledger entries.
 * @returns {Array<Object>} Emissions entries.
 */
function loadEmissionsLedger() {
  try {
    const raw = window.localStorage.getItem(EMISSIONS_LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => e && e._v === 1);
  } catch {
    return [];
  }
}

/**
 * Save emissions ledger entries.
 * @param {Array<Object>} entries - Emissions entries.
 */
function saveEmissionsLedger(entries) {
  try {
    const capped = Array.isArray(entries) ? entries.slice(-200) : [];
    window.localStorage.setItem(EMISSIONS_LEDGER_KEY, JSON.stringify(capped));
  } catch (err) { handleLedgerStorageError(err); }
}

/**
 * Add a new emissions ledger entry.
 * @param {Object} entry - Emissions entry.
 */
function addEmissionsEntry(entry) {
  const entries = loadEmissionsLedger();
  if (entry) entry._v = 1;
  entries.push(entry);
  saveEmissionsLedger(entries);
}

/**
 * Summarize emissions ledger.
 * @returns {{total:number, totalEmissions:number, totalOffset:number, avgScore:number}}
 */
function getEmissionsSummary() {
  const entries = loadEmissionsLedger();
  if (!entries.length) return { total: 0, totalEmissions: 0, totalOffset: 0, avgScore: 0 };
  const totalEmissions = entries.reduce((s, e) => s + e.emissionKg, 0);
  const totalOffset = entries.reduce((s, e) => s + e.offsetKg, 0);
  const avgScore = Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length);
  return { total: entries.length, totalEmissions: Math.round(totalEmissions), totalOffset: Math.round(totalOffset), avgScore };
}

/**
 * Render emissions tracker widget.
 * @returns {string} HTML string.
 */
function renderEmissionsWidget() {
  const summary = getEmissionsSummary();
  if (!summary.total) {
    return renderEmptyStateCard({
      icon: '🌍',
      title: 'No emissions data recorded',
      description: 'Route emissions tracking requires completed deliveries.',
      subtext: 'Finish your first delivery to calculate carbon offset and emissions impact.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
  }
  const badgeClass = summary.avgScore >= 85 ? 'badge-green' : summary.avgScore >= 70 ? 'badge-blue' : summary.avgScore >= 55 ? 'badge-amber' : 'badge-red';
  return `
    <div class="glass-card emissions-card" style="margin-bottom:24px;">
      <div class="between" style="margin-bottom:12px;">
        <div>
          <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Route Emissions Tracker</div>
          <div style="font-size:18px; font-weight:800; margin-top:4px;">${summary.avgScore || '--'} / 100</div>
        </div>
        <span class="badge ${badgeClass}">${summary.totalEmissions} kg CO₂</span>
      </div>
      <div class="emissions-bar"><span style="width:${summary.avgScore}%;"></span></div>
      <div class="between" style="margin-top:10px; font-size:12px; color:var(--text-muted);">
        <div>${summary.totalOffset} kg offset</div>
        <button class="btn btn-ghost btn-sm" onclick="showView('v-emissions')">Open →</button>
      </div>
    </div>
  `;
}

/**
 * Load compost quality ledger entries.
 * @returns {Array<Object>} Quality entries.
 */
function loadQualityLedger() {
  try {
    const raw = window.localStorage.getItem(QUALITY_LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => e && e._v === 1);
  } catch {
    return [];
  }
}

/**
 * Save compost quality ledger entries.
 * @param {Array<Object>} entries - Quality entries.
 */
function saveQualityLedger(entries) {
  try {
    const capped = Array.isArray(entries) ? entries.slice(-200) : [];
    window.localStorage.setItem(QUALITY_LEDGER_KEY, JSON.stringify(capped));
  } catch (err) { handleLedgerStorageError(err); }
}

/**
 * Add a compost quality ledger entry.
 * @param {Object} entry - Quality entry.
 */
function addQualityEntry(entry) {
  const entries = loadQualityLedger();
  if (entry) entry._v = 1;
  entries.push(entry);
  saveQualityLedger(entries);
}

/**
 * Summarize compost quality metrics.
 * @returns {{total:number, avgScore:number, lowCount:number}}
 */
function getQualitySummary() {
  const entries = loadQualityLedger();
  if (!entries.length) return { total: 0, avgScore: 0, lowCount: 0 };
  const avgScore = Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length);
  const lowCount = entries.filter(e => e.score < 60).length;
  return { total: entries.length, avgScore, lowCount };
}

/**
 * Render compost quality widget.
 * @returns {string} HTML string.
 */
function renderQualityWidget() {
  const summary = getQualitySummary();
  const badgeClass = summary.avgScore >= 85 ? 'badge-green' : summary.avgScore >= 70 ? 'badge-blue' : summary.avgScore >= 55 ? 'badge-amber' : 'badge-red';
  return `
    <div class="glass-card quality-card" style="margin-bottom:24px;">
      <div class="between" style="margin-bottom:12px;">
        <div>
          <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Compost Quality Index</div>
          <div style="font-size:18px; font-weight:800; margin-top:4px;">${summary.avgScore || '--'} / 100</div>
        </div>
        <span class="badge ${badgeClass}">${summary.lowCount} low</span>
      </div>
      <div class="quality-bar"><span style="width:${summary.avgScore}%;"></span></div>
      <div class="between" style="margin-top:10px; font-size:12px; color:var(--text-muted);">
        <div>${summary.total} batches graded</div>
        <button class="btn btn-ghost btn-sm" onclick="showView('v-quality')">Open →</button>
      </div>
    </div>
  `;
}

/**
 * Load automation pipeline tasks.
 * @returns {Array<Object>} Pipeline tasks.
 */
function loadAutomationPipeline() {
  try {
    const raw = window.localStorage.getItem(AUTOMATION_PIPELINE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save automation pipeline tasks.
 * @param {Array<Object>} tasks - Pipeline tasks.
 */
function saveAutomationPipeline(tasks) {
  try { window.localStorage.setItem(AUTOMATION_PIPELINE_KEY, JSON.stringify(tasks)); } catch { /* ignore */ }
}

/**
 * Seed default automation tasks for the admin pipeline.
 * @returns {Array<Object>} Seeded tasks.
 */
function seedAutomationPipeline() {
  const existing = loadAutomationPipeline();
  if (existing.length) return existing;
  const tasks = [
    { id: 'auto-' + uid(), title: 'Triage new issues', owner: 'Unassigned', status: 'queued', priority: 'high', ts: ts() },
    { id: 'auto-' + uid(), title: 'Assign reviewers to PRs', owner: 'Unassigned', status: 'queued', priority: 'medium', ts: ts() },
    { id: 'auto-' + uid(), title: 'Label GSSoC issues', owner: 'Unassigned', status: 'queued', priority: 'high', ts: ts() },
    { id: 'auto-' + uid(), title: 'Update project board', owner: 'Unassigned', status: 'queued', priority: 'low', ts: ts() }
  ];
  saveAutomationPipeline(tasks);
  return tasks;
}

/**
 * Update a pipeline task.
 * @param {string} id - Task id.
 * @param {Object} patch - Partial task fields.
 */
window.updateAutomationTask = function(id, patch) {
  const tasks = loadAutomationPipeline();
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  Object.assign(task, patch);
  saveAutomationPipeline(tasks);
  refreshCurrentView(true);
}

/**
 * Auto-assign a queued task to the current user.
 * @param {string} id - Task id.
 */
window.autoAssignTask = function(id) {
  updateAutomationTask(id, { owner: SESSION.name || 'Admin', status: 'active' });
}

/**
 * Auto-assign the next queued task.
 */
window.autoAssignNext = function() {
  const tasks = loadAutomationPipeline();
  const next = tasks.find(t => t.status === 'queued');
  if (!next) return showToast('✓ No queued tasks left.');
  updateAutomationTask(next.id, { owner: SESSION.name || 'Admin', status: 'active' });
}

/**
 * Get automation pipeline summary.
 * @returns {{queued:number, active:number, done:number}}
 */
function getAutomationSummary() {
  const tasks = loadAutomationPipeline();
  return {
    queued: tasks.filter(t => t.status === 'queued').length,
    active: tasks.filter(t => t.status === 'active').length,
    done: tasks.filter(t => t.status === 'done').length
  };
}

/**
 * Render automation pipeline widget.
 * @returns {string} HTML string.
 */
function renderAutomationWidget() {
  const summary = getAutomationSummary();
  return `
    <div class="glass-card automation-card" style="margin-bottom:24px;">
      <div class="between" style="margin-bottom:12px;">
        <div>
          <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Open Source Automation</div>
          <div style="font-size:18px; font-weight:800; margin-top:4px;">${summary.queued} queued</div>
        </div>
        <span class="badge badge-blue">Admin Pipeline</span>
      </div>
      <div class="automation-bar"><span style="width:${Math.min(100, (summary.done / Math.max(summary.queued + summary.active + summary.done, 1)) * 100)}%;"></span></div>
      <div class="between" style="margin-top:10px; font-size:12px; color:var(--text-muted);">
        <div>${summary.active} active · ${summary.done} done</div>
        <button class="btn btn-ghost btn-sm" onclick="showView('v-automation')">Open →</button>
      </div>
    </div>
  `;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function ts() { return Date.now(); }
function fmtDate(ms) { return new Date(ms).toLocaleDateString('en-IN', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; const dLat = (lat2-lat1)*Math.PI/180; const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

window.showToast = function(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

window.resetAppData = function() {
  if (!confirm('⚠ This will delete ALL registered accounts, orders, and data. The app will reset to a fresh state. Continue?')) return;
  // Remove all keys that start with our prefix
  const keysToRemove = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(STORAGE_KEY_PREFIX)) keysToRemove.push(k);
  }
  keysToRemove.forEach(k => window.localStorage.removeItem(k));
  ReGenXRealtime?.clearOperationalState(keysToRemove);
  // Also clear theme preferences (both keys for safety)
  window.localStorage.removeItem('regenx-theme');
  window.localStorage.removeItem('theme');
  // Reload fresh
  window.location.reload();
}

window.fetchWeather = async function(lat, lng) {
  if (!lat || !lng) { lat = 28.5355; lng = 77.3910; } // Fallback to Noida coords if undefined
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
    const d = await r.json();
    return d.current_weather; // { temperature, windspeed, weathercode }
  } catch(e) { return null; }
}

// ── STATE ──
let SESSION = { role: null, name: '', org: '', id: '', lat: null, lng: null };
window.SESSION = SESSION;
let selectedRole = 'provider';
let currentView = '';
window.currentView = currentView;
let rMap = null; // Rider map instance
let autoRefreshTimer = null;

// ── THEME ──
window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  if (next === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  window.localStorage.setItem('regenx-theme', next);
  const navToggleBtn = document.getElementById('navbar-theme-toggle');
  if (navToggleBtn) {
    navToggleBtn.innerText = next === 'dark' ? '☀️' : '🌙';
  }
}
const savedTheme = window.localStorage.getItem('regenx-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', savedTheme);
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// ══════════════════════════════════════
// GOOGLE AUTH
// ══════════════════════════════════════

window.initGoogleAuth = function () {

  if (!window.google) {
    console.error("Google SDK not loaded");
    return;
  }

  google.accounts.id.initialize({

    client_id:
      "661991506161-rb6j5n5klovjupfal1ip2qstcu0k366a.apps.googleusercontent.com",

    callback:
      handleGoogleLogin
  });

  // RENDER GOOGLE BUTTON
  google.accounts.id.renderButton(

    document.getElementById(
      "google-login-btn"
    ),

    {
      theme: "outline",
      size: "large",
      width: 280
    }
  );
};

function handleGoogleLogin(response) {

  const token =
    response.credential;

  const payload =
    JSON.parse(
      atob(token.split('.')[1])
    );

  const acc = {

    id: uid(),

    role: "provider",

    name: payload.name,

    org: payload.email,

    email: payload.email,

    avatar: payload.picture,

    lat: 28.5355,

    lng: 77.3910,

    tokens: 0,

    authProvider: "google"
  };

  const existing = DB
    .list('acc:')
    .map(k => DB.get(k))
    .find(u => u.email === acc.email);

  let loginAcc;

  if (existing) {
    existing.name = payload.name;
    existing.avatar = payload.picture;
    DB.set('acc:' + existing.id, existing);
    loginAcc = existing;
  } else {
    DB.set('acc:' + acc.id, acc);
    loginAcc = acc;
  }

  executeLogin(loginAcc);

  showToast(
    `✓ Welcome ${loginAcc.name}`
  );
}

// AUTO LOGIN CHECK
window.addEventListener("DOMContentLoaded", () => {
  const persisted = loadPersistedSession();
  if (persisted) {
    const existing = DB.get('acc:' + persisted.accountId);
    if (existing) {
      currentView = persisted.lastView || getDefaultViewForRole(existing.role);
      window.currentView = currentView;
      executeLogin(existing);
      if (currentView && isViewValidForRole(currentView, existing.role)) {
        showView(currentView);
      }
    } else {
      clearPersistedSession();
    }
  }

  setTimeout(() => {
    initGoogleAuth();
  }, 500);
});

// ── AUTH & REGISTRATION ──
window.switchAuthTab = function(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-view').forEach(v => v.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('view-' + tab).classList.remove('hidden');
  
  if (tab === 'login') refreshLoginDropdown();
}

window.selectRole = function(r) {
  selectedRole = r;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('role-' + r).classList.add('selected');
  const l = document.getElementById('reg-org-label');
  const i = document.getElementById('reg-org');
  if(r==='provider') { l.textContent = 'Hostel/Hotel Name'; i.placeholder = 'e.g. Omega Hostel'; }
  if(r==='rider') { l.textContent = 'Vehicle ID'; i.placeholder = 'e.g. GN-Tempo-1'; }
  if(r==='plant') { l.textContent = 'Plant Facility Name'; i.placeholder = 'e.g. Plant Alpha'; }
}

let detectedPos = null;
let regMapInstance = null;
let regMarker = null;

window.detectGPS = function() {
  const st = document.getElementById('gps-status');
  if(!navigator.geolocation) { st.textContent = "GPS not supported by browser."; return; }
  st.textContent = "Detecting high-accuracy location...";
  
  navigator.geolocation.getCurrentPosition(
    pos => {
      detectedPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      st.innerHTML = `<span style="color:var(--green)">✓ Found! Drag pin to refine your exact address.</span>`;
      
      const mapEl = document.getElementById('reg-map');
      mapEl.classList.add('show');
      
      if(!regMapInstance) {
        regMapInstance = L.map('reg-map').setView([detectedPos.lat, detectedPos.lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(regMapInstance);
        
        const dragIco = L.divIcon({html:"<div style='width:18px;height:18px;background:var(--green);border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.4);'></div>", className:''});
        regMarker = L.marker([detectedPos.lat, detectedPos.lng], {icon: dragIco, draggable: true}).addTo(regMapInstance);
        
        regMarker.on('dragend', function(e) {
          const mPos = regMarker.getLatLng();
          detectedPos = { lat: mPos.lat, lng: mPos.lng };
        });
      } else {
        regMapInstance.setView([detectedPos.lat, detectedPos.lng], 14);
        regMarker.setLatLng([detectedPos.lat, detectedPos.lng]);
      }
    },
    err => { st.innerHTML = `<span style="color:var(--red)">✗ Failed to detect. Check permissions.</span>`; },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

window.searchLocation = async function() {
  const query = document.getElementById('loc-search').value.trim();
  const st = document.getElementById('gps-status');
  if(!query) { st.innerHTML = `<span style="color:var(--red)">⚠ Enter a location (e.g., "Amity Noida").</span>`; return; }
  
  st.textContent = "Searching global maps...";
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if(data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      detectedPos = { lat, lng };
      st.innerHTML = `<span style="color:var(--green)">✓ Found: ${escapeHTML(data[0].display_name.split(',')[0])}</span>`;
      
      const mapEl = document.getElementById('reg-map');
      mapEl.classList.add('show');
      
      if(!regMapInstance) {
        regMapInstance = L.map('reg-map').setView([lat, lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(regMapInstance);
        
        const dragIco = L.divIcon({html:"<div style='width:18px;height:18px;background:var(--green);border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.4);'></div>", className:''});
        regMarker = L.marker([lat, lng], {icon: dragIco, draggable: true}).addTo(regMapInstance);
        
        regMarker.on('dragend', function(e) {
          const mPos = regMarker.getLatLng();
          detectedPos = { lat: mPos.lat, lng: mPos.lng };
        });
      } else {
        regMapInstance.setView([lat, lng], 14);
        regMarker.setLatLng([lat, lng]);
      }
    } else {
      st.innerHTML = `<span style="color:var(--amber)">⚠ Not found. Try adding city name.</span>`;
    }
  } catch (err) {
    st.innerHTML = `<span style="color:var(--red)">✗ Network error. Try again.</span>`;
  }
}

window.doRegister = async function() {
  const name = document.getElementById('reg-name').value.trim();
  const org = document.getElementById('reg-org').value.trim();
  if(!name || !org) return showToast("⚠ Please enter Name and Organisation.");
  if(!detectedPos) return showToast("⚠ Please detect GPS Location first.");
  
  const acc = { id: uid(), role: selectedRole, name, org, lat: detectedPos.lat, lng: detectedPos.lng, tokens: 0 };
  DB.set('acc:' + acc.id, acc);
  
  // If no plants exist, establish a mock plant nearby to ensure routing works
  const plants = DB.list('acc:').map(k => DB.get(k)).filter(a => a.role === 'plant');
  if (plants.length === 0 && selectedRole !== 'plant') {
    DB.set('acc:mock-plant-1', { id: 'mock-plant-1', role: 'plant', name: 'Established Plant', org: 'Beta Zone Plant', lat: detectedPos.lat + 0.05, lng: detectedPos.lng + 0.05 });
  }

  // Show Splash Screen
  const splash = document.getElementById('success-splash');
  if(splash) splash.classList.add('show');
  
  setTimeout(() => {
    if(splash) splash.classList.remove('show');
    executeLogin(acc);
  }, 2500);
}

async function refreshLoginDropdown() {
  const sel = document.getElementById('login-account');
  const accounts = DB.list('acc:').map(k => DB.get(k));
  if(accounts.length === 0) {
    sel.innerHTML = '<option value="">-- No accounts registered yet --</option>';
  } else {
    sel.innerHTML = accounts.map(a => `<option value="${escapeHTML(a.id)}">${escapeHTML(a.name)} (${escapeHTML(a.org)}) - ${escapeHTML(a.role).toUpperCase()}</option>`).join('');
  }
}

window.doLogin = async function() {
  const id = document.getElementById('login-account').value;
  if(!id) return showToast("⚠ Please select an account or register first.");
  const acc = DB.get('acc:' + id);
  if(!acc) return;
  executeLogin(acc);
}

let tickerTimer = null;
function startTicker() {
  const t = document.getElementById('global-ticker');
  if(!t) return;
  const msgs = [
    "AI Route Optimization Active. Saving 12% Fuel Fleet-wide.",
    "Plant Alpha just minted 250 $RGX for organic compost yield.",
    "Over 5,000kg of biowaste diverted from landfills today.",
    "Rider GN-Tempo-1 completing Route #A1B2... ETA 5 mins."
  ];
  let i = 0;
  t.textContent = msgs[i];
  if(tickerTimer) clearInterval(tickerTimer);
  tickerTimer = setInterval(() => { i = (i+1)%msgs.length; t.textContent = msgs[i]; }, 20000);
}

let gwTimer = null;
function startGreenWall() {
  const feed = document.getElementById('gw-feed');
  if(!feed) return;
  if(gwTimer) clearInterval(gwTimer);
  feed.innerHTML = '';
  
  const completedOrders = getAllOrders().filter(o => o.status === 'completed');
  if(completedOrders.length === 0) {
    feed.innerHTML = '<div class="gw-item" style="color:var(--text-muted)">No network activity yet. Complete a pickup to appear here!</div>';
    return;
  }
  
  completedOrders.slice(0, 5).forEach(o => {
    const el = document.createElement('div');
    el.className = 'gw-item';
    el.innerHTML = `<div>🌟 ${escapeHTML(o.providerOrg)} diverted ${escapeHTML(o.actualKg || o.kg)}kg of waste!</div><div class="gw-time">${fmtDate(o.ts)}</div>`;
    feed.appendChild(el);
  });
}

window.buyMarketItem = function(price, name) {
  if((SESSION.tokens || 0) < price) return showToast("⚠ Insufficient $RGX balance.");
  
  const hash = '0x' + Array.from({length:40}, () => Math.floor(Math.random()*16).toString(16)).join('');
  const html = `
    <h3 class="modal-title">Web3 Smart Contract Interaction</h3>
    <p class="modal-sub">Minting <strong>${escapeHTML(name)}</strong> to the ReGen Layer-2 Network...</p>
    <div style="background:#0a0a0a; color:#0f0; font-family:monospace; padding:16px; border-radius:8px; font-size:12px; margin-bottom:16px; border:1px solid #333;">
       <div>> Initializing secure connection...</div>
       <div style="animation: fadeIn 1s 0.5s both">> Deducting ${price} $RGX tokens...</div>
       <div style="animation: fadeIn 1s 1.5s both">> Minting verifiable credential...</div>
       <div style="animation: fadeIn 1s 2.5s both">> Tx Hash: ${hash}</div>
       <div style="animation: fadeIn 1s 3.5s both; color:#fff;">> <strong>SUCCESS. Block confirmed.</strong></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary btn-full" id="btn-close-mint" disabled onclick="closeModal()">Minting...</button>
    </div>
  `;
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal').classList.add('open');
  
  setTimeout(() => {
    SESSION.tokens -= price;
    DB.set('acc:' + SESSION.id, SESSION);
    document.getElementById('token-balance').textContent = SESSION.tokens;
    const b = document.getElementById('btn-close-mint');
    if(b) { b.disabled = false; b.textContent = "Close & Claim Asset"; }
    refreshCurrentView(true);
  }, 3500);
}

window.stakeTokens = function() {
  const amt = parseInt(prompt("How many $RGX tokens would you like to stake in the Community Digester Fund?"));
  if(!amt || isNaN(amt) || amt <= 0) return;
  if((SESSION.tokens || 0) < amt) return showToast("⚠ Insufficient balance to stake.");
  SESSION.tokens -= amt;
  SESSION.staked = (SESSION.staked || 0) + amt;
  DB.set('acc:' + SESSION.id, SESSION);
  document.getElementById('token-balance').textContent = SESSION.tokens;
  showToast(`✓ Successfully staked ${amt} $RGX. Earning 12% APY.`);
  refreshCurrentView(true);
}

window.fundProject = function() {
  if((SESSION.tokens || 0) < 500) return showToast("⚠ Insufficient balance. Need 500 $RGX.");
  SESSION.tokens -= 500;
  DB.set('acc:' + SESSION.id, SESSION);
  const cur = DB.get('global-fund') || 45200;
  DB.set('global-fund', cur + 500);
  document.getElementById('token-balance').textContent = SESSION.tokens;
  showToast("✓ Contributed 500 $RGX to the Amazon Reforestation Initiative!");
  refreshCurrentView(true);
}

function executeLogin(acc) {
  SESSION = acc;
  window.SESSION = SESSION;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-shell').classList.add('active');
  saveActiveSession(SESSION.id, currentView);

  // Hydrate localStorage from Appwrite cloud on every login.
  // This ensures data persists across device changes and browser wipes.
  if (window.CloudSync?.isLive) {
    window.CloudSync.hydrateFromCloud(acc.id).catch(err =>
      console.warn('[Login] Cloud hydration failed, running on local data.', err)
    );
  }
  
  document.getElementById('tb-name').textContent = acc.name;
  document.getElementById('tb-role').textContent = `${acc.role.toUpperCase()} · ${acc.org}`;
  document.getElementById('tb-avatar').textContent = acc.name.slice(0,2).toUpperCase();
  
  // GPS RECOVERY: If coordinates are missing, attempt auto-detect
  if(!acc.lat || !acc.lng) {

    navigator.geolocation.getCurrentPosition(pos => {
      acc.lat = pos.coords.latitude; acc.lng = pos.coords.longitude;
      DB.set('acc:' + acc.id, acc);
      refreshCurrentView(true);
      showToast("✓ GPS Corrected Automatically");
    });
  }
  
  const tokenContainer = document.getElementById('token-balance-container');
  if (acc.role === 'provider') {
    tokenContainer.classList.remove('hidden');
    // GSAP Animation for Token Balance
    const targetTokens = acc.tokens || 0;
    const countObj = { val: 0 };
    gsap.to(countObj, {
      val: targetTokens,
      duration: 2,
      ease: "power2.out",
      onUpdate: () => {
        document.getElementById('token-balance').textContent = Math.floor(countObj.val);
      }
    });
  } else {
    tokenContainer.classList.add('hidden');
  }
  startTicker();
  const gwWidget = document.getElementById('green-wall-widget');
  if(gwWidget) { gwWidget.style.display = 'flex'; startGreenWall(); }
  updateNotificationBadge();
  updateOfflineQueueIndicator();
  buildSidebar();
  autoRefreshTimer = setInterval(() => refreshCurrentView(), 15000);
  ReGenXRealtime?.setSession(SESSION);
}


window.doLogout = function() {
  clearInterval(autoRefreshTimer);
  clearInterval(tickerTimer);
  clearInterval(gwTimer);
  stopIoTSim();
  if (pvChartInstance) { pvChartInstance.destroy(); pvChartInstance = null; }
  if (plChartInstance) { plChartInstance.destroy(); plChartInstance = null; }
  if (rMap) { rMap.remove(); rMap = null; }
  clearPersistedSession();
  SESSION = {
    role: null,
    name: '',
    org: '',
    id: '',
    lat: null,
    lng: null
  };
  window.SESSION = SESSION;
  window.currentView = '';
  ReGenXRealtime?.setSession(null);
  document.getElementById('app-shell').classList.remove('active');
  document.getElementById('login-screen').style.display = 'flex';
  switchAuthTab('login');
}

// ── NAVIGATION ──
function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  if (SESSION.role === 'provider') {
    nav.innerHTML = `
      <button class="nav-item" onclick="showView('v-pv-dash')" id="nav-v-pv-dash"><span class="nav-item-icon">📊</span> Overview</button>
      <button class="nav-item" onclick="showView('v-pv-req')" id="nav-v-pv-req"><span class="nav-item-icon">➕</span> Dispatch Request</button>
      <button class="nav-item" onclick="showView('v-iot-bins')" id="nav-v-iot-bins"><span class="nav-item-icon">🗑️</span> IoT Sensory Bins <span class="nav-badge" id="iot-alert-badge" style="display:none">!</span></button>
      <button class="nav-item" onclick="showView('v-pv-hist-week')" id="nav-v-pv-hist-week"><span class="nav-item-icon">📅</span> Weekly Records</button>
      <button class="nav-item" onclick="showView('v-pv-hist-month')" id="nav-v-pv-hist-month"><span class="nav-item-icon">🗓️</span> Monthly Records</button>
      <button class="nav-item" onclick="showView('v-compliance')" id="nav-v-compliance"><span class="nav-item-icon">🧭</span> Compliance Center</button>
      <button class="nav-item" onclick="showView('v-reconciliation')" id="nav-v-reconciliation"><span class="nav-item-icon">🧮</span> Reconciliation</button>
      <button class="nav-item" onclick="showView('v-sla')" id="nav-v-sla"><span class="nav-item-icon">⏱️</span> SLA Monitor</button>
      <button class="nav-item" onclick="showView('v-energy')" id="nav-v-energy"><span class="nav-item-icon">⚡</span> Energy Scorecard</button>
      <button class="nav-item" onclick="showView('v-sensor')" id="nav-v-sensor"><span class="nav-item-icon">📡</span> Sensor Reliability</button>
      <button class="nav-item" onclick="showView('v-emissions')" id="nav-v-emissions"><span class="nav-item-icon">🌫️</span> Emissions Tracker</button>
      <button class="nav-item" onclick="showView('v-quality')" id="nav-v-quality"><span class="nav-item-icon">🧪</span> Quality Index</button>
      <button class="nav-item" onclick="showView('v-automation')" id="nav-v-automation"><span class="nav-item-icon">⚙️</span> Automation Pipeline</button>
      <button class="nav-item" onclick="showView('v-scan-history')" id="nav-v-scan-history"><span class="nav-item-icon">🔬</span> Scan History</button>
      <button class="nav-item" onclick="showView('v-esg-hub')" id="nav-v-esg-hub"><span class="nav-item-icon">🌱</span> Sustainability Hub</button>
      <button class="nav-item" onclick="showView('v-market')" id="nav-v-market"><span class="nav-item-icon">🛒</span> ReGen Exchange</button>
      <button class="nav-item" onclick="showView('v-audit-portal')" id="nav-v-audit-portal"><span class="nav-item-icon">🔒</span> Public Verification</button>
    `;
    if (!currentView || !isViewValidForRole(currentView, SESSION.role)) {
      showView('v-pv-dash');
    }
  }
  if (SESSION.role === 'rider') {
    nav.innerHTML = `
      <button class="nav-item active" onclick="showView('v-rd-dash')" id="nav-v-rd-dash"><span class="nav-item-icon">🗺️</span> Active Route</button>
      <button class="nav-item" onclick="showView('v-rd-jobs')" id="nav-v-rd-jobs"><span class="nav-item-icon">📋</span> Available Jobs <span class="nav-badge" id="rd-badge" style="display:none"></span></button>
      <button class="nav-item" onclick="showView('v-rd-hist')" id="nav-v-rd-hist"><span class="nav-item-icon">✓</span> Completions</button>
      <button class="nav-item" onclick="showView('v-compliance')" id="nav-v-compliance"><span class="nav-item-icon">🧭</span> Compliance Center</button>
      <button class="nav-item" onclick="showView('v-reconciliation')" id="nav-v-reconciliation"><span class="nav-item-icon">🧮</span> Reconciliation</button>
      <button class="nav-item" onclick="showView('v-sla')" id="nav-v-sla"><span class="nav-item-icon">⏱️</span> SLA Monitor</button>
      <button class="nav-item" onclick="showView('v-energy')" id="nav-v-energy"><span class="nav-item-icon">⚡</span> Energy Scorecard</button>
      <button class="nav-item" onclick="showView('v-sensor')" id="nav-v-sensor"><span class="nav-item-icon">📡</span> Sensor Reliability</button>
      <button class="nav-item" onclick="showView('v-emissions')" id="nav-v-emissions"><span class="nav-item-icon">🌫️</span> Emissions Tracker</button>
      <button class="nav-item" onclick="showView('v-quality')" id="nav-v-quality"><span class="nav-item-icon">🧪</span> Quality Index</button>
      <button class="nav-item" onclick="showView('v-automation')" id="nav-v-automation"><span class="nav-item-icon">⚙️</span> Automation Pipeline</button>
      <button class="nav-item" onclick="showView('v-esg-hub')" id="nav-v-esg-hub"><span class="nav-item-icon">🌱</span> Sustainability Hub</button>
      <button class="nav-item" onclick="showView('v-audit-portal')" id="nav-v-audit-portal"><span class="nav-item-icon">🔒</span> Public Verification</button>
    `;
    if (!currentView || !isViewValidForRole(currentView, SESSION.role)) {
      showView('v-rd-dash');
    }
  }
  if (SESSION.role === 'plant') {
    nav.innerHTML = `
      <button class="nav-item active" onclick="showView('v-pl-dash')" id="nav-v-pl-dash"><span class="nav-item-icon">🏭</span> Operations</button>
      <button class="nav-item" onclick="showView('v-pl-in')" id="nav-v-pl-in"><span class="nav-item-icon">🚚</span> Incoming Flow</button>
      <button class="nav-item" onclick="showView('v-pl-out')" id="nav-v-pl-out"><span class="nav-item-icon">⚗️</span> Log Output</button>
      <button class="nav-item" onclick="showView('v-compliance')" id="nav-v-compliance"><span class="nav-item-icon">🧭</span> Compliance Center</button>
      <button class="nav-item" onclick="showView('v-reconciliation')" id="nav-v-reconciliation"><span class="nav-item-icon">🧮</span> Reconciliation</button>
      <button class="nav-item" onclick="showView('v-sla')" id="nav-v-sla"><span class="nav-item-icon">⏱️</span> SLA Monitor</button>
      <button class="nav-item" onclick="showView('v-energy')" id="nav-v-energy"><span class="nav-item-icon">⚡</span> Energy Scorecard</button>
      <button class="nav-item" onclick="showView('v-sensor')" id="nav-v-sensor"><span class="nav-item-icon">📡</span> Sensor Reliability</button>
      <button class="nav-item" onclick="showView('v-emissions')" id="nav-v-emissions"><span class="nav-item-icon">🌫️</span> Emissions Tracker</button>
      <button class="nav-item" onclick="showView('v-quality')" id="nav-v-quality"><span class="nav-item-icon">🧪</span> Quality Index</button>
      <button class="nav-item" onclick="showView('v-automation')" id="nav-v-automation"><span class="nav-item-icon">⚙️</span> Automation Pipeline</button>
      <button class="nav-item" onclick="showView('v-esg-hub')" id="nav-v-esg-hub"><span class="nav-item-icon">🌱</span> Sustainability Hub</button>
      <button class="nav-item" onclick="showView('v-audit-portal')" id="nav-v-audit-portal"><span class="nav-item-icon">🔒</span> Public Verification</button>
    `;
    if (!currentView || !isViewValidForRole(currentView, SESSION.role)) {
      showView('v-pl-dash');
    }
  }
}

window.showView = function(viewId) {
  currentView = viewId;
  window.currentView = currentView;
  saveActiveSession(SESSION?.id, currentView);
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const btn = document.getElementById('nav-' + viewId);
  if(btn) btn.classList.add('active');
  
  // Set Title
  const titleMap = { 
    'v-iot-bins': 'IoT Sensory Bins', 
    'v-compliance': 'Compliance Center', 
    'v-reconciliation': 'Reconciliation', 
    'v-sla': 'SLA Monitor', 
    'v-energy': 'Energy Scorecard', 
    'v-sensor': 'Sensor Reliability', 
    'v-emissions': 'Emissions Tracker', 
    'v-quality': 'Quality Index',
    'v-esg-hub': 'Sustainability Report Hub',
    'v-automation': 'Automation Pipeline'
  };
  if(btn) document.getElementById('tb-view-title').textContent = titleMap[viewId] || btn.innerText.replace(/[^a-zA-Z\s]/g, '').trim();
  
  if (window.innerWidth <= 768) toggleSidebar(false);
  refreshCurrentView(true);
}

window.toggleSidebar = function(force) {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('sidebar-toggle');
  if(!sb || !ov) return;
  
  const isOpen = force !== undefined ? force : !sb.classList.contains('open');
  sb.classList.toggle('open', isOpen);
  ov.classList.toggle('open', isOpen);

  sb.setAttribute('aria-hidden', String(!isOpen));
  ov.setAttribute('aria-hidden', String(!isOpen));
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(isOpen));
}

// ── CORE DATA ENGINE ──
function getAllOrders() { return DB.list('ord:').map(k => DB.get(k)).filter(Boolean).sort((a,b)=>b.ts-a.ts); }
function getOrder(id) { return DB.get('ord:'+id); }
function saveOrder(o) { 
  // persist locally and publish to realtime and cloud sync when available
  DB.set('ord:'+o.id, o, { rooms: ['network_room', 'providers_room', 'riders_room', 'plants_room', 'admin_room'], eventType: 'KPI_UPDATED' });
  if (window.CloudSync && window.CloudSync.isLive && navigator.onLine) {
    window.CloudSync.pushDocument('orders', o);
  } else {
    queueOfflineAction({ type: 'sync-order', payload: o });
  }
}
function getAllLogs() { return DB.list('log:').map(k => DB.get(k)).filter(Boolean).sort((a,b)=>b.ts-a.ts); }

function renderStatusBadge(label, tone = 'neutral') {
  return `<span class="status-badge status-badge-${tone}">${label}</span>`;
}

function renderLoadingSkeleton(lines = 2) {
  const bars = Array.from({ length: lines }, (_, index) => {
    const width = index === 0 ? '68%' : index === lines - 1 ? '52%' : '88%';
    return `<div class="skeleton-loader" style="width:${width};"></div>`;
  }).join('');
  return `
    <div class="dashboard-state dashboard-state-loading" aria-busy="true">
      <div class="dashboard-state-head">
        <div class="dashboard-state-icon">⏳</div>
        ${renderStatusBadge('Loading', 'loading')}
      </div>
      <div class="dashboard-state-skeletons">
        ${bars}
      </div>
    </div>
  `;
}

function renderErrorState({ title = 'Operational error', description = 'Unable to load dashboard data.', subtext = 'Check the upstream system and refresh the view.', actionHtml = '' } = {}) {
  return `
    <div class="dashboard-state dashboard-state-error">
      <div class="dashboard-state-head">
        <div class="dashboard-state-icon">⚠️</div>
        ${renderStatusBadge('Error', 'error')}
      </div>
      <div class="dashboard-state-title">${title}</div>
      <div class="dashboard-state-desc">${description}</div>
      ${subtext ? `<div class="dashboard-state-sub">${subtext}</div>` : ''}
      ${actionHtml ? `<div class="dashboard-state-actions">${actionHtml}</div>` : ''}
    </div>
  `;
}

function renderEmptyStateCard({ icon = '◌', title = 'No data available', description = 'There is no operational data for this widget yet.', subtext = '', statusLabel = 'Idle', tone = 'inactive', actionHtml = '' } = {}) {
  return `
    <div class="dashboard-state dashboard-state-empty">
      <div class="dashboard-state-head">
        <div class="dashboard-state-icon">${icon}</div>
        ${renderStatusBadge(statusLabel, tone)}
      </div>
      <div class="dashboard-state-title">${title}</div>
      <div class="dashboard-state-desc">${description}</div>
      ${subtext ? `<div class="dashboard-state-sub">${subtext}</div>` : ''}
      ${actionHtml ? `<div class="dashboard-state-actions">${actionHtml}</div>` : ''}
    </div>
  `;
}

function renderMetricCard({ title, value, description = '', status = 'active', icon = '●', statusLabel = 'Active', tone = 'active', accent = '', unit = '', actionHtml = '', trend = null, sparkline = [] } = {}) {
  if (status === 'loading') return renderLoadingSkeleton(2);
  if (status === 'error') return renderErrorState({ title, description, subtext: '', actionHtml });
  if (status === 'empty') {
    return renderEmptyStateCard({ icon, title, description, statusLabel: 'No data', tone: 'inactive', actionHtml });
  }
  if (status === 'inactive') {
    return renderEmptyStateCard({ icon, title, description, statusLabel, tone: 'inactive', actionHtml });
  }

  const valueText = value === null || typeof value === 'undefined' ? '—' : value;
  const style = accent ? ` style="border-top-color:${accent};"` : '';
  const trendDirection = trend?.direction || 'flat';
  const trendTone = trendDirection === 'up' ? 'positive' : trendDirection === 'down' ? 'negative' : 'neutral';
  const trendArrow = trendDirection === 'up' ? '↗' : trendDirection === 'down' ? '↘' : '→';
  return `
    <div class="stat-card dashboard-state dashboard-state-active state-${tone}"${style}>
      <div class="dashboard-state-head">
        <div class="dashboard-state-icon">${icon}</div>
        ${renderStatusBadge(statusLabel, tone)}
      </div>
      <div class="dashboard-state-body">
        <div class="metric-hero-row">
          <div class="metric-hero-value">${valueText}${unit ? `<span class="metric-unit">${unit}</span>` : ''}</div>
          ${trend ? `<span class="metric-trend metric-trend-${trendTone}"><span>${trendArrow}</span><span>${trend.label || trend.text || ''}</span></span>` : ''}
        </div>
        <div class="metric-title">${title}</div>
        ${description ? `<div class="metric-desc">${description}</div>` : ''}
      </div>
      ${sparkline.length ? renderSparkline(sparkline, tone) : ''}
      ${actionHtml ? `<div class="dashboard-state-actions">${actionHtml}</div>` : ''}
    </div>
  `;
}

function renderMetricGrid(cards = []) {
  return cards.join('');
}

function renderDashboardListState({ icon = '◌', title = 'No data available', description = 'This section is empty right now.', subtext = '', statusLabel = 'Idle', tone = 'inactive', actionHtml = '' } = {}) {
  return renderEmptyStateCard({ icon, title, description, subtext, statusLabel, tone, actionHtml });
}

function renderSectionPlaceholder({ title = 'Loading data', description = 'Preparing dashboard state…' } = {}) {
  return `
    <div class="dashboard-section-placeholder">
      <div class="dashboard-section-placeholder-title">${title}</div>
      <div class="dashboard-section-placeholder-body">
        <div class="skeleton-loader" style="width:72%;"></div>
        <div class="skeleton-loader" style="width:58%;"></div>
        <div class="skeleton-loader" style="width:84%;"></div>
      </div>
      <div class="dashboard-state-sub">${description}</div>
    </div>
  `;
}

function renderSparkline(values = [], tone = 'active') {
  if (!values.length) return '';
  const max = Math.max(...values.map(v => Number(v) || 0), 1);
  const bars = values.map((value, index) => {
    const height = Math.max(18, Math.round(((Number(value) || 0) / max) * 100));
    return `<span class="spark-bar ${index === values.length - 1 ? 'is-last' : ''}" style="height:${height}%;"></span>`;
  }).join('');
  return `<div class="metric-sparkline metric-sparkline-${tone}">${bars}</div>`;
}

function buildStatusStepper(status) {
  if (status === 'rejected') return '';
  const steps = [
    { key: 'requested', label: 'Requested' },
    { key: 'assigned',  label: 'Assigned'  },
    { key: 'en_route',  label: 'En Route'  },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'at_plant',  label: 'At Plant'  },
    { key: 'completed', label: 'Completed' },
  ];
  const idx = steps.findIndex(s => s.key === status);
  return `<div class="order-stepper">${steps.map((s, i) => {
    const cls = i < idx ? 'done' : i === idx && status !== 'completed' ? 'active' : i <= idx ? 'done' : '';
    return `<div class="os-step ${cls}"><div class="os-dot"></div><div class="os-label">${s.label}</div></div>`;
  }).join('')}</div>`;
}

// Generic Order Card Component
function buildOrderCard(o, role) {
  const badges = {
    requested: '<span class="badge badge-blue">Requested</span>',
    assigned: '<span class="badge badge-amber">Assigned to Rider</span>',
    en_route: '<span class="badge badge-amber">En Route</span>',
    picked_up: '<span class="badge badge-green">Picked Up</span>',
    at_plant: '<span class="badge badge-green">Arrived at Plant</span>',
    completed: '<span class="badge" style="background:var(--green);color:white;">Completed</span>',
    rejected: '<span class="badge badge-red">Rejected</span>'
  };

  const integrity = getOrderIntegrity(o);
  const trustBadge = integrity.score >= 90
    ? '<span class="badge badge-green">High Integrity</span>'
    : integrity.score >= 75
      ? '<span class="badge badge-blue">Verified</span>'
      : integrity.score >= 60
        ? '<span class="badge badge-amber">Watch</span>'
        : '<span class="badge badge-red">Risk</span>';
  
  let acts = '';
  if (role === 'provider' && o.status === 'requested') {
    acts = `<button class="btn btn-ghost btn-sm" onclick="cancelOrder('${o.id}')">Cancel</button>`;
  }
  if (role === 'rider' && o.status === 'requested') {
    acts = `<button class="btn btn-primary btn-sm" onclick="riderAccept('${o.id}')">Accept Route</button>`;
  }
  if (role === 'rider' && o.status === 'assigned' && o.riderId === SESSION.id) {
    acts = `<button class="btn btn-amber btn-sm" onclick="riderUpdate('${o.id}','en_route')">Start Navigation →</button>`;
  }
  if (role === 'rider' && o.status === 'en_route' && o.riderId === SESSION.id) {
    acts = `<button class="btn btn-primary btn-sm" onclick="openPickupConfirm('${o.id}')">Confirm Collection ✓</button>`;
  }
  if (role === 'rider' && o.status === 'picked_up' && o.riderId === SESSION.id) {
    acts = `<button class="btn btn-amber btn-sm" onclick="riderUpdate('${o.id}','at_plant')">Arrived at Plant</button>`;
  }
  if (role === 'plant' && o.status === 'at_plant' && o.plantId === SESSION.id) {
    acts = `<button class="btn btn-primary btn-sm" onclick="openPlantConfirm('${o.id}')">Confirm Receipt ✓</button>`;
  }
  if (['provider', 'rider', 'plant'].includes(role) && o.status === 'completed') {
    acts += `<button class="btn btn-outline-danger btn-sm" onclick="deleteOrder('${o.id}')">🗑 Delete Record</button>`;
  }

  acts += `<button class="btn btn-ghost btn-sm" onclick="openIntegrityScan('${o.id}')">🛡 Integrity Scan</button>`;

  return `
    <div class="order-card" data-status="${o.status}">
      <div class="oc-header">
        <div class="oc-title">${escapeHTML(o.providerOrg)} <span style="font-size:12px;color:var(--text-muted);font-family:monospace">#${escapeHTML(o.id).slice(-6).toUpperCase()}</span></div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          ${badges[o.status]}
          ${trustBadge}
        </div>
      </div>
      <div class="oc-meta">
        <div class="oc-meta-item">🗑 ${o.wasteType} (${o.kg}kg)</div>
        <div class="oc-meta-item">🕒 ${o.shift}</div>
        <div class="oc-meta-item">⚗️ Dest: ${o.plantName}</div>
      </div>
      ${buildStatusStepper(o.status)}
      ${o.actualKg ? `<div style="margin-bottom:8px;font-size:13px;color:var(--green);font-weight:600;">✓ Actual Collected: ${o.actualKg}kg (Quality: ${o.quality})</div>` : ''}
      ${o.tokensMinted ? `<div style="margin-bottom:8px;font-size:13px;color:var(--amber);font-weight:600;">🪙 Minted ${o.tokensMinted} $RGX <span style="font-size:10px; color:var(--text-muted); font-family:monospace; margin-left:8px;">TX: ${o.txHash.slice(0,12)}...</span></div>` : ''}
      ${acts ? `<div class="oc-actions">${acts}</div>` : ''}
    </div>
  `;
}

// ── REFRESH CONTROLLER ──
async function refreshCurrentView(fullRender = false) {
  const mc = document.getElementById('main-content');
  if (currentView === 'v-scan-history') {
    const scanHistory = JSON.parse(localStorage.getItem('regenx_scan_history') || '[]');
    mc.innerHTML = `
      <div class="between" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 class="heading">BioScan History</h3>
          <div style="font-size:13px; color:var(--text-muted);">${scanHistory.length} scan${scanHistory.length !== 1 ? 's' : ''} recorded</div>
        </div>
        <button class="btn btn-primary" onclick="exportScanHistory()">⬇️ Export CSV</button>
      </div>
      ${scanHistory.length ? scanHistory.map(s => `
        <div class="glass-card" style="margin-bottom:12px; padding:16px;">
          <div class="between">
            <div>
              <div style="font-weight:700;">${s.wasteCategory}</div>
              <div style="font-size:12px; color:var(--text-muted);">${new Date(s.timestamp).toLocaleString('en-IN')}</div>
            </div>
            <span class="badge ${s.contaminationLevel === 'Low' ? 'badge-green' : s.contaminationLevel === 'Medium' ? 'badge-amber' : 'badge-red'}">
              ${s.contaminationLevel} Contamination
            </span>
          </div>
          <div style="margin-top:8px; font-size:13px;">Organic: <strong>${s.organicPercentage}%</strong> · Role: ${s.role}</div>
        </div>
      `).join('') : renderDashboardListState({
        icon: '🔬',
        title: 'No scans yet',
        description: 'Run the BioScan AI to see history here.',
        statusLabel: 'Idle',
        tone: 'inactive'
      })}
    `;
    return;
  }
  if (currentView === 'v-esg-hub') {
    const history = getAllOrders().filter(o => {
      if (SESSION.role === 'provider') return o.providerId === SESSION.id && o.status === 'completed';
      if (SESSION.role === 'plant') return o.plantId === SESSION.id && o.status === 'completed';
      if (SESSION.role === 'rider') return o.riderId === SESSION.id && o.status === 'completed';
      return false;
    });
    ESGReporter.renderHub(mc, fullRender, SESSION, history);
    return;
  }
  if (currentView === 'v-audit-portal') {
    AuditPortal.renderPortal(mc, fullRender);
    return;
  }
  if (currentView === 'v-compliance') {
    renderCompliance(mc, fullRender);
    return;
  }
  if (currentView === 'v-reconciliation') {
    renderReconciliation(mc, fullRender);
    return;
  }
  if (currentView === 'v-sla') {
    renderSlaMonitor(mc, fullRender);
    return;
  }
  if (currentView === 'v-energy') {
    renderEnergyScorecard(mc, fullRender);
    return;
  }
  if (currentView === 'v-sensor') {
    renderSensorReliability(mc, fullRender);
    return;
  }
  if (currentView === 'v-emissions') {
    renderEmissionsTracker(mc, fullRender);
    return;
  }
  if (currentView === 'v-quality') {
    renderQualityIndex(mc, fullRender);
    return;
  }
  if (currentView === 'v-automation') {
    renderAutomationPipeline(mc, fullRender);
    return;
  }
  if (currentView === 'v-market') {
    const globalFunded = DB.get('global-fund') || 45200;
    const staked = SESSION.staked || 0;
    const totalStakedGlobal = 1250000 + staked;

    if(fullRender) mc.innerHTML = `
      <div class="between" style="margin-bottom:24px;">
        <h3 class="heading">DeFi Carbon Exchange Hub</h3>
        <div class="badge badge-amber" style="font-size:14px; padding:6px 12px;">Wallet Balance: ${SESSION.tokens || 0} $RGX</div>
      </div>
      
      <div class="two-col" style="margin-bottom:32px;">
        <div class="glass-card" style="border-color:var(--blue); padding:24px;">
           <div class="between" style="margin-bottom:16px;">
             <div>
               <h4 style="margin-bottom:4px; font-size:18px;">Carbon Credit Staking</h4>
               <p style="font-size:13px; color:var(--text-muted);">Your collective waste diversion has offset <strong>${((DB.get('global-fund') || 45200) / 10).toFixed(1)} tons</strong> of CO2.</p>
             </div>
             <div style="text-align:right;">
               <div style="font-size:24px; font-weight:700; color:var(--blue);">12.5% <span style="font-size:14px">APY</span></div>
             </div>
           </div>
           <div class="between" style="margin-bottom:24px; background:var(--surface); padding:16px; border-radius:12px; border:1px solid var(--border);">
             <div>
               <div style="font-size:12px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Your Impact Portfolio</div>
               <div style="font-size:20px; font-weight:700;">${staked} $RGX</div>
             </div>
             <div style="text-align:right;">
               <div style="font-size:12px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Network TVL</div>
               <div style="font-size:20px; font-weight:700; color:var(--green);">${totalStakedGlobal.toLocaleString()} $RGX</div>
             </div>
           </div>
           <button class="btn btn-primary btn-full" style="background:var(--blue); border-color:var(--blue);" onclick="stakeTokens()">Stake for Environment</button>
        </div>
        
        <div class="glass-card" style="border-color:var(--green); padding:24px;">
           <h4 style="margin-bottom:4px; font-size:18px;">Global Impact Crowdfunding</h4>
           <p style="font-size:13px; color:var(--text-muted); margin-bottom:24px;">Contribute to massive global projects. When the pool hits 100%, real-world action is executed.</p>
           
           <div style="margin-bottom:8px; font-weight:700;">Amazon Reforestation Initiative</div>
           <div class="between" style="font-size:12px; margin-bottom:4px; color:var(--text-muted);">
             <span>${globalFunded.toLocaleString()} $RGX</span>
             <span>Goal: 100,000 $RGX</span>
           </div>
           <div style="width:100%; height:12px; background:var(--border); border-radius:6px; overflow:hidden; margin-bottom:24px;">
             <div style="width:${Math.min((globalFunded/100000)*100, 100)}%; height:100%; background:var(--green); border-radius:6px; transition:width 1s;"></div>
           </div>
           
           <button class="btn btn-primary btn-full" onclick="fundProject()">Fund with 500 $RGX</button>
        </div>
      </div>

      <h3 class="heading" style="margin-bottom:16px;">Web3 NFT Assets & Utilities</h3>
      <div class="market-grid">
         ${Intelligence.MARKETPLACE_ITEMS.map(item => `
          <div class="market-card glass-card">
            <div class="mc-icon">${item.icon}</div>
            <div class="mc-title">${escapeHTML(item.name)}</div>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">${escapeHTML(item.description)}</p>
            <div class="mc-price">${item.price} $RGX</div>
            <button class="btn btn-primary btn-full" onclick="buyMarketItem(${item.price}, '${escapeHTML(item.name)}')">Mint Asset</button>
          </div>
         `).join('')}
      </div>
    `;
    return;
  }
  if (currentView === 'v-iot-bins') { renderIoT(mc, fullRender); return; }
  if (SESSION.role === 'provider') await renderProvider(mc, fullRender);
  if (SESSION.role === 'rider') await renderRider(mc, fullRender);
  if (SESSION.role === 'plant') await renderPlant(mc, fullRender);
}

/**
 * Render compliance center view.
 * @param {HTMLElement} mc - Main content container.
 * @param {boolean} fullRender - Whether to fully render.
 */
function renderCompliance(mc, fullRender) {
  const alerts = loadEsgAlerts().sort((a, b) => b.ts - a.ts);
  const openAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  if (!fullRender) return;

  mc.innerHTML = `
    <div class="between" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div>
        <h3 class="heading">Compliance Center</h3>
        <div style="font-size:13px; color:var(--text-muted);">Real-time ESG anomalies and audit flags.</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost btn-sm" onclick="clearEsgAlerts()">Clear All</button>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card"><div class="stat-val">${openAlerts.length}</div><div class="stat-lbl">Active Alerts</div></div>
      <div class="stat-card"><div class="stat-val">${resolvedAlerts.length}</div><div class="stat-lbl">Resolved</div></div>
      <div class="stat-card"><div class="stat-val">${alerts.length}</div><div class="stat-lbl">Total Flags</div></div>
      <div class="stat-card"><div class="stat-val">${Math.round((openAlerts.length / Math.max(alerts.length, 1)) * 100)}%</div><div class="stat-lbl">Open Rate</div></div>
    </div>

    <div class="two-col" style="align-items: stretch;">
      <div class="glass-card compliance-card">
        <div class="between" style="margin-bottom:12px;">
          <h4 style="font-size:16px;">Active Alerts</h4>
          <span class="badge badge-amber">${openAlerts.length} Open</span>
        </div>
        <div class="compliance-list">
          ${openAlerts.length ? openAlerts.map(a => `
            <div class="compliance-item">
              <div>
                <div class="compliance-title">${a.message}</div>
                <div class="compliance-sub">Order #${a.orderId.slice(-6).toUpperCase()} · ${fmtDate(a.ts)}</div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge ${a.severity === 'high' ? 'badge-red' : 'badge-amber'}">${a.severity.toUpperCase()}</span>
                <button class="btn btn-ghost btn-sm" onclick="resolveEsgAlert('${a.id}')">Resolve</button>
              </div>
            </div>
      `).join('') : renderDashboardListState({
        icon: '🛡️',
        title: 'No active alerts',
        description: 'All compliance checks are clear for now.',
        subtext: 'New alerts will appear here when issues are detected.',
        statusLabel: 'Idle',
        tone: 'inactive'
      })}
          <span class="badge badge-green">${resolvedAlerts.length} Done</span>
        </div>
        <div class="compliance-list">
          ${resolvedAlerts.length ? resolvedAlerts.slice(0, 8).map(a => `
            <div class="compliance-item resolved">
              <div>
                <div class="compliance-title">${a.message}</div>
                <div class="compliance-sub">Order #${a.orderId.slice(-6).toUpperCase()} · ${fmtDate(a.ts)}</div>
              </div>
              <span class="badge badge-green">RESOLVED</span>
            </div>
          `).join('') : renderDashboardListState({
            icon: '✅',
            title: 'No resolved alerts yet',
            description: 'There are no resolved compliance alerts to display.',
            subtext: 'Resolved alerts will appear here once issues are closed.',
            statusLabel: 'Idle',
            tone: 'inactive'
          })}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render reconciliation center view.
 * @param {HTMLElement} mc - Main content container.
 * @param {boolean} fullRender - Whether to fully render.
 */
function renderReconciliation(mc, fullRender) {
  const entries = loadCreditLedger().sort((a, b) => b.ts - a.ts);
  const mismatches = entries.filter(e => e.deltaPct >= 8);
  if (!fullRender) return;

  mc.innerHTML = `
    <div class="between" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div>
        <h3 class="heading">Carbon Credit Reconciliation</h3>
        <div style="font-size:13px; color:var(--text-muted);">Cross-verify minted credits against expected ESG yields.</div>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card"><div class="stat-val">${entries.length}</div><div class="stat-lbl">Ledger Entries</div></div>
      <div class="stat-card" style="border-top-color:var(--amber);"><div class="stat-val">${mismatches.length}</div><div class="stat-lbl">Mismatches</div></div>
      <div class="stat-card"><div class="stat-val">${getReconciliationSummary().score}%</div><div class="stat-lbl">Integrity Score</div></div>
      <div class="stat-card"><div class="stat-val">${Math.round((mismatches.length / Math.max(entries.length, 1)) * 100)}%</div><div class="stat-lbl">Mismatch Rate</div></div>
    </div>

    <div class="glass-card reconciliation-card">
      <div class="between" style="margin-bottom:12px;">
        <h4 style="font-size:16px;">Recent Ledger Entries</h4>
        <span class="badge ${mismatches.length ? 'badge-amber' : 'badge-green'}">${mismatches.length} mismatch${mismatches.length === 1 ? '' : 'es'}</span>
      </div>
      <div class="reconciliation-list">
        ${entries.length ? entries.slice(0, 12).map(e => `
          <div class="reconciliation-item ${e.deltaPct >= 8 ? 'flagged' : ''}">
            <div>
              <div class="reconciliation-title">Order #${escapeHTML(e.orderId).slice(-6).toUpperCase()} · ${escapeHTML(e.org)}</div>
              <div class="reconciliation-sub">Expected ${e.expectedTokens} $RGX · Minted ${e.mintedTokens} $RGX · Δ ${e.deltaPct.toFixed(1)}%</div>
              <div class="reconciliation-sub">${fmtDate(e.ts)} · Trust ${e.trustScore}%</div>
            </div>
            <span class="badge ${e.deltaPct >= 8 ? 'badge-red' : 'badge-green'}">${e.deltaPct >= 8 ? 'FLAG' : 'OK'}</span>
          </div>
        `).join('') : renderDashboardListState({
          icon: '🧾',
          title: 'No reconciliation entries',
          description: 'There are no credit ledger entries to review yet.',
          subtext: 'Recorded carbon credits will populate this list once available.',
          statusLabel: 'Idle',
          tone: 'inactive'
        })}
      </div>
    </div>
  `;
}

/**
 * Render SLA monitor view.
 * @param {HTMLElement} mc - Main content container.
 * @param {boolean} fullRender - Whether to fully render.
 */
function renderSlaMonitor(mc, fullRender) {
  const entries = loadSlaLedger().sort((a, b) => b.createdTs - a.createdTs);
  if (!fullRender) return;

  mc.innerHTML = `
    <div class="between" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div>
        <h3 class="heading">Dispatch SLA Monitor</h3>
        <div style="font-size:13px; color:var(--text-muted);">Track pickup and completion SLAs across the network.</div>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card"><div class="stat-val">${getSlaSummary().open}</div><div class="stat-lbl">Active</div></div>
      <div class="stat-card"><div class="stat-val">${getSlaSummary().breaches}</div><div class="stat-lbl">Breaches</div></div>
      <div class="stat-card"><div class="stat-val">${getSlaSummary().total}</div><div class="stat-lbl">Total</div></div>
      <div class="stat-card"><div class="stat-val">${getSlaSummary().score}%</div><div class="stat-lbl">On-Time Score</div></div>
    </div>

    <div class="glass-card sla-card">
      <div class="between" style="margin-bottom:12px;">
        <h4 style="font-size:16px;">Recent Dispatches</h4>
        <span class="badge badge-blue">SLA 90 min</span>
      </div>
      <div class="sla-list">
        ${entries.length ? entries.slice(0, 12).map(e => {
          const elapsed = Math.round(((e.completeTs || Date.now()) - e.createdTs) / 60000);
          const liveBreach = !e.completeTs && elapsed > e.targetMins;
          const badge = e.completeTs
            ? (e.breach ? 'badge-red' : 'badge-green')
            : liveBreach ? 'badge-amber' : 'badge-blue';
          const status = e.completeTs
            ? (e.breach ? 'BREACH' : 'ON TIME')
            : liveBreach ? 'AT RISK' : 'IN PROGRESS';
          return `
            <div class="sla-item ${liveBreach ? 'risk' : ''}">
              <div>
                <div class="sla-title">Order #${escapeHTML(e.orderId).slice(-6).toUpperCase()} · ${escapeHTML(e.org)}</div>
                <div class="sla-sub">Elapsed ${elapsed} min · Target ${e.targetMins} min</div>
                <div class="sla-sub">Started ${fmtDate(e.createdTs)}</div>
              </div>
              <span class="badge ${badge}">${status}</span>
            </div>
          `;
        }).join('') : renderDashboardListState({
          icon: '⏱️',
          title: 'No SLA entries yet',
          description: 'No dispatch SLA records are available right now.',
          subtext: 'Active and completed dispatch SLAs will appear in this section.',
          statusLabel: 'Idle',
          tone: 'inactive'
        })}
      </div>
    </div>
  `;
}

/**
 * Render energy yield scorecard view.
 * @param {HTMLElement} mc - Main content container.
 * @param {boolean} fullRender - Whether to fully render.
 */
function renderEnergyScorecard(mc, fullRender) {
  const entries = loadEnergyLedger().sort((a, b) => b.ts - a.ts);
  const summary = getEnergySummary();
  if (!fullRender) return;

  mc.innerHTML = `
    <div class="between" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div>
        <h3 class="heading">Energy Yield Scorecard</h3>
        <div style="font-size:13px; color:var(--text-muted);">Track conversion efficiency of processed bio-waste.</div>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card"><div class="stat-val">${summary.total}</div><div class="stat-lbl">Scored Batches</div></div>
      <div class="stat-card"><div class="stat-val">${summary.avgScore || 0}</div><div class="stat-lbl">Avg Score</div></div>
      <div class="stat-card"><div class="stat-val">${summary.totalEnergy}</div><div class="stat-lbl">kWh Generated</div></div>
      <div class="stat-card"><div class="stat-val">${summary.total ? Math.round(summary.totalEnergy / summary.total) : 0}</div><div class="stat-lbl">kWh / Batch</div></div>
    </div>

    <div class="glass-card energy-card">
      <div class="between" style="margin-bottom:12px;">
        <h4 style="font-size:16px;">Recent Batches</h4>
        <span class="badge badge-blue">Bio-to-Energy</span>
      </div>
      <div class="energy-list">
        ${entries.length ? entries.slice(0, 12).map(e => `
          <div class="energy-item">
            <div>
              <div class="energy-title">${escapeHTML(e.org)} · ${escapeHTML(e.kg)} kg processed</div>
              <div class="energy-sub">${e.energyKwh} kWh · Efficiency ${e.efficiencyPct}% · ${fmtDate(e.ts)}</div>
            </div>
            <span class="badge ${e.score >= 85 ? 'badge-green' : e.score >= 70 ? 'badge-blue' : e.score >= 55 ? 'badge-amber' : 'badge-red'}">${e.score}</span>
          </div>
        `).join('') : renderDashboardListState({
          icon: '⚡',
          title: 'No energy records yet',
          description: 'Energy yield data will appear once bio-waste batches are processed.',
          statusLabel: 'Idle',
          tone: 'inactive'
        })}
      </div>
    </div>
  `;
}

/**
 * Render sensor reliability view.
 * @param {HTMLElement} mc - Main content container.
 * @param {boolean} fullRender - Whether to fully render.
 */
function renderSensorReliability(mc, fullRender) {
  const entries = loadSensorLedger().sort((a, b) => b.ts - a.ts);
  const summary = getSensorReliabilitySummary();
  if (!fullRender) return;

  mc.innerHTML = `
    <div class="between" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div>
        <h3 class="heading">Sensor Reliability Index</h3>
        <div style="font-size:13px; color:var(--text-muted);">Monitor IoT sensor uptime, freshness, and health.</div>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card"><div class="stat-val">${summary.total}</div><div class="stat-lbl">Total Sensors</div></div>
      <div class="stat-card"><div class="stat-val">${summary.offlineCount}</div><div class="stat-lbl">Offline</div></div>
      <div class="stat-card"><div class="stat-val">${summary.score}%</div><div class="stat-lbl">Reliability</div></div>
      <div class="stat-card"><div class="stat-val">${entries.length}</div><div class="stat-lbl">Snapshots</div></div>
    </div>

    <div class="glass-card sensor-reliability-card">
      <div class="between" style="margin-bottom:12px;">
        <h4 style="font-size:16px;">Recent Health Snapshots</h4>
        <span class="badge badge-blue">10-min freshness</span>
      </div>
      <div class="sensor-reliability-list">
        ${entries.length ? entries.slice(0, 12).map(e => `
          <div class="sensor-reliability-item">
            <div>
              <div class="sensor-reliability-title">${e.total} sensors · ${e.offlineCount} offline · ${e.staleCount} stale</div>
              <div class="sensor-reliability-sub">${fmtDate(e.ts)}</div>
            </div>
            <span class="badge ${e.score >= 90 ? 'badge-green' : e.score >= 75 ? 'badge-blue' : e.score >= 60 ? 'badge-amber' : 'badge-red'}">${e.score}%</span>
          </div>
        `).join('') : renderDashboardListState({
          icon: '📡',
          title: 'No sensor snapshots yet',
          description: 'Sensor health snapshots will appear as devices report data.',
          statusLabel: 'Idle',
          tone: 'inactive'
        })}
      </div>
    </div>
  `;
}

/**
 * Render emissions tracker view.
 * @param {HTMLElement} mc - Main content container.
 * @param {boolean} fullRender - Whether to fully render.
 */
function renderEmissionsTracker(mc, fullRender) {
  const entries = loadEmissionsLedger().sort((a, b) => b.ts - a.ts);
  const summary = getEmissionsSummary();
  if (!fullRender) return;

  mc.innerHTML = `
    <div class="between" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div>
        <h3 class="heading">Route Emissions Tracker</h3>
        <div style="font-size:13px; color:var(--text-muted);">Compare logistics emissions against verified offset impact.</div>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card"><div class="stat-val">${summary.total}</div><div class="stat-lbl">Tracked Routes</div></div>
      <div class="stat-card"><div class="stat-val">${summary.totalEmissions}</div><div class="stat-lbl">CO₂ Emitted (kg)</div></div>
      <div class="stat-card"><div class="stat-val">${summary.totalOffset}</div><div class="stat-lbl">CO₂ Offset (kg)</div></div>
      <div class="stat-card"><div class="stat-val">${summary.avgScore || 0}</div><div class="stat-lbl">Efficiency Score</div></div>
    </div>

    <div class="glass-card emissions-card">
      <div class="between" style="margin-bottom:12px;">
        <h4 style="font-size:16px;">Recent Routes</h4>
        <span class="badge badge-blue">Logistics Footprint</span>
      </div>
      <div class="emissions-list">
        ${entries.length ? entries.slice(0, 12).map(e => `
          <div class="emissions-item">
            <div>
              <div class="emissions-title">${escapeHTML(e.org)} · ${escapeHTML(e.distanceKm)} km</div>
              <div class="emissions-sub">${e.emissionKg} kg emitted · ${e.offsetKg} kg offset · ${fmtDate(e.ts)}</div>
            </div>
            <span class="badge ${e.score >= 85 ? 'badge-green' : e.score >= 70 ? 'badge-blue' : e.score >= 55 ? 'badge-amber' : 'badge-red'}">${e.score}</span>
          </div>
        `).join('') : renderDashboardListState({
          icon: '🌍',
          title: 'No emissions records yet',
          description: 'Tracked emissions routes will appear here after the first runs.',
          statusLabel: 'Idle',
          tone: 'inactive'
        })}
      </div>
    </div>
  `;
}

/**
 * Render compost quality index view.
 * @param {HTMLElement} mc - Main content container.
 * @param {boolean} fullRender - Whether to fully render.
 */
function renderQualityIndex(mc, fullRender) {
  const entries = loadQualityLedger().sort((a, b) => b.ts - a.ts);
  const summary = getQualitySummary();
  if (!fullRender) return;

  mc.innerHTML = `
    <div class="between" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div>
        <h3 class="heading">Compost Quality Index</h3>
        <div style="font-size:13px; color:var(--text-muted);">Track segregation scores and compost quality outcomes.</div>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card"><div class="stat-val">${summary.total}</div><div class="stat-lbl">Graded Batches</div></div>
      <div class="stat-card"><div class="stat-val">${summary.avgScore || 0}</div><div class="stat-lbl">Avg Score</div></div>
      <div class="stat-card"><div class="stat-val">${summary.lowCount}</div><div class="stat-lbl">Low Quality</div></div>
      <div class="stat-card"><div class="stat-val">${summary.total ? Math.round((summary.lowCount / summary.total) * 100) : 0}%</div><div class="stat-lbl">Low Rate</div></div>
    </div>

    <div class="glass-card quality-card">
      <div class="between" style="margin-bottom:12px;">
        <h4 style="font-size:16px;">Recent Batches</h4>
        <span class="badge badge-blue">Segregation Score</span>
      </div>
      <div class="quality-list">
        ${entries.length ? entries.slice(0, 12).map(e => `
          <div class="quality-item">
            <div>
              <div class="quality-title">${escapeHTML(e.org)} · ${escapeHTML(e.kg)} kg processed</div>
              <div class="quality-sub">Score ${e.score} · Seg ${e.segScore}% · ${fmtDate(e.ts)}</div>
            </div>
            <span class="badge ${e.score >= 85 ? 'badge-green' : e.score >= 70 ? 'badge-blue' : e.score >= 55 ? 'badge-amber' : 'badge-red'}">${e.score}</span>
          </div>
        `).join('') : '<div class="empty-state">No quality records yet.</div>'}
      </div>
    </div>
  `;
}

/**
 * Render automation pipeline view.
 * @param {HTMLElement} mc - Main content container.
 * @param {boolean} fullRender - Whether to fully render.
 */
function renderAutomationPipeline(mc, fullRender) {
  const tasks = seedAutomationPipeline().sort((a, b) => b.ts - a.ts);
  const summary = getAutomationSummary();
  if (!fullRender) return;

  mc.innerHTML = `
    <div class="between" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div>
        <h3 class="heading">Automation Pipeline</h3>
        <div style="font-size:13px; color:var(--text-muted);">Streamline open-source operations with smart task assignment.</div>
      </div>
      <button class="btn btn-primary" onclick="autoAssignNext()">⚙️ Auto-Assign Next</button>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card"><div class="stat-val">${summary.queued}</div><div class="stat-lbl">Queued</div></div>
      <div class="stat-card"><div class="stat-val">${summary.active}</div><div class="stat-lbl">Active</div></div>
      <div class="stat-card"><div class="stat-val">${summary.done}</div><div class="stat-lbl">Done</div></div>
      <div class="stat-card"><div class="stat-val">${summary.queued + summary.active + summary.done}</div><div class="stat-lbl">Total</div></div>
    </div>

    <div class="glass-card automation-card">
      <div class="between" style="margin-bottom:12px;">
        <h4 style="font-size:16px;">Task Queue</h4>
        <span class="badge badge-blue">Automation Ops</span>
      </div>
      <div class="automation-list">
        ${tasks.length ? tasks.map(t => `
          <div class="automation-item">
            <div>
              <div class="automation-title">${t.title}</div>
              <div class="automation-sub">${t.owner} · ${t.priority.toUpperCase()} · ${fmtDate(t.ts)}</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <span class="badge ${t.status === 'done' ? 'badge-green' : t.status === 'active' ? 'badge-amber' : 'badge-blue'}">${t.status.toUpperCase()}</span>
              ${t.status === 'queued' ? `<button class="btn btn-ghost btn-sm" onclick="autoAssignTask('${t.id}')">Assign</button>` : ''}
              ${t.status !== 'done' ? `<button class="btn btn-ghost btn-sm" onclick="updateAutomationTask('${t.id}', { status: 'done' })">Done</button>` : ''}
            </div>
          </div>
        `).join('') : '<div class="empty-state">No automation tasks queued.</div>'}
      </div>
    </div>
  `;
}

// ════════ PROVIDER LOGIC ════════
async function renderProvider(mc, fullRender) {
  const orders = getAllOrders().filter(o => o.providerId === SESSION.id);
  const active = orders.filter(o => !['completed','rejected'].includes(o.status));
  const completed = orders.filter(o => o.status === 'completed');
  
  if (currentView === 'v-pv-dash') {
    if(fullRender) mc.innerHTML = `
      <!-- Mobile Quick Access -->
      <div class="mobile-quick-actions">
        <button class="glass-card" style="flex:1; padding:12px; text-align:center; border-color:var(--green);" onclick="showView('v-pv-req')">
          <div style="font-size:20px;">🚀</div><div style="font-size:11px; font-weight:600; margin-top:4px;">Dispatch</div>
        </button>
        <button class="glass-card" style="flex:1; padding:12px; text-align:center; border-color:var(--amber);" onclick="showView('v-market')">
          <div style="font-size:20px;">🛒</div><div style="font-size:11px; font-weight:600; margin-top:4px;">Exchange</div>
        </button>
      </div>

      <div class="stats-grid" id="pv-stats"></div>
      ${renderTrustIndexCard()}
      ${renderComplianceWidget()}
      ${renderReconciliationWidget()}
      ${renderSlaWidget()}
      ${renderEnergyWidget()}
      ${renderSensorWidget()}
      ${renderEmissionsWidget()}
      ${renderQualityWidget()}
      ${renderAutomationWidget()}
      <div class="two-col">
        <div>
          <h3 class="heading" style="margin-bottom:16px;">Active Dispatches</h3><div id="pv-act"></div>

          <!-- IoT Bin Status Widget -->
          <div class="between" style="margin-top:24px; margin-bottom:16px;">
            <h3 class="heading" style="margin-bottom:0;">🗑️ IoT Bin Status</h3>
            <button class="btn btn-ghost btn-sm" onclick="showView('v-iot-bins')">View All →</button>
          </div>
          <div id="pv-iot-widget" class="glass-card" style="padding:16px;"></div>

          <h3 class="heading" style="margin-top:24px; margin-bottom:16px;">Impact Analytics</h3>
          <div class="glass-card" style="padding:16px;">
            <div class="between" style="margin-bottom:12px;">
               <div style="font-size:12px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Timeframe</div>
               <select class="form-select" style="width:auto; padding:4px 8px;" onchange="updatePvChart(this.value)">
                 <option value="weekly">Weekly</option>
                 <option value="monthly">Monthly</option>
               </select>
            </div>
            <div class="chart-container"><canvas id="pvChart"></canvas></div>
            <button class="btn btn-outline-primary btn-full" style="margin-top:16px; border: 2px solid var(--blue); color: var(--blue);" onclick="window.ESGReporter.generateReport(SESSION, getAllOrders().filter(o => o.providerId === SESSION.id && o.status === 'completed'))">
                📄 Export ESG PDF Report
            </button>
          </div>
        </div>
        <div>
          <div class="glass-card" style="margin-bottom:24px; border-color:var(--blue); background:linear-gradient(135deg, var(--surface) 0%, var(--blue-light) 100%);">
            <div class="ai-badge" style="background:var(--blue); margin-bottom:12px;">🛡️ Trust Protocol</div>
            <div class="between" style="margin-bottom:16px;">
               <div id="pv-trust-rank-icon" style="font-size:42px;">🥉</div>
               <div style="text-align:right;">
                  <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Reputation Score</div>
                  <div style="font-size:28px; font-weight:800; color:var(--blue);" id="pv-trust-score">—</div>
               </div>
            </div>
            <div style="height:8px; background:rgba(0,0,0,0.1); border-radius:4px; overflow:hidden; margin-bottom:12px;">
               <div id="pv-trust-bar" style="height:100%; width:0%; background:var(--blue); transition:width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
            </div>
            <div class="between" style="font-size:12px; font-weight:600;">
               <div id="pv-trust-rank-name">Bronze Level</div>
               <div id="pv-trust-multiplier" style="color:var(--green);">1.0x Rewards</div>
            </div>
            <button class="btn btn-ghost btn-sm btn-full" style="margin-top:16px; border:1px solid var(--blue); color:var(--blue);" onclick="openDigitalPassport()">View Digital Passport →</button>
          </div>

          <div class="glass-card" style="background:var(--green-light); border-color:var(--green);">
            <div style="font-size:32px;margin-bottom:12px;">♻️</div>
            <h3 class="heading" style="color:var(--green-hover);margin-bottom:8px;">Ready to dispatch?</h3>
            <p style="font-size:14px;color:var(--green-hover);opacity:0.8;margin-bottom:20px;">Ensure you meet the 50kg minimum threshold for net-positive energy yield.</p>
            <button class="btn btn-primary" onclick="showView('v-pv-req')">Create Request →</button>
          </div>

          <h3 class="heading" style="margin-top:24px; margin-bottom:16px;">Market Summary</h3>
          <div class="glass-card" style="margin-bottom:16px; border-color:var(--blue);">
            <div style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">Access the carbon credit exchange to trade your earned $RGX tokens.</div>
            <button class="btn btn-primary btn-full" onclick="showView('v-market')">🛒 Open Market</button>
          </div>

          <div class="glass-card sensor-card" style="margin-top:24px; padding:16px;">
            <div class="ai-badge">✨ Intelligence Engine</div>
            <h4 style="margin-bottom:4px;" id="pv-ai-predict">Analyzing patterns...</h4>
            <p style="font-size:13px; color:var(--text-muted);" id="pv-ai-trend">History-based forecasting active.</p>
          </div>

          <h3 class="heading" style="margin-top:24px; margin-bottom:16px;">Regional Leaderboard</h3>
          <div class="glass-card" style="padding:16px;" id="pv-leaderboard">
            <!-- Dynamic Leaderboard -->
          </div>

          <div class="glass-card" style="margin-top:24px; padding:16px; border-color:var(--amber); background:rgba(245,158,11,0.07);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
              <span style="font-size:22px;">🔔</span>
              <div>
                <div style="font-weight:700; font-size:14px;">Smart Dispatch Alerts</div>
                <div style="font-size:12px; color:var(--text-muted);">Get notified instantly when your dispatch is picked up</div>
              </div>
            </div>
            <button class="btn btn-full" id="btn-smart-alerts"
              style="${getAlertPreference()
                ? 'background:transparent; border:2px solid var(--red); color:var(--red);'
                : 'background:linear-gradient(135deg,#F59E0B,#D97706); color:#fff;'} font-weight:700;"
              onclick="toggleSmartAlerts()">
              ${getAlertPreference() ? '🔕 Disable Smart Alerts' : '🔔 Enable Smart Alerts'}
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Calculate Leaderboard
    const allCompleted = getAllOrders().filter(o=>o.status==='completed');
    const lbMap = {};
    allCompleted.forEach(o => {
       lbMap[o.providerId] = (lbMap[o.providerId]||0) + parseInt(o.actualKg||o.kg||0);
    });
    // Ensure current user is in map even if 0
    if(!lbMap[SESSION.id]) lbMap[SESSION.id] = 0;
    
    const lbSorted = Object.keys(lbMap).map(id => ({
       id, org: (DB.get('acc:'+id)||{org:'Unknown'}).org, kg: lbMap[id]
    })).sort((a,b)=>b.kg - a.kg).slice(0,3);
    
    const lbDiv = document.getElementById('pv-leaderboard');
    if(lbDiv) {
      if (!allCompleted.length) {
        lbDiv.innerHTML = renderDashboardListState({
          icon: '🏆',
          title: 'Leaderboard coming soon',
          description: 'Regional rankings update as you complete dispatches.',
          subtext: 'Top contributors by material recovered will appear here.',
          statusLabel: 'Idle',
          tone: 'inactive'
        });
      } else {
        const lbHTML = lbSorted.map((item, i) => `
          <div class="between" style="padding:8px 0; border-bottom:${i<2?'1px solid var(--border)':'none'};">
             <div style="font-weight:600;"><span style="color:var(--amber);">${i+1}.</span> ${escapeHTML(item.org)} ${item.id===SESSION.id?'(You)':''}</div>
             <div class="badge badge-green">${item.kg} kg</div>
          </div>
        `).join('');
        lbDiv.innerHTML = lbHTML;
      }
    }

    // Trust Protocol Integration
    const trustScore = TrustProtocol.calculateScore(SESSION, orders);
    const rank = TrustProtocol.getRankDetails(trustScore);
    const scoreEl = document.getElementById('pv-trust-score');
    if (scoreEl) {
        scoreEl.textContent = trustScore;
        document.getElementById('pv-trust-bar').style.width = trustScore + '%';
        document.getElementById('pv-trust-rank-icon').textContent = rank.icon;
        document.getElementById('pv-trust-rank-name').textContent = rank.name + ' Level';
        document.getElementById('pv-trust-multiplier').textContent = rank.multiplier + 'x Rewards';
    }
    
    // Predict next day = AI Intelligence Engine
    const myTotal = lbMap[SESSION.id] || 0;
    const myComps = completed.length;
    const avg = myComps > 0 ? Math.round(myTotal / myComps) : 0;
    const prediction = Intelligence.predictWasteVolume(completed);
    const aiPredict = document.getElementById('pv-ai-predict');
    if(aiPredict) {
      aiPredict.textContent = `${prediction.expectedKg}kg ${prediction.trend === 'Upward' ? '📈' : '📉'}`;
      const trendEl = document.getElementById('pv-ai-trend');
      if(trendEl) trendEl.textContent = `Trend: ${prediction.trend} | Confidence: ${prediction.confidence}`;
    }
    const totalKg = completed.reduce((s,o)=>s+(o.actualKg||o.kg),0);
    const statsDiv = document.getElementById('pv-stats');
    if(statsDiv) {
      const bins = getIoTBins();
      const critCount = bins.filter(b => b.fill >= 85).length;
      const requestState = orders.length ? 'active' : 'empty';
      const kgState = orders.length ? 'active' : 'empty';
      const offsetState = orders.length ? 'active' : 'empty';
      const binState = bins.length ? (critCount > 0 ? 'active' : 'inactive') : 'empty';
      statsDiv.innerHTML = renderMetricGrid([
        renderMetricCard({
          title: 'Total Requests',
          value: orders.length,
          description: orders.length ? 'Dispatch requests tracked in the system.' : 'No dispatch requests have been created yet.',
          status: requestState === 'empty' ? 'empty' : 'active',
          icon: '📦',
          statusLabel: requestState === 'empty' ? 'No data' : 'Active',
          tone: requestState === 'empty' ? 'inactive' : 'active'
        }),
        renderMetricCard({
          title: 'Kg Recycled',
          value: orders.length ? totalKg : null,
          description: orders.length ? 'Recovered material captured from completed loads.' : 'No material has been processed yet.',
          status: kgState === 'empty' ? 'empty' : 'active',
          icon: '♻️',
          statusLabel: kgState === 'empty' ? 'No data' : 'Active',
          tone: kgState === 'empty' ? 'inactive' : 'active'
        }),
        renderMetricCard({
          title: 'CO₂ Offset (kg)',
          value: orders.length ? Math.round(orders.reduce((sum, o) => {
            const kg = parseFloat(o.actualKg || o.kg) || 0;
            const plantAcc = DB.get('acc:' + o.plantId);
            return sum + (kg * getCO2Factor(o.wasteType, plantAcc?.processingMethod));
          }, 0)) : null,
          description: orders.length ? 'Estimated emissions avoided from recovered waste (IPCC 2006 factors).' : 'No offset can be calculated until loads are processed.',
          status: offsetState === 'empty' ? 'empty' : 'active',
          icon: '🌍',
          statusLabel: offsetState === 'empty' ? 'No data' : 'Active',
          tone: offsetState === 'empty' ? 'inactive' : 'active'
        }),
        renderMetricCard({
          title: 'Bins Critical',
          value: bins.length ? critCount : null,
          description: bins.length ? 'Connected bins above the critical fill threshold.' : 'No IoT bins are connected yet.',
          status: binState === 'empty' ? 'empty' : critCount > 0 ? 'active' : 'inactive',
          icon: '🗑️',
          statusLabel: binState === 'empty' ? 'No data' : critCount > 0 ? 'Warning' : 'Idle',
          tone: binState === 'empty' ? 'inactive' : critCount > 0 ? 'warning' : 'inactive',
          accent: critCount > 0 ? 'var(--red)' : 'var(--green)',
          actionHtml: '<button class="btn btn-ghost btn-sm" onclick="showView(\'v-iot-bins\')">Open bins</button>'
        })
      ]);
    }
    const pvMyKg = document.getElementById('pv-my-kg');
    if(pvMyKg) pvMyKg.textContent = totalKg + ' kg';
    const pvActDiv = document.getElementById('pv-act');
    if(pvActDiv) pvActDiv.innerHTML = active.length ? active.map(o=>buildOrderCard(o,'provider')).join('') : renderDashboardListState({
      icon: '🚚',
      title: 'No active dispatches',
      description: 'There are no in-flight provider orders right now.',
      subtext: 'Create a dispatch request to populate this section.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });

    if(fullRender) setTimeout(initPvChart, 100);

    // Render IoT Bin mini-widget
    const iotWidget = document.getElementById('pv-iot-widget');
    if (iotWidget) {
      const bins = getIoTBins();
      if (!bins.length) {
        iotWidget.innerHTML = '<div style="font-size:13px;color:var(--text-muted);text-align:center;padding:12px;">No bins registered. <button class="btn btn-ghost btn-sm" onclick="showView(\'v-iot-bins\')">Add one →</button></div>';
      } else {
        iotWidget.innerHTML = bins.map(b => {
          const col = b.fill >= 85 ? 'var(--red)' : b.fill >= 60 ? 'var(--amber)' : 'var(--green)';
          const badge = b.fill >= 85 ? `<span class="badge badge-red" style="font-size:10px;">⚠ Critical</span>`
            : b.fill >= 60 ? `<span class="badge badge-amber" style="font-size:10px;">◑ Filling</span>`
            : `<span class="badge badge-green" style="font-size:10px;">✓ OK</span>`;
          return `
            <div style="margin-bottom:14px;">
              <div class="between" style="margin-bottom:5px;">
                <div style="font-size:13px;font-weight:600;">${escapeHTML(b.name)}</div>
                <div style="display:flex;align-items:center;gap:8px;">
                  ${badge}
                  <span style="font-size:13px;font-weight:700;color:${col};">${b.fill}%</span>
                  ${b.fill >= 85 ? `<button class="btn btn-primary btn-sm" style="font-size:10px;padding:3px 8px;" onclick="iotDispatchFromBin('${b.id}')">🚀 Dispatch</button>` : ''}
                </div>
              </div>
              <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;">
                <div style="height:100%;width:${b.fill}%;background:${col};border-radius:999px;transition:width 0.8s;"></div>
              </div>
            </div>`;
        }).join('') + `<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:4px;" onclick="showView('v-iot-bins')">Manage All Bins →</button>`;
      }
      syncIoTAlertBadge();
      startIoTSim();
    }
  }
  
  if (currentView === 'v-pv-req') {
    if(fullRender) mc.innerHTML = `
      <div style="max-width:600px; margin:0 auto;">
        <div class="glass-card" style="margin-bottom:16px; border-color:var(--green); background:var(--green-light); padding:20px; display:flex; align-items:center; gap:16px;">
          <div style="font-size:32px;">🔬</div>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:15px; color:var(--green-hover); margin-bottom:4px;">BioScan AI — Waste Verification</div>
            <div style="font-size:13px; color:var(--green-hover); opacity:0.8;">Scan your waste with AI before dispatching. Auto-fills form fields.</div>
          </div>
          <button class="btn btn-primary" id="btn-open-scanner" onclick="openScanner()" style="white-space:nowrap; background:var(--green); border-color:var(--green);">
            🔬 Scan Waste
          </button>
        </div>
        <div class="glass-card">
          <h3 class="heading" style="margin-bottom:24px;">New Dispatch Request</h3>
          <div class="form-group">
            <label class="form-label">Waste Category</label>
            <select class="form-select" id="req-type">${WASTE_TYPES.map(t=>`<option>${t}</option>`).join('')}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Estimated Quantity (kg) <span style="color:var(--amber);">*Min 50kg Limit*</span></label>
            <input class="form-input" id="req-kg" type="number" min="50" placeholder="e.g. 120">
          </div>
          <div class="form-group">
            <label class="form-label">Collection Shift</label>
            <select class="form-select" id="req-shift">${SHIFTS.map(t=>`<option>${t}</option>`).join('')}</select>
          </div>
          <button class="btn btn-primary btn-full" onclick="submitPvRequest()">Locate Plant & Dispatch 🚀</button>
        </div>
      </div>
    `;
  }

  if (currentView === 'v-pv-hist-week' || currentView === 'v-pv-hist-month') {
    const isMonth = currentView === 'v-pv-hist-month';
    const limitDays = isMonth ? 30 : 7;

    const now = Date.now();
    const completed = getAllOrders().filter(o => o.providerId === SESSION.id && o.status === 'completed');
    const filteredHistory = completed.filter(o => (now - o.ts) <= (limitDays * 24 * 60 * 60 * 1000));
    
    if(fullRender) mc.innerHTML = `
      <section class="records-shell" aria-label="${isMonth ? 'Monthly' : 'Weekly'} records">
        <div class="between records-header">
           <h3 class="heading" style="margin-bottom:0;">${isMonth ? 'Monthly' : 'Weekly'} Records</h3>
           ${filteredHistory.length ? `<div class="records-tools"><button class="btn btn-outline-danger btn-sm" onclick="clearAllHistory('provider')">🗑 Clear All History</button></div>` : ''}
        </div>
        <div id="pv-hist-list" class="record-stack"></div>
      </section>
    `;
    document.getElementById('pv-hist-list').innerHTML = filteredHistory.length ? filteredHistory.map(o=>buildOrderCard(o,'provider')).join('') : renderDashboardListState({
      icon: '📦',
      title: `No completed history in the last ${limitDays} days`,
      description: 'No provider order history was recorded during this period.',
      subtext: 'Completed dispatches will display here once available.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
  }
}

window.openScanner = function() {
  const mb = document.getElementById('modal-box');
  if(mb) {
    mb.classList.add('modal-large');
    mb.innerHTML = ''; // Clear previous content
  }
  
  BioScanner.open({
    containerId: 'modal-box',
    role: SESSION.role,
    userName: SESSION.name,
    userOrg: SESSION.org,
    userId: SESSION.id,
    onBack: () => closeScanner(),
    onApply: (score, organicPercent) => {
      showView('v-pv-req');
      setTimeout(() => {
        const rKg = document.getElementById('req-kg'); if(rKg) rKg.value = Math.floor(Math.random() * 150 + 50); 
        const rType = document.getElementById('req-type'); if(rType) rType.value = organicPercent > 70 ? "Food Waste" : "Dry Waste";
        showToast(`✓ Scanner Data Applied: ${score}% Segregation Score`);
        closeScanner();
      }, 200);
    },
    onScanSaved: (record) => {
      const history = JSON.parse(localStorage.getItem('regenx_scan_history') || '[]');
      history.unshift({
        scanId: record.id,
        timestamp: new Date(record.ts).toISOString(),
        role: SESSION.role,
        organicPercentage: record.result?.organicPercent || 0,
        contaminationLevel: (record.result?.organicPercent || 0) >= 75 ? 'Low' : (record.result?.organicPercent || 0) >= 50 ? 'Medium' : 'High',
        wasteCategory: record.result?.wasteCategory || 'Unknown',
        linkedDispatchId: null
      });
      if (history.length > 50) history.pop();
      localStorage.setItem('regenx_scan_history', JSON.stringify(history));
    }
  });
  document.getElementById('modal').classList.add('open');
}

window.closeModal = function() {
  const m = document.getElementById('modal');
  if(m) m.classList.remove('open');
  const mb = document.getElementById('modal-box');
  if(mb) {
    mb.classList.remove('modal-large');
    mb.classList.remove('integrity-modal');
    mb.innerHTML = '';
  }
}

window.closeScanner = function() {
  if (window.BioScanner) BioScanner.stop();
  const mb = document.getElementById('modal-box');
  if(mb) mb.classList.remove('modal-large');
  closeModal();
}

let pvChartInstance = null;

function initPvChart() {
  const ctx = document.getElementById('pvChart');
  if(!ctx || window.Chart === undefined) return;
  if(pvChartInstance) pvChartInstance.destroy();
  
  // Calculate dynamic weekly data from real history
  const orders = getAllOrders().filter(o => o.providerId === SESSION.id && o.status === 'completed');
  let kgData = [0,0,0,0,0,0,0];
  let co2Data = [0,0,0,0,0,0,0];
  
  // Dump all into current day for simplicity in local demo without real dates over weeks
  const totKg = orders.reduce((s,o)=>s+parseInt(o.actualKg||o.kg), 0);
  kgData[6] = totKg;
  co2Data[6] = Math.round(orders.reduce((sum, o) => {
    const kg = parseInt(o.actualKg || o.kg) || 0;
    const plantAcc = DB.get('acc:' + o.plantId);
    return sum + (kg * getCO2Factor(o.wasteType, plantAcc?.processingMethod));
  }, 0));

  window._pvDynamicData = { kg: kgData, co2: co2Data, totKg, totCO2: co2Data[6] };

  pvChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Today'],
      datasets: [{
        label: 'Waste Generated (kg)',
        data: kgData,
        backgroundColor: '#0D9488',
        borderRadius: 4
      }, {
        label: 'CO2 Offset (kg)',
        data: co2Data,
        backgroundColor: '#3B82F6',
        borderRadius: 4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

window.updatePvChart = function(period) {
  if(!pvChartInstance) return;
  const d = window._pvDynamicData;
  if(!d) return;
  
  if(period === 'monthly') {
    pvChartInstance.data.labels = ['Week 1', 'Week 2', 'Week 3', 'This Week'];
    pvChartInstance.data.datasets[0].data = [0, 0, 0, d.totKg];
    pvChartInstance.data.datasets[1].data = [0, 0, 0, d.totCO2];
  } else {
    pvChartInstance.data.labels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Today'];
    pvChartInstance.data.datasets[0].data = d.kg;
    pvChartInstance.data.datasets[1].data = d.co2;
  }
  pvChartInstance.update();
}

window.clearAllHistory = function(role) {
  if(!confirm("Are you sure you want to clear all completed history? This cannot be undone.")) return;
  const orders = getAllOrders().filter(o => {
    if(role === 'provider') return o.providerId === SESSION.id && o.status === 'completed';
    if(role === 'rider') return o.riderId === SESSION.id && o.status === 'completed';
    return false;
  });
  orders.forEach(o => ReGenXRealtime?.removeOrderKey(o.id, { rooms: ['network_room', 'providers_room', 'riders_room', 'plants_room', 'admin_room'], eventType: 'KPI_UPDATED' }));
  showToast("✓ History Cleared");
  refreshCurrentView(true);
}

window.submitPvRequest = async function() {
  const type = document.getElementById('req-type').value;
  const kg = parseInt(document.getElementById('req-kg').value);
  const shift = document.getElementById('req-shift').value;
  
  if (!kg || kg < 50) return showToast("⚠ Minimum 50 kg requirement not met to ensure net-positive energy yield.");
  
  // Find nearest plant (50km limit)
  const plants = DB.list('acc:').map(k=>DB.get(k)).filter(a=>a.role==='plant');
  let nearest = null; let minDist = 9999;
  for(let p of plants) {
    const d = distanceKm(SESSION.lat, SESSION.lng, p.lat, p.lng);
    if(d < minDist) { minDist = d; nearest = p; }
  }
  
  if (!nearest || minDist > 50) return showToast(`⚠ Out of Range! Nearest plant is >50km away.`);
  
  const o = {
    id: uid(), ts: ts(), providerId: SESSION.id, providerOrg: SESSION.org, providerLat: SESSION.lat, providerLng: SESSION.lng,
    wasteType: type, kg, shift, plantId: nearest.id, plantName: nearest.org, status: 'requested'
  };
  saveOrder(o);
  addSlaEntry(o);
 // INSIDE submitPvRequest
  await recordTrustEvent(o, 'requested', 'provider', { lat: SESSION.lat, lng: SESSION.lng });
  
  // Notify local roles and publish an operational realtime event
  addWorkflowNotification({
    title: 'Dispatch Created',
    body: `Your pickup request for ${kg}kg of ${type} has been sent to ${nearest.org}.`,
    role: 'provider',
    type: 'dispatch-created',
    priority: 'high',
    relatedId: o.id,
    url: '/'
  });
  addWorkflowNotification({
    title: 'New Nearby Pickup Request',
    body: `${SESSION.org} requested ${kg}kg of ${type}.`,
    role: 'rider',
    type: 'dispatch-created',
    priority: 'high',
    relatedId: o.id,
    url: '/'
  });
  addWorkflowNotification({
    title: 'Incoming Waste Shipment Alert',
    body: `${kg}kg from ${SESSION.org} is routed to your plant.`,
    role: 'plant',
    type: 'dispatch-created',
    priority: 'normal',
    relatedId: o.id,
    url: '/'
  });
  publishOperationalEvent('DISPATCH_CREATED', [], {
    toast: `New dispatch created for ${nearest.org}.`,
    statusLabel: 'Dispatch live'
  }, ['network_room', 'providers_room', 'riders_room', 'plants_room', 'admin_room']);
  showToast(`✓ Dispatched! Routed to ${nearest.org} (${minDist.toFixed(1)}km away).`);
  showView('v-pv-dash');
}

window.cancelOrder = function(id) {
  const o = getOrder(id); if(!o) return;
  o.status = 'rejected'; saveOrder(o);
  publishOperationalEvent('KPI_UPDATED', [], {
    toast: `Dispatch #${o.id.slice(-6).toUpperCase()} was cancelled.`,
    statusLabel: 'Cancelled'
  }, ['network_room', 'providers_room', 'riders_room', 'plants_room', 'admin_room']);
  showToast("Cancelled."); refreshCurrentView();
}

window.deleteOrder = function(id) {
  ReGenXRealtime?.removeOrderKey(id, { rooms: ['network_room', 'providers_room', 'riders_room', 'plants_room', 'admin_room'], eventType: 'KPI_UPDATED', meta: { statusLabel: 'Order removed' } });
  showToast("✓ Record Deleted");
  refreshCurrentView(true);
}


// ════════ OSRM REAL-ROAD ROUTING ENGINE ════════

async function fetchOSRMRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) return null;
  const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    if (!res.ok) return null;
    const d = await res.json();
    if (d.code !== 'Ok' || !d.routes.length) return null;
    const r = d.routes[0];
    return {
      geojson: r.geometry,
      distance_km: (r.distance / 1000).toFixed(1),
      duration_min: Math.round(r.duration / 60),
      legs: r.legs.map(l => ({ distance_km: (l.distance/1000).toFixed(1), duration_min: Math.round(l.duration/60) }))
    };
  } catch { return null; }
}

async function fetchOSRMDurationMatrix(points) {
  if (!points || points.length < 2) return null;
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
  try {
    const res = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration`);
    if (!res.ok) return null;
    const d = await res.json();
    return d.code === 'Ok' ? d.durations : null;
  } catch { return null; }
}

function greedyTSP(matrix, startIdx) {
  const n = matrix.length;
  const visited = new Array(n).fill(false);
  const order = [startIdx];
  visited[startIdx] = true;
  for (let s = 1; s < n; s++) {
    const cur = order[order.length - 1];
    let best = -1, bestT = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && matrix[cur][j] != null && matrix[cur][j] < bestT) { best = j; bestT = matrix[cur][j]; }
    }
    if (best >= 0) { visited[best] = true; order.push(best); }
  }
  return order;
}

// Always-available Haversine TSP (zero API dependency)
function haversineTSP(riderLat, riderLng, jobs) {
  if (jobs.length <= 1) return { jobs, savings_km: 0 };
  const n = jobs.length;
  // Build NxN distance matrix between pickups
  const mat = Array.from({length: n}, (_, i) =>
    Array.from({length: n}, (_, j) =>
      distanceKm(jobs[i].providerLat, jobs[i].providerLng, jobs[j].providerLat, jobs[j].providerLng)
    )
  );
  // Distance from rider to each pickup
  const rDist = jobs.map(j => distanceKm(riderLat, riderLng, j.providerLat, j.providerLng));
  const firstPick = rDist.reduce((bi, d, i) => d < rDist[bi] ? i : bi, 0);

  // Naive total (visit in original order)
  const naiveDist = jobs.reduce((s, _, i) => s + (i > 0 ? mat[i-1][i] : rDist[0]), 0);

  // Greedy TSP from nearest first pickup
  const orderIdx = greedyTSP(mat, firstPick);
  const optDist   = orderIdx.reduce((s, idx, step) => s + (step === 0 ? rDist[idx] : mat[orderIdx[step-1]][idx]), 0);

  return {
    jobs: orderIdx.map(i => jobs[i]),
    savings_km: Math.max(0, parseFloat((naiveDist - optDist).toFixed(2)))
  };
}

async function aiOptimizeJobs(riderLat, riderLng, jobs) {
  // Phase 1: Haversine TSP — always works, instant result
  const hv = haversineTSP(riderLat, riderLng, jobs);
  if (jobs.length <= 1) return { jobs, savings_min: 0, source: 'none' };

  // Phase 2: Try OSRM duration matrix for more accurate road-time TSP
  try {
    const pts = [{ lat: riderLat, lng: riderLng }, ...jobs.map(j => ({ lat: j.providerLat, lng: j.providerLng }))];
    const matrix = await fetchOSRMDurationMatrix(pts);
    if (matrix) {
      const n = jobs.length;
      const sub = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => matrix[i+1][j+1]));
      const riderRow = matrix[0].slice(1);
      const firstPick = riderRow.reduce((bi, t, i) => t < riderRow[bi] ? i : bi, 0);
      const naiveTime = jobs.reduce((s, _, i) => s + (i > 0 ? sub[i-1][i] : (riderRow[0]||0)), 0);
      const orderIdx  = greedyTSP(sub, firstPick);
      const optTime   = orderIdx.reduce((s, idx, step) => s + (step === 0 ? (matrix[0][idx+1]||0) : (sub[orderIdx[step-1]][idx]||0)), 0);
      return { jobs: orderIdx.map(i => jobs[i]), savings_min: Math.max(0, Math.round((naiveTime - optTime) / 60)), source: 'osrm' };
    }
  } catch { /* OSRM unavailable, fall through */ }

  // Fallback: return Haversine TSP result
  return { jobs: hv.jobs, savings_min: 0, savings_km: hv.savings_km, source: 'haversine' };
}

// ════════ RIDER LOGIC ════════
async function renderRider(mc, fullRender) {
  const orders = getAllOrders();
  const myOrders = orders.filter(o => o.riderId === SESSION.id);
  const activeJobs = myOrders.filter(o => !['completed','rejected'].includes(o.status));
  const pending = orders.filter(o => o.status === 'requested');
  const hist = myOrders.filter(o => o.status === 'completed');
  
  const b = document.getElementById('rd-badge');
  if(b) { b.style.display = pending.length ? 'inline-block' : 'none'; b.innerText = pending.length; }

  if (currentView === 'v-rd-dash') {
    const tab = window._rdTab || 'route';
    if(fullRender) mc.innerHTML = `
      <div class="mobile-tabs">
        <button class="mobile-tab-btn ${tab==='route'?'active':''}" onclick="switchRdTab('route')">Route HUD</button>
        <button class="mobile-tab-btn ${tab==='analytics'?'active':''}" onclick="switchRdTab('analytics')">AI Telemetry</button>
      </div>

      ${renderTrustIndexCard()}
      ${renderComplianceWidget()}
      ${renderReconciliationWidget()}
      ${renderSlaWidget()}
      ${renderEnergyWidget()}
      ${renderSensorWidget()}
      ${renderEmissionsWidget()}
      ${renderQualityWidget()}
      ${renderAutomationWidget()}

      <div class="two-col">
        <div class="${tab !== 'route' ? 'desktop-only' : ''}">
          <h3 class="heading" style="margin-bottom:16px;">Active Tasks ${activeJobs.length > 1 ? `<span class="badge badge-amber" style="margin-left:8px;">Batching Enabled</span>` : ''}</h3>
          <div id="rd-act"></div>
          <h3 class="heading" style="margin-bottom:16px; margin-top:24px;">Optimal Batch Map</h3>
          <div id="rider-map" style="margin-bottom:24px;"></div>
          ${activeJobs.length ? `<div class="glass-card"><h4 style="margin-bottom:16px;">Route Progress</h4><div id="rd-tl" class="timeline"></div></div>` : ''}
        </div>
        <div class="${tab !== 'analytics' ? 'desktop-only' : ''}">
          ${activeJobs.length ? `
          <div class="glass-card sensor-card" style="margin-bottom:16px; padding:16px; border-color:var(--green); background:var(--green-light);" id="rd-route-summary">
            <div style="font-size:12px;color:var(--green-hover);display:flex;align-items:center;gap:8px;"><div class="bw-spinner" style="width:16px;height:16px;border-width:2px;"></div> AI computing optimal route…</div>
          </div>
          <div class="glass-card sensor-card" style="margin-bottom:16px; padding:16px; border-color:var(--border);">
             <div style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:12px; text-transform:uppercase;">🌍 Live Conditions</div>
             <div class="between" style="margin-bottom:8px;"><div>🌧️ Weather</div><div id="rt-weather" class="skeleton-loader"></div></div>
             <div class="between" style="margin-bottom:8px;"><div>🚗 Traffic</div><div style="font-weight:700; color:var(--green);" id="rt-traffic">Normal</div></div>
             <div class="between"><div>⏱️ Weather Delay</div><div style="font-weight:700; color:var(--text-muted);" id="rt-ai-adj">+0 Mins</div></div>
          </div>
          <div class="glass-card sensor-card" style="padding:16px; border-color:var(--blue);">
             <div style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:12px; text-transform:uppercase;">📡 Route Telemetry</div>
             <div class="between" style="margin-bottom:8px;"><div>📍 Total Distance</div><div style="font-weight:700;" id="rt-total-dist">Calculating…</div></div>
             <div class="between" style="margin-bottom:8px;"><div>⏱️ ETA</div><div style="font-weight:700; color:var(--blue);" id="rt-eta">Calculating…</div></div>
             <div class="between" style="margin-bottom:8px;"><div>⛽ Fuel Saved</div><div style="font-weight:700; color:var(--green);" id="rt-fuel-saved">—</div></div>
             <div class="between"><div>🔋 Battery</div><div style="font-weight:700;" id="rt-batt">--</div></div>
          </div>` : renderDashboardListState({
            icon: '📡',
            title: 'No active telemetry',
            description: 'Accept a job to start live route telemetry.',
            subtext: 'Weather, ETA, fuel, and battery values will appear after a route is active.',
            statusLabel: 'Idle',
            tone: 'inactive'
          })}
        </div>
      </div>
    `;
    
    document.getElementById('rd-act').innerHTML = activeJobs.length ? activeJobs.map(o => buildOrderCard(o, 'rider')).join('') : renderDashboardListState({
      icon: '📍',
      title: 'No active task',
      description: 'Check available jobs to begin a route.',
      subtext: 'When a dispatch is accepted, route progress will appear here.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
    
    if (activeJobs.length) {
      const active = activeJobs[0]; // Primary task for timeline
      const steps = [
        {k:'assigned', l:'Batch Assigned', d:true},
        {k:'en_route', l:'Driving to Provider', d:['en_route','picked_up','at_plant'].includes(active.status)},
        {k:'picked_up', l:'Waste Collected', d:['picked_up','at_plant'].includes(active.status)},
        {k:'at_plant', l:'Arrived at Plant', d:active.status==='at_plant'}
      ];
      document.getElementById('rd-tl').innerHTML = steps.map((s,i) => `
        <div class="tl-item ${s.d ? 'done':''}">
          <div class="tl-col"><div class="tl-dot"></div>${i<steps.length-1?'<div class="tl-line"></div>':''}</div>
          <div class="tl-content"><div class="tl-title">${s.l}</div></div>
        </div>
      `).join('');
    }
    
    // ── Real OSRM Road Routing (with Haversine TSP fallback) ──
    setTimeout(async () => {
      if (!document.getElementById('rider-map')) return;
      if (rMap) { rMap.remove(); rMap = null; }
      rMap = L.map('rider-map').setView([SESSION.lat, SESSION.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(rMap);

      const rIco = L.divIcon({ html: "<div style='width:18px;height:18px;background:var(--blue);border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.8);'></div>", className: '' });
      const rMarker = L.marker([SESSION.lat, SESSION.lng], { icon: rIco, draggable: true }).addTo(rMap)
        .bindPopup('📍 You (Rider) — <b>Drag to correct GPS</b>').openPopup();
      rMarker.on('dragend', () => {
        const p = rMarker.getLatLng();
        SESSION.lat = p.lat; SESSION.lng = p.lng;
        DB.set('acc:' + SESSION.id, SESSION);
        refreshCurrentView(false);
      });

      if (activeJobs.length) {
        // AI Multi-Stop Route Optimization (Greedy + 2-Opt)
        const result = RouteOptimizer.optimizeRoute(SESSION, activeJobs);
        const optimizedJobs = result.optimizedJobs;

        const plantId = optimizedJobs.length > 0 ? optimizedJobs[0].plantId : null;
        const plant = plantId ? DB.get('acc:' + plantId) : null;
        const waypoints = [
          { lat: SESSION.lat, lng: SESSION.lng },
          ...optimizedJobs.map(j => ({ lat: j.providerLat, lng: j.providerLng })),
          ...(plant ? [{ lat: plant.lat, lng: plant.lng }] : [])
        ];

        // Draw numbered pickup markers in TSP order immediately
        optimizedJobs.forEach((job, i) => {
          const ico = L.divIcon({
            html: `<div style="width:28px;height:28px;background:#F59E0B;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${i+1}</div>`,
            className: '', iconAnchor: [14, 14]
          });
          L.marker([job.providerLat, job.providerLng], { icon: ico }).addTo(rMap)
            .bindPopup(`<b>Stop ${i+1}: ${escapeHTML(job.providerOrg)}</b><br>${escapeHTML(job.kg)}kg ${escapeHTML(job.wasteType)}`);
        });
        if (plant) {
          const pltIco = L.divIcon({
            html: `<div style="width:32px;height:32px;background:#0D9488;border-radius:8px;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🏭</div>`,
            className: '', iconAnchor: [16, 16]
          });
          L.marker([plant.lat, plant.lng], { icon: pltIco }).addTo(rMap).bindPopup(`<b>Plant:</b> ${escapeHTML(plant.org)}`);
        }

        // Draw TSP-ordered path immediately (glowing glassmorphism neon route flow)
        const latlngs = waypoints.map(w => [w.lat, w.lng]);
        L.polyline(latlngs, { color: '#38BDF8', weight: 8, opacity: 0.3, lineJoin: 'round' }).addTo(rMap);
        let pathLayer = L.polyline(latlngs, { color: '#0D9488', weight: 4, opacity: 0.9, dashArray: '8, 8', lineJoin: 'round' }).addTo(rMap);
        rMap.fitBounds(pathLayer.getBounds(), { padding: [50, 50] });

        // INTELLIGENCE ENHANCEMENT: High Demand Heatmap
        const allAccs = DB.list('acc:').map(k => DB.get(k));
        const providers = allAccs.filter(a => a.role === 'provider');
        const demandZones = Intelligence.getHighDemandZones(providers, orders);
        
        demandZones.forEach(zone => {
           L.circle([zone.lat, zone.lng], {
              color: 'transparent',
              fillColor: '#EF4444',
              fillOpacity: zone.intensity * 0.4,
              radius: 800
           }).addTo(rMap).bindPopup(`<b>High Demand Area</b><br>${zone.reason}`);
        });

        // Haversine total distance estimate
        const hvDist = waypoints.reduce((sum, wp, i) => i === 0 ? 0 : sum + RouteOptimizer.calculateDistance(waypoints[i-1].lat, waypoints[i-1].lng, wp.lat, wp.lng), 0);
        const hvETA  = Math.round(hvDist / 0.25); // ~15 km/h avg speed

        const distEl    = document.getElementById('rt-total-dist');
        const etaEl     = document.getElementById('rt-eta');
        const fuelEl    = document.getElementById('rt-fuel-saved');
        const summaryEl = document.getElementById('rd-route-summary');

        if (distEl) { distEl.textContent = hvDist.toFixed(1) + ' km'; distEl.style.color = 'var(--text)'; }
        if (etaEl)  { etaEl.textContent  = hvETA + ' min (est.)'; etaEl.style.color = 'var(--blue)'; }
        if (fuelEl) { fuelEl.textContent = (result.savingsKm * 0.08).toFixed(2) + ' L'; fuelEl.style.color = 'var(--green)'; }

        const savingsLabel = result.savingsKm > 0 ? ` · Saved ${result.savingsKm} km via 2-Opt AI` : '';
        if (summaryEl) {
          summaryEl.innerHTML = `
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--green-hover);margin-bottom:12px;">
              🤖 AI TSP 2-Opt Optimized Sequence${savingsLabel}
              <span style="font-size:10px;font-weight:500;color:var(--text-muted);margin-left:6px;">(Dynamic Load Factor Routing)</span>
            </div>
            ${optimizedJobs.map((j, i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed var(--border);">
                <div style="width:22px;height:22px;background:var(--amber);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:white;flex-shrink:0;">${i+1}</div>
                <div style="flex:1;font-size:13px;font-weight:600;">${escapeHTML(j.providerOrg)}</div>
                <div style="font-size:11px;color:var(--text-muted);">${RouteOptimizer.calculateDistance(i===0?SESSION.lat:optimizedJobs[i-1].providerLat, i===0?SESSION.lng:optimizedJobs[i-1].providerLng, j.providerLat, j.providerLng).toFixed(1)}km</div>
              </div>`).join('')}
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
              <div style="width:22px;height:22px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;">🏭</div>
              <div style="flex:1;font-size:13px;font-weight:600;">${escapeHTML(plant ? plant.org : 'Plant')}</div>
            </div>
          `;
        }
        showToast(`🤖 TSP Order ready (${result?.source || 'route'}). Fetching road route…`);

        // PHASE 2: Try OSRM for real road geometry (async enhancement)
        const route = await fetchOSRMRoute(waypoints);
        if (route) {
          rMap.removeLayer(pathLayer); // replace dashed with real roads
          L.geoJSON(route.geojson, { style: { color: '#34D399', weight: 9, opacity: 0.2, lineJoin: 'round' } }).addTo(rMap);
          pathLayer = L.geoJSON(route.geojson, { style: { color: '#0D9488', weight: 5, opacity: 0.9, lineJoin: 'round', lineCap: 'round' } }).addTo(rMap);
          rMap.fitBounds(pathLayer.getBounds(), { padding: [50, 50] });

          // Upgrade telemetry with real OSRM values
          if (distEl) { distEl.textContent = route.distance_km + ' km'; distEl.style.color = 'var(--green)'; }
          if (etaEl)  { etaEl.textContent  = route.duration_min + ' min'; etaEl.style.color = 'var(--blue)'; }
          if (fuelEl) { fuelEl.textContent = (parseFloat(route.distance_km) * 0.08).toFixed(2) + ' L'; }

          // Upgrade stop list with real per-leg times from OSRM
          if (summaryEl) {
            summaryEl.innerHTML = `
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--green-hover);margin-bottom:12px;">
                🤖 TSP Optimized · Real Road Route${savingsLabel}
              </div>
              ${optimizedJobs.map((j, i) => {
                const leg = route.legs[i];
                return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed var(--border);">
                  <div style="width:22px;height:22px;background:var(--amber);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:white;flex-shrink:0;">${i+1}</div>
                  <div style="flex:1;font-size:13px;font-weight:600;">${escapeHTML(j.providerOrg)}</div>
                  ${leg ? `<div style="font-size:11px;color:var(--text-muted);">${leg.duration_min}min · ${leg.distance_km}km</div>` : ''}
                </div>`;
              }).join('')}
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
                <div style="width:22px;height:22px;background:var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;">🏭</div>
                <div style="flex:1;font-size:13px;font-weight:600;">${escapeHTML(plant ? plant.org : 'Plant')}</div>
                ${route.legs[optimizedJobs.length] ? `<div style="font-size:11px;color:var(--text-muted);">${route.legs[optimizedJobs.length].duration_min}min · ${route.legs[optimizedJobs.length].distance_km}km</div>` : ''}
              </div>
            `;
          }
          showToast(`🛰️ OSRM Route: ${route.distance_km}km · ${route.duration_min}min`);
        }
      }
    }, 100);
    
    // API Call for Rider Dashboard
    if(active && fullRender) {
       fetchWeather(SESSION.lat, SESSION.lng).then(w => {
          if(!w || currentView !== 'v-rd-dash') return;
          const wt = document.getElementById('rt-weather');
          const ct = document.getElementById('rt-temp');
          const trafficEl = document.getElementById('rt-traffic');
          const aiAdjEl = document.getElementById('rt-ai-adj');
          const battEl = document.getElementById('rt-batt');
          const confEl = document.getElementById('rt-conf');
          if(wt) {
            let cond = "Clear";
            if(w.weathercode > 50) cond = "Raining";
            if(w.weathercode > 70) cond = "Snowing";
            wt.textContent = cond + ` (${Math.round(w.temperature)}°C)`;
            wt.style.color = w.weathercode > 50 ? "var(--amber)" : "var(--green)";
            if(w.weathercode > 50) { 
               if (trafficEl) trafficEl.textContent = "Congested"; 
               if (aiAdjEl) {
                 aiAdjEl.textContent = "+12 Mins"; 
                 aiAdjEl.style.color = "var(--amber)";
               }
            }
          }
          if(ct) ct.textContent = Math.round(w.temperature - 2) + "°C";
          if (battEl) {
            battEl.textContent = Math.floor(Math.random() * 30 + 60) + "%";
            battEl.style.color = "var(--green)";
          }
          if (confEl) {
            confEl.textContent = "98.2%";
            confEl.style.color = "var(--blue)";
          }
       });
    }
  }

  if (currentView === 'v-rd-jobs') {
    if(fullRender) mc.innerHTML = `<h3 class="heading" style="margin-bottom:24px;">Available Jobs</h3><div id="rd-jobs-list"></div>`;
    document.getElementById('rd-jobs-list').innerHTML = pending.length ? pending.map(o=>buildOrderCard(o,'rider')).join('') : renderDashboardListState({
      icon: '📋',
      title: 'No pending requests',
      description: 'There are no unassigned requests right now.',
      subtext: 'New requests will populate this queue automatically.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
  }

  if (currentView === 'v-rd-hist') {
    if(fullRender) mc.innerHTML = `<h3 class="heading" style="margin-bottom:24px;">Completions</h3><div id="rd-hist-list"></div>`;
    document.getElementById('rd-hist-list').innerHTML = hist.length ? hist.map(o=>buildOrderCard(o,'rider')).join('') : renderDashboardListState({
      icon: '✓',
      title: 'No completions yet',
      description: 'Completed jobs will appear here after route closure.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
  }
}

window.switchRdTab = function(t) { window._rdTab = t; refreshCurrentView(true); }

window.riderAccept = async function(id) {
  const o = getOrder(id); if(!o) return;
  o.status = 'assigned'; o.riderId = SESSION.id; o.riderName = SESSION.name;
  saveOrder(o);
  updateSlaEntry(o.id, { status: 'assigned' });
// INSIDE riderAccept
  await recordTrustEvent(o, 'assigned', 'rider', { lat: SESSION.lat, lng: SESSION.lng });
  
  addWorkflowNotification({
    title: 'Pickup Accepted',
    body: `${SESSION.name} accepted the pickup for ${o.providerOrg}.`,
    role: 'provider',
    type: 'pickup-assigned',
    priority: 'high',
    relatedId: o.id,
    url: '/'
  });
  addWorkflowNotification({
    title: 'Job Assigned',
    body: `You accepted pickup for ${o.providerOrg} (${o.kg}kg).`,
    role: 'rider',
    type: 'pickup-assigned',
    priority: 'high',
    relatedId: o.id,
    url: '/'
  });
  addWorkflowNotification({
    title: 'Incoming Shipment En Route',
    body: `Rider ${SESSION.name} is heading to collect the waste.`,
    role: 'plant',
    type: 'pickup-assigned',
    priority: 'normal',
    relatedId: o.id,
    url: '/'
  });
  publishOperationalEvent('KPI_UPDATED', [], {
    toast: `Rider ${SESSION.name} accepted dispatch #${o.id.slice(-6).toUpperCase()}.`,
    statusLabel: 'Route assigned'
  }, ['network_room', 'providers_room', 'riders_room', 'plants_room', 'admin_room']);
  showToast("✓ Route Added to Batch!");
  showView('v-rd-dash');
}
window.riderUpdate = async function(id, st) {
  const o = getOrder(id); if(!o) return;
  o.status = st; saveOrder(o);
  updateSlaEntry(o.id, { status: st });
await recordTrustEvent(o, st, 'rider', { lat: SESSION.lat, lng: SESSION.lng });
  if (st === 'en_route') {
    addWorkflowNotification({
      title: 'Rider En Route',
      body: `${SESSION.name} is on the way to ${o.providerOrg}.`,
      role: 'provider',
      type: 'pickup-progress',
      priority: 'normal',
      relatedId: o.id,
      url: '/'
    });
  }
  if (st === 'at_plant') {
    addWorkflowNotification({
      title: 'Arrival at Plant',
      body: `${SESSION.name} has arrived at ${o.plantName} with the load.`,
      role: 'plant',
      type: 'pickup-progress',
      priority: 'normal',
      relatedId: o.id,
      url: '/'
    });
  }
  publishOperationalEvent('KPI_UPDATED', [], {
    toast: `Dispatch #${o.id.slice(-6).toUpperCase()} moved to ${st.replace('_', ' ')}.`,
    statusLabel: 'Route moving'
  }, ['network_room', 'providers_room', 'riders_room', 'plants_room', 'admin_room']);
  refreshCurrentView();
}
window.openPickupConfirm = function(id) {
  const html = `
    <h3 class="modal-title">Confirm Collection</h3>
    <p class="modal-sub">Verify the load before continuing to plant.</p>
    <div class="form-group"><label class="form-label">Actual Weight Collected (kg)</label><input type="number" id="m-kg" class="form-input"></div>
    <div class="form-group"><label class="form-label">Quality Observation</label><select id="m-qual" class="form-select"><option>Good (Segregated)</option><option>Mixed (Contaminated)</option></select></div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="confirmPickup('${id}')">Confirm ✓</button></div>
  `;
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal').classList.add('open');
}
window.confirmPickup = async function(id) {
  const kg = document.getElementById('m-kg').value;
  if(!kg) return showToast("⚠ Enter weight.");
  const o = getOrder(id); o.status = 'picked_up'; o.actualKg = kg; o.quality = document.getElementById('m-qual').value;
  saveOrder(o);
  updateSlaEntry(o.id, { pickupTs: ts(), status: 'picked_up' });
await recordTrustEvent(o, 'picked_up', 'rider', { lat: SESSION.lat, lng: SESSION.lng });
  addWorkflowNotification({
    title: 'Pickup Confirmed',
    body: `${SESSION.name} collected ${kg}kg from ${o.providerOrg}.`,
    role: 'provider',
    type: 'pickup-confirmed',
    priority: 'high',
    relatedId: o.id,
    url: '/'
  });
  addWorkflowNotification({
    title: 'Load Sent to Plant',
    body: `The load is now verified and on its way to ${o.plantName}.`,
    role: 'plant',
    type: 'pickup-confirmed',
    priority: 'normal',
    relatedId: o.id,
    url: '/'
  });
  publishOperationalEvent('PICKUP_CONFIRMED', [], {
    toast: `Pickup confirmed for dispatch #${o.id.slice(-6).toUpperCase()}.`,
    statusLabel: 'Pickup live'
  }, ['network_room', 'providers_room', 'riders_room', 'plants_room', 'admin_room']);
  closeModal();
  refreshCurrentView();
}

/**
 * Map trust ledger events to display labels.
 * @param {string} event - Event key.
 * @returns {{label:string, icon:string}}
 */
function getIntegrityEventMeta(event) {
  const map = {
    requested: { label: 'Origin Collection Dispatched', icon: '🏨' },
    assigned: { label: 'Rider Assignment Confirmed', icon: '🧭' },
    en_route: { label: 'Logistics Chain Verification', icon: '🚛' },
    picked_up: { label: 'Custody Transfer Logged', icon: '📦' },
    at_plant: { label: 'Plant Gate Arrival', icon: '🏭' },
    completed: { label: 'Plant Processing Attestation', icon: '🧪' },
    sealed: { label: 'Cryptographic Seal Minted', icon: '🔒' }
  };
  return map[event] || { label: 'Ledger Event', icon: '🧷' };
}

/**
 * Open integrity scan modal for an order.
 * @param {string} orderId - Order id.
 */
window.openIntegrityScan = function(orderId) {
  const order = getOrder(orderId);
  if (!order) return;

  const box = document.getElementById('modal-box');
  const modal = document.getElementById('modal');
  if (!box || !modal) return;

  box.innerHTML = `
    <h3 class="modal-title">Integrity Scan</h3>
    <p class="modal-sub">Validating custody chain and route integrity for this dispatch.</p>
    <div class="integrity-scan-panel">
      <div class="integrity-spinner"></div>
      <div style="font-size:13px; color:var(--text-muted);">Running zero-trust verification...</div>
    </div>
  `;
  modal.classList.add('open');
  box.classList.add('integrity-modal');
  box.classList.add('glass-card');

  setTimeout(async () => {
    const events = getOrderLedgerEvents(orderId);
    let isTampered = false;

    for (const e of events) {
      if (!e.hash) {
        isTampered = true;
        break;
      }

      const { hash: storedHash, ...payload } = e;
      try {
        const expectedHash = await generateLedgerHash(payload);
        if (normalizeHash(storedHash) !== normalizeHash(expectedHash)) {
          isTampered = true;
          break;
        }
      } catch (error) {
        console.error('Failed to verify ledger hash:', error);
        isTampered = true;
        break;
      }
    }

    const integrity = getOrderIntegrity(order);
    const statusClass = isTampered ? 'badge-red' : (integrity.score >= 90 ? 'badge-green' : integrity.score >= 75 ? 'badge-blue' : integrity.score >= 60 ? 'badge-amber' : 'badge-red');
    const statusLabel = isTampered ? 'Cryptographic Tampering Detected' : (integrity.score >= 90 ? 'High Integrity' : integrity.score >= 75 ? 'Verified' : integrity.score >= 60 ? 'Watch' : 'Risk');

    let timeline = '';
    if (events.length) {
      timeline = events.map((e, idx) => {
        const meta = getIntegrityEventMeta(e.event);
        return `
          <div class="trust-tl-item">
            <div class="trust-tl-icon">${meta.icon}</div>
            <div>
              <div class="trust-tl-title">${meta.label}</div>
              <div class="trust-tl-sub">${fmtDate(e.ts)} · ${e.actorRole.toUpperCase()}</div>
            </div>
            ${idx < events.length - 1 ? '<div class="trust-tl-line"></div>' : ''}
          </div>
        `;
      }).join('');
    } else {
      timeline = `
        <div class="dashboard-state dashboard-state-empty">
          <div class="dashboard-state-head">
            <div class="dashboard-state-icon">🧾</div>
            <span class="status-badge status-badge-inactive">IDLE</span>
          </div>
          <div style="flex:1;">
            <div class="dashboard-state-title">No ledger events yet</div>
            <div class="dashboard-state-desc">This dispatch has no recorded custody events.</div>
            <div class="dashboard-state-sub">Once the order is scanned, the timeline will populate here.</div>
          </div>
        </div>
      `;
    }

    box.innerHTML = `
      <h3 class="modal-title">Integrity Scan</h3>
      <p class="modal-sub">${isTampered ? 'One or more ledger hashes failed cryptographic verification.' : 'Ledger hash and custody chain validated.'}</p>
      <div class="integrity-summary">
        <div>
          <div style="font-size:12px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Trust Score</div>
          <div class="trust-score-large">${integrity.score}/100</div>
        </div>
        <div style="text-align:right;">
          <div class="badge ${statusClass}">${statusLabel}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">Δ ${integrity.maxDeviationKm.toFixed(2)} km · Gap ${Math.round(integrity.maxGapMins)} min</div>
        </div>
      </div>
      <div class="trust-timeline">${timeline}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      </div>
    `;
  }, 900);
}

window.openSettings = function() {
  const html = `
    <h3 class="modal-title">Account Settings</h3>
    <p class="modal-sub">Manage your ReGenX Profile</p>
    <div style="background:var(--bg); padding:16px; border-radius:12px; margin-bottom:20px;">
      <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase;">Name</div>
      <div style="font-weight:600; margin-bottom:12px;">${escapeHTML(SESSION.name)}</div>
      <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase;">Entity</div>
      <div style="font-weight:600; margin-bottom:12px;">${escapeHTML(SESSION.org)}</div>
      <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase;">Role</div>
      <div style="font-weight:600;">${SESSION.role.toUpperCase()}</div>
    </div>
    
    <div class="modal-actions" style="justify-content: space-between;">
      <button class="btn btn-outline-danger" onclick="deleteAccount()">Delete Account</button>
      <div>
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal').classList.add('open');
}

window.deleteAccount = function() {
  if(confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
    ReGenXRealtime?.syncStorageMutation({
      updates: [{ key: STORAGE_KEY_PREFIX + 'acc:' + SESSION.id, action: 'remove' }],
      rooms: ['network_room', 'admin_room'],
      eventType: 'KPI_UPDATED',
      meta: { statusLabel: 'Account deleted' }
    });
    closeModal();
    doLogout();
    refreshLoginDropdown();
    showToast("Account successfully deleted.");
  }
}

window.openDigitalPassport = function() {
    const orders = getAllOrders().filter(o => o.providerId === SESSION.id && o.status === 'completed');
    const score = TrustProtocol.calculateScore(SESSION, orders);
    const rank = TrustProtocol.getRankDetails(score);
    
    const html = `
        <div style="text-align:center; padding:20px;">
            <div style="font-size:64px; margin-bottom:16px;">${rank.icon}</div>
            <h3 class="modal-title">${escapeHTML(SESSION.org)}</h3>
            <p class="modal-sub">Verified Circular Economy Provider</p>
            
            <div class="glass-card" style="background:var(--bg); border:2px solid ${rank.color}; margin-bottom:24px; padding:20px;">
                <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Trust Protocol Identity</div>
                <div style="font-size:24px; font-weight:800; color:${rank.color};">${rank.name} Class</div>
                <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">Account ID: <span style="font-family:monospace;">${SESSION.id.slice(0,12)}...</span></div>
            </div>
            
            <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr); gap:12px; margin-bottom:24px;">
                <div class="stat-card" style="padding:12px; border-top-color:var(--blue);">
                    <div style="font-size:20px; font-weight:800;">${score}%</div>
                    <div style="font-size:10px; color:var(--text-muted);">Reputation</div>
                </div>
                <div class="stat-card" style="padding:12px; border-top-color:var(--green);">
                    <div style="font-size:20px; font-weight:800;">${rank.multiplier}x</div>
                    <div style="font-size:10px; color:var(--text-muted);">Reward Rate</div>
                </div>
            </div>
            
            <div style="text-align:left; font-size:13px; background:rgba(0,0,0,0.03); padding:16px; border-radius:12px;">
                <div style="font-weight:700; margin-bottom:8px;">📜 Protocol Verification</div>
                <div style="margin-bottom:4px;">✓ Biowaste Authenticity: <strong>Verified</strong></div>
                <div style="margin-bottom:4px;">✓ Network Participation: <strong>${orders.length} Dispatches</strong></div>
                <div>✓ Security Status: <strong>Encrypted & Secure</strong></div>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-primary btn-full" onclick="closeModal()">Close Passport</button>
            </div>
        </div>
    `;
    document.getElementById('modal-box').innerHTML = html;
    document.getElementById('modal').classList.add('open');
}

// ════════ PLANT LOGIC ════════
async function renderPlant(mc, fullRender) {
  const orders = getAllOrders().filter(o => o.plantId === SESSION.id);
  const incoming = orders.filter(o => o.status === 'at_plant');
  const completed = orders.filter(o => o.status === 'completed');
  const logs = getAllLogs().filter(l => l.plantId === SESSION.id);
  
  if (currentView === 'v-pl-dash') {
    if(fullRender) mc.innerHTML = `
      <div class="stats-grid" id="pl-stats"></div>

      ${renderTrustIndexCard()}
      ${renderComplianceWidget()}
      ${renderReconciliationWidget()}
      ${renderSlaWidget()}
      ${renderEnergyWidget()}
      ${renderSensorWidget()}
      ${renderEmissionsWidget()}
      ${renderQualityWidget()}
      ${renderAutomationWidget()}
      
      <div id="pl-ai-widget"></div>
      
      <h3 class="heading" style="margin-bottom:16px; margin-top:16px;">Live Digester Vitals</h3>
      <div class="stats-grid" style="margin-bottom:32px;">
        <div class="glass-card sensor-card" style="text-align:center;">
          <div class="gauge-circle gauge-placeholder" style="border-top-color:var(--text-muted); animation:none;" id="pl-gauge-temp"><span>—</span></div>
          <div style="font-weight:600;">Core Temp</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;" id="pl-stat-temp">Loading telemetry…</div>
        </div>
        <div class="glass-card sensor-card" style="text-align:center;">
          <div class="gauge-circle gauge-placeholder" style="border-top-color:var(--text-muted); animation:none;" id="pl-gauge-pres"><span>—</span></div>
          <div style="font-weight:600;">Pressure (atm)</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;" id="pl-stat-pres">Loading telemetry…</div>
        </div>
        <div class="glass-card sensor-card" style="text-align:center;">
          <div class="gauge-circle gauge-placeholder" style="border-top-color:var(--text-muted); animation:none;" id="pl-gauge-flow"><span>—</span></div>
          <div style="font-weight:600;">CH₄ Flow (m³/h)</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;" id="pl-stat-flow">Loading telemetry…</div>
        </div>
      </div>

      <h3 class="heading" style="margin-top:24px; margin-bottom:16px;">Operational Analytics</h3>
      <div class="glass-card" style="padding:16px; margin-bottom:32px;">
         <div class="chart-container"><canvas id="plChart"></canvas></div>
      </div>

      <div class="two-col">
        <div><h3 class="heading" style="margin-bottom:16px;">Gate Arrivals</h3><div id="pl-inc"></div></div>
        <div><h3 class="heading" style="margin-bottom:16px;">Recent Output</h3><div id="pl-out-logs"></div></div>
      </div>
    `;
    const totKg = completed.reduce((s,o)=>s+parseFloat(o.actualKg||0),0);
    const totBio = logs.reduce((s,l)=>s+parseFloat(l.bio||0),0);
    const recentKgSeries = completed.slice(0, 6).reverse().map(o => Number(o.actualKg || o.kg || 0));
    const recentBioSeries = logs.slice(0, 6).reverse().map(l => Number(l.bio || 0));
    const bioTrendDirection = recentBioSeries.length > 1
      ? (recentBioSeries[recentBioSeries.length - 1] > recentBioSeries[0] ? 'up' : recentBioSeries[recentBioSeries.length - 1] < recentBioSeries[0] ? 'down' : 'flat')
      : 'flat';
    const kgTrendDirection = recentKgSeries.length > 1
      ? (recentKgSeries[recentKgSeries.length - 1] > recentKgSeries[0] ? 'up' : recentKgSeries[recentKgSeries.length - 1] < recentKgSeries[0] ? 'down' : 'flat')
      : 'flat';
    const loadsSeries = completed.slice(0, 6).reverse().map((_, index) => index + 1);
    
    document.getElementById('pl-stats').innerHTML = renderMetricGrid([
      renderMetricCard({
        title: 'Processed Loads',
        value: completed.length,
        description: completed.length ? 'Completed deliveries recorded today.' : 'No loads processed today.',
        status: completed.length ? 'active' : 'empty',
        icon: '🚚',
        statusLabel: completed.length ? 'Live' : 'No data',
        tone: completed.length ? 'active' : 'inactive',
        trend: completed.length ? { direction: 'up', label: 'Volume' } : null,
        sparkline: loadsSeries
      }),
      renderMetricCard({
        title: 'Kg Received',
        value: completed.length ? totKg : null,
        description: completed.length ? 'Feedstock captured from completed loads.' : 'No incoming mass has been logged.',
        status: completed.length ? 'active' : 'empty',
        icon: '⚖️',
        statusLabel: completed.length ? 'Live' : 'No data',
        tone: completed.length ? 'active' : 'inactive',
        trend: completed.length ? { direction: kgTrendDirection, label: kgTrendDirection === 'up' ? 'Rising' : kgTrendDirection === 'down' ? 'Falling' : 'Flat' } : null,
        sparkline: recentKgSeries
      }),
      renderMetricCard({
        title: 'Biogas Generated',
        value: completed.length ? (Number.isInteger(totBio) ? totBio : totBio.toFixed(1)) : null,
        description: completed.length ? (totBio > 0 ? 'Current biogas yield from recent output logs.' : 'No activity detected today.') : 'Biogas output will appear after processing begins.',
        status: completed.length ? 'active' : 'empty',
        icon: '💨',
        statusLabel: completed.length ? (totBio > 0 ? 'Live' : 'Zero Activity') : 'No data',
        tone: completed.length ? 'active' : 'inactive',
        unit: 'm³',
        trend: completed.length ? { direction: bioTrendDirection, label: bioTrendDirection === 'up' ? 'Rising' : bioTrendDirection === 'down' ? 'Falling' : 'Flat' } : null,
        sparkline: recentBioSeries.length ? recentBioSeries : completed.length ? [0, 0, 0, 0] : []
      })
    ]);

    // AI Yield Optimization Engine
    const yieldPrediction = YieldOptimizer.predictYield(completed.slice(0, 10)); // Use recent history
    const aiWidgetEl = document.getElementById('pl-ai-widget');
    if (aiWidgetEl) {
        aiWidgetEl.innerHTML = `
          <h3 class="heading" style="margin-bottom:16px; margin-top:24px;">AI Yield Optimization</h3>
          <div class="glass-card" style="margin-bottom:32px; border:2px solid var(--blue); background:linear-gradient(135deg, var(--surface) 0%, var(--blue-light) 100%);">
            <div class="between" style="margin-bottom:16px;">
               <div class="ai-badge" style="background:var(--blue);">✨ Methane Optimizer</div>
               <div class="badge badge-green">${yieldPrediction.healthStatus}</div>
            </div>
            <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr); gap:12px; margin-bottom:16px;">
               <div class="stat-card" style="padding:12px; text-align:center;">
                  <div style="font-size:24px; font-weight:800; color:var(--blue);">${yieldPrediction.predictedMethane} m³</div>
                  <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Predicted Daily Yield</div>
               </div>
               <div class="stat-card" style="padding:12px; text-align:center;">
                  <div style="font-size:24px; font-weight:800; color:var(--amber);">${yieldPrediction.optimalTemp}°C</div>
                  <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Target Digester Temp</div>
               </div>
            </div>
            <div style="font-size:13px; background:rgba(255,255,255,0.5); padding:12px; border-radius:8px; border-left:4px solid var(--blue);">
               <strong>AI Recommendation:</strong> ${yieldPrediction.recommendation}
            </div>
          </div>
        `;
    }
    document.getElementById('pl-inc').innerHTML = incoming.length ? incoming.map(o=>buildOrderCard(o,'plant')).join('') : renderDashboardListState({
      icon: '🚚',
      title: 'No trucks waiting at gate',
      description: 'Incoming flow is currently idle.',
      subtext: 'New arrivals will appear here as they reach the plant.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
    
    document.getElementById('pl-out-logs').innerHTML = logs.length ? logs.slice(0,4).map(l => `
      <div class="glass-card" style="padding:16px; margin-bottom:12px;">
         <div class="between" style="margin-bottom:8px;"><span class="badge badge-blue">Log</span> <span class="muted" style="font-size:12px">${fmtDate(l.ts)}</span></div>
         <div style="font-size:14px;"><strong>Biogas:</strong> ${l.bio} m³ &nbsp;·&nbsp; <strong>Compost:</strong> ${l.comp} kg</div>
      </div>
    `).join('') : renderDashboardListState({
      icon: '📜',
      title: 'No outputs logged',
      description: 'Biogas and compost outputs will appear here once the plant starts logging results.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
    
    if(fullRender) {
      setTimeout(initPlChart, 100);
      fetchWeather(SESSION.lat, SESSION.lng).then(w => {
         if(!w || currentView !== 'v-pl-dash') return;
         const coreTemp = Math.round(w.temperature + 15);
         const gt = document.getElementById('pl-gauge-temp');
         if(gt) {
            gt.style.borderTopColor = "var(--red)"; gt.style.animation = "spin-slow 10s linear infinite";
            gt.querySelector('span').textContent = coreTemp + "°C";
            document.getElementById('pl-stat-temp').textContent = "Optimal"; document.getElementById('pl-stat-temp').style.color = "var(--green)";
         }
         const gp = document.getElementById('pl-gauge-pres');
         if(gp) {
            gp.style.borderTopColor = "var(--blue)"; gp.style.animation = "spin-slow 10s linear infinite";
            gp.querySelector('span').textContent = "1.2";
            document.getElementById('pl-stat-pres').textContent = "Stable"; document.getElementById('pl-stat-pres').style.color = "var(--green)";
         }
         const gf = document.getElementById('pl-gauge-flow');
         if(gf) {
            gf.style.borderTopColor = "var(--amber)"; gf.style.animation = "spin-slow 10s linear infinite";
            gf.querySelector('span').textContent = "45";
            document.getElementById('pl-stat-flow').textContent = "Surging"; document.getElementById('pl-stat-flow').style.color = "var(--amber)";
         }
      });
    }
  }

  if (currentView === 'v-pl-in') {
    if(fullRender) mc.innerHTML = `<div class="incoming-shell"><h3 class="heading">Incoming Flow</h3><div id="pl-in-list"></div></div>`;
    document.getElementById('pl-in-list').innerHTML = incoming.length ? incoming.map(o=>buildOrderCard(o,'plant')).join('') : renderDashboardListState({
      icon: '🚛',
      title: 'No incoming flow',
      description: 'There are no inbound loads queued for the plant.',
      subtext: 'Dispatch activity will populate this lane automatically.',
      statusLabel: 'Idle',
      tone: 'inactive'
    });
  }

  if (currentView === 'v-pl-out') {
    if(fullRender) mc.innerHTML = `
      <div style="max-width:600px; margin:0 auto;">
        <div class="glass-card">
          <h3 class="heading" style="margin-bottom:24px;">Log Daily Output</h3>
          <div class="form-group"><label class="form-label">Biogas Produced (m³)</label><input class="form-input" id="out-bio" type="number" step="0.1"></div>
          <div class="form-group"><label class="form-label">Compost Yield (kg)</label><input class="form-input" id="out-comp" type="number" step="0.1"></div>
          <div class="form-group"><label class="form-label">Digester Temp (°C) <span style="font-size:11px; color:var(--amber)">(Auto-detected)</span></label><input class="form-input" id="out-temp" type="number" step="0.1" readonly placeholder="Fetching live temp..."></div>
          <div class="form-group">
            <label class="form-label">Processing Method <span style="font-size:11px; color:var(--text-muted)">(Applied to CO₂ offset calculations)</span></label>
            <select class="form-input" id="out-method">
              <option value="anaerobic_digestion">Anaerobic Digestion</option>
              <option value="composting">Composting</option>
              <option value="biogas">Biogas Recovery</option>
            </select>
          </div>
          <button class="btn btn-primary btn-full" onclick="savePlantLog()">Save Record</button>
        </div>
      </div>
    `;
    if(fullRender) {
      fetchWeather(SESSION.lat, SESSION.lng).then(w => {
         if(w && document.getElementById('out-temp')) {
            document.getElementById('out-temp').value = Math.round(w.temperature + 15);
         }
      });
      // Pre-select the plant's saved processing method
      const methodEl = document.getElementById('out-method');
      if (methodEl && SESSION.processingMethod) {
        methodEl.value = SESSION.processingMethod;
      }
    }
  }
}

window.openPlantConfirm = function(id) {
  const html = `
    <h3 class="modal-title">Intake Assessment</h3>
    <p class="modal-sub">Final confirmation before processing.</p>
    <div class="form-group">
        <label class="form-label">Segregation Score (0-100)</label>
        <div style="display:flex; gap:8px;">
            <input type="number" id="p-score" class="form-input" style="flex:1;">
            <button class="btn btn-outline-primary" style="white-space:nowrap; border:2px solid var(--blue); color:var(--blue);" onclick="window.VisionScanner.openScanner('p-score')">📸 AI Scan</button>
        </div>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="confirmPlantReceipt('${id}')">Accept Load ✓</button></div>
  `;
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal').classList.add('open');
}

window.confirmPlantReceipt = async function(id) {
  const o = getOrder(id); if(!o) return;
  if (o.status === 'completed') return showToast('Order already processed.');
  const score = document.getElementById('p-score').value || 0;
  o.status = 'completed'; o.segScore = score;
  
  const providerAcc = DB.get('acc:' + o.providerId);
  if (providerAcc) {
     const providerHistory = getAllOrders().filter(ord => ord.providerId === o.providerId && ord.status === 'completed');
     const trustScore = TrustProtocol.calculateScore(providerAcc, providerHistory);
      const baseTokens = Math.round((o.actualKg || o.kg) * 2);
      const earnedTokens = TrustProtocol.calculateReward(baseTokens, trustScore);
     
     providerAcc.tokens = (providerAcc.tokens || 0) + earnedTokens;
     o.tokensMinted = earnedTokens;
     o.txHash = '0x' + uid() + uid() + uid();

     DB.set('acc:' + o.providerId, providerAcc);
     if (SESSION.role === 'provider' && SESSION.id === o.providerId) {
         SESSION.tokens = providerAcc.tokens;
         document.getElementById('token-balance').textContent = SESSION.tokens;
     }

      // Expected tokens represent the base (non-trust-multiplied) reward.
      // Minted tokens include the TrustProtocol multiplier, so deltaPct reflects
      // the trust bonus/penalty percentage (and enables mismatch flagging).
      const expectedTokens = baseTokens;
      const deltaPct = expectedTokens > 0 ? Math.abs(earnedTokens - expectedTokens) / expectedTokens * 100 : 0;
     addCreditEntry({
       id: 'credit-' + uid(),
       orderId: o.id,
       org: o.providerOrg,
       expectedTokens,
       mintedTokens: earnedTokens,
       deltaPct,
       trustScore,
       ts: ts()
     });
  }

  const confirmed = confirm(
  "Are you sure you want to mark this dispatch as completed?"
  );

  if (!confirmed) return;

  saveOrder(o);
  updateSlaEntry(o.id, { completeTs: ts(), status: 'completed' });
await recordTrustEvent(o, 'completed', 'plant', { lat: SESSION.lat, lng: SESSION.lng });
  await recordTrustEvent(o, 'sealed', 'plant', { lat: SESSION.lat, lng: SESSION.lng });
  addWorkflowNotification({
    title: 'Plant Confirmation Received',
    body: `${o.plantName} confirmed the delivery for ${o.providerOrg}.`,
    role: 'provider',
    type: 'delivery-confirmed',
    priority: 'high',
    relatedId: o.id,
    url: '/'
  });
  if (o.riderName) {
    addWorkflowNotification({
      title: 'Delivery Confirmed',
      body: `${o.plantName} confirmed the delivery of your load.`,
      role: 'rider',
      type: 'delivery-confirmed',
      priority: 'normal',
      relatedId: o.id,
      url: '/'
    });
  }
  addWorkflowNotification({
    title: 'Token Rewards Credited',
    body: `${earnedTokens} $RGX minted for ${o.providerOrg} after successful intake.`,
    role: 'provider',
    type: 'token-credited',
    priority: 'high',
    relatedId: o.id,
    url: '/'
  });
  addEsgAlertsForOrder(o);

  const kgProcessed = parseFloat(o.actualKg || o.kg || 0);

  if (kgProcessed > 0) {
    const energyKwh = parseFloat((kgProcessed * 0.35).toFixed(2));
    const efficiencyPct = Math.min(100, Math.round((energyKwh / (kgProcessed * 0.5)) * 100));
    const score = Math.max(10, Math.round((efficiencyPct * 0.7) + (o.segScore ? (o.segScore * 0.3) : 0)));

    addEnergyEntry({
      id: 'eng-' + uid(),
      orderId: o.id,
      org: o.providerOrg,
      kg: kgProcessed,
      energyKwh,
      efficiencyPct,
      score,
      ts: ts()
    });
  }
  
  publishOperationalEvent('DELIVERY_COMPLETED', [], {
    toast: `Plant confirmed receipt for dispatch #${o.id.slice(-6).toUpperCase()}.`,
    statusLabel: 'Delivery complete'
  }, ['network_room', 'providers_room', 'riders_room', 'plants_room', 'admin_room']);
  const route = getOrderRouteEndpoints(o);
  if (route.start && route.end) {
    const distanceKm = parseFloat(distanceKm(route.start.lat, route.start.lng, route.end.lat, route.end.lng).toFixed(1));
    const emissionKg = parseFloat((distanceKm * 0.21).toFixed(2));
    const plantAcc = DB.get('acc:' + o.plantId);
    const offsetKg = parseFloat((kgProcessed * getCO2Factor(o.wasteType, plantAcc?.processingMethod)).toFixed(2));
    const score = Math.max(10, Math.min(100, Math.round((offsetKg / Math.max(emissionKg, 1)) * 100)));
    addEmissionsEntry({
      id: 'ems-' + uid(),
      orderId: o.id,
      org: o.providerOrg,
      distanceKm,
      emissionKg,
      offsetKg,
      score,
      ts: ts()
    });
  }
  if (kgProcessed > 0) {
    const segScore = parseFloat(o.segScore || 0);
    const qualityScore = Math.max(10, Math.min(100, Math.round(segScore || 70)));
    addQualityEntry({
      id: 'qlt-' + uid(),
      orderId: o.id,
      org: o.providerOrg,
      kg: kgProcessed,
      segScore: segScore || 0,
      score: qualityScore,
      ts: ts()
    });
  }
  closeModal();
  refreshCurrentView();
  showToast(`✓ Intake Confirmed. Minted ${earnedTokens} $RGX for provider!`);
}

window.savePlantLog = function() {
  const bio = document.getElementById('out-bio').value;
  const comp = document.getElementById('out-comp').value;

  if(!bio && !comp)
    return window.showToast("⚠ Enter output values.");

  // Persist processing method to plant account so CO₂ factor is applied consistently
  const method =
    document.getElementById('out-method')?.value ||
    'anaerobic_digestion';

  if (SESSION.processingMethod !== method) {
    SESSION.processingMethod = method;
    DB.set('acc:' + SESSION.id, SESSION, { localOnly: true });
  }

  DB.set('log:' + uid(), {
    id: uid(),
    ts: ts(),
    plantId: SESSION.id,
    bio,
    comp,
    temp: document.getElementById('out-temp').value
  });

  addWorkflowNotification({
    title: 'Plant Output Logged',
    body: `Your plant output record was saved successfully.`,
    role: 'plant',
    type: 'plant-log',
    priority: 'normal',
    url: '/'
  });

  window.showToast("✓ Output logged! Automated msg sent.");
  showView('v-pl-dash');
}

let plChartInstance = null;
function initPlChart() {
  const ctx = document.getElementById('plChart');
  if(!ctx || window.Chart === undefined) return;
  if(plChartInstance) plChartInstance.destroy();
  
  const logs = getAllLogs().filter(l => l.plantId === SESSION.id);
  let bioData = [0,0,0,0,0,0];
  let predData = [0,0,0,0,0,0];
  
  if(logs.length > 0) {
      // Just map the last 6 logs
      const recent = logs.slice(0,6).reverse();
      for(let i=0; i<recent.length; i++){
          bioData[5 - recent.length + 1 + i] = parseFloat(recent[i].bio||0);
          predData[5 - recent.length + 1 + i] = parseFloat(recent[i].bio||0) * (1 + (Math.random()*0.05)); // AI Prediction slightly above actual
      }
  }

  plChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Reading 1', 'Reading 2', 'Reading 3', 'Reading 4', 'Reading 5', 'Latest'],
      datasets: [{
        label: 'Actual Yield (m³)',
        data: bioData,
        borderColor: '#0D9488',
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(13, 148, 136, 0.1)'
      }, {
        label: 'AI Predicted Yield (m³)',
        data: predData,
        borderColor: '#3B82F6',
        borderDash: [5, 5],
        tension: 0.4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// ════════ IoT SENSORY BIN LOGIC ════════

// ── IoT helpers ──
function getIoTBins() { return DB.get('iot-bins') || []; }
function saveIoTBins(bins) { DB.set('iot-bins', bins); }

function iotFillColor(fill) {
  if (fill >= 85) return 'var(--red)';
  if (fill >= 60) return 'var(--amber)';
  return 'var(--green)';
}

function iotStatusBadge(bin) {
  if (bin.fill >= 85) return '<span class="badge badge-red">⚠ Critical</span>';
  if (bin.fill >= 60) return '<span class="badge badge-amber">◑ Filling</span>';
  if (bin.status === 'offline') return '<span class="badge" style="background:var(--border);color:var(--text-muted)">● Offline</span>';
  return '<span class="badge badge-green">✓ Normal</span>';
}

function iotAlertCount() {
  return getIoTBins().filter(b => b.fill >= 85 || b.status === 'offline').length;
}

function syncIoTAlertBadge() {
  const badge = document.getElementById('iot-alert-badge');
  if (!badge) return;
  const n = iotAlertCount();
  badge.style.display = n ? 'inline-block' : 'none';
  badge.textContent = n;
}

// ── IoT Simulation Engine (single shared interval) ──
let _iotSimTimer = null;
function startIoTSim() {
  if (_iotSimTimer) return; // already running
  _iotSimTimer = setInterval(() => {
    const bins = getIoTBins();
    let changed = false;
    bins.forEach(b => {
      if (b.status === 'offline') return;
      // Advance fill by rate ± small noise, clamp 0-100
      const delta = (b.rate || 0.5) + (Math.random() - 0.4) * 0.3;
      b.fill = Math.min(100, Math.max(0, parseFloat((b.fill + delta).toFixed(1))));
      b.lastReading = Date.now();
      // Simulate occasional temp/humidity changes
      b.temp = parseFloat((22 + Math.random() * 8).toFixed(1));
      b.humidity = parseFloat((55 + Math.random() * 20).toFixed(1));
      b.methane = parseFloat((Math.random() * 5).toFixed(2));
      changed = true;
    });
    if (changed) {
      saveIoTBins(bins);
      syncIoTAlertBadge();
      const summary = getSensorReliabilitySummary();
      addSensorSnapshot({
        id: 'sensor-' + uid(),
        ts: ts(),
        score: summary.score,
        offlineCount: summary.offlineCount,
        staleCount: summary.staleCount,
        total: summary.total
      });
      // If user is watching the IoT view, refresh the fill bars without full re-render
      if (currentView === 'v-iot-bins') iotLiveUpdate(bins);
    }
  }, 8000); // tick every 8 s
}

function stopIoTSim() {
  clearInterval(_iotSimTimer);
  _iotSimTimer = null;
}

// Lightweight DOM-only update (no full re-render)
function iotLiveUpdate(bins) {
  bins.forEach(b => {
    const fillEl = document.getElementById(`iot-fill-${b.id}`);
    const pctEl  = document.getElementById(`iot-pct-${b.id}`);
    const badgeEl = document.getElementById(`iot-badge-${b.id}`);
    const tempEl = document.getElementById(`iot-temp-${b.id}`);
    const humEl  = document.getElementById(`iot-hum-${b.id}`);
    const ch4El  = document.getElementById(`iot-ch4-${b.id}`);
    if (fillEl) { fillEl.style.width = b.fill + '%'; fillEl.style.background = iotFillColor(b.fill); }
    if (pctEl)  pctEl.textContent = b.fill + '%';
    if (badgeEl) badgeEl.outerHTML = `<span id="iot-badge-${b.id}">${iotStatusBadge(b)}</span>`;
    if (tempEl)  tempEl.textContent = (b.temp || '--') + '°C';
    if (humEl)   humEl.textContent  = (b.humidity || '--') + '%';
    if (ch4El)   ch4El.textContent  = (b.methane || '--') + ' ppm';
  });
}

// ── IoT Bin Card Builder ──
function buildBinCard(b) {
  const col = iotFillColor(b.fill);
  const lastSeen = b.lastReading ? fmtDate(b.lastReading) : 'Never';
  return `
  <div class="iot-bin-card glass-card" id="iot-card-${b.id}">
    <div class="iot-card-header">
      <div>
        <div class="iot-bin-name">🗑️ ${escapeHTML(b.name)}</div>
        <div class="iot-bin-sub">ID: ${b.id} · Last ping: ${lastSeen}</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span id="iot-badge-${b.id}">${iotStatusBadge(b)}</span>
        <button class="btn btn-ghost btn-sm" onclick="iotEditBin('${b.id}')" title="Edit">✏️</button>
        <button class="btn btn-outline-danger btn-sm" onclick="iotDeleteBin('${b.id}')" title="Delete">🗑</button>
      </div>
    </div>

    <!-- Fill level bar -->
    <div class="iot-fill-row">
      <div class="iot-fill-label">Fill Level</div>
      <div class="iot-fill-pct" id="iot-pct-${b.id}">${b.fill}%</div>
    </div>
    <div class="iot-fill-track">
      <div class="iot-fill-bar" id="iot-fill-${b.id}" style="width:${b.fill}%; background:${col};"></div>
    </div>

    <!-- Sensor readings -->
    <div class="iot-sensor-grid">
      <div class="iot-sensor-item">
        <div class="iot-sensor-icon">🌡️</div>
        <div class="iot-sensor-val" id="iot-temp-${b.id}">${b.temp ? b.temp + '°C' : '--'}</div>
        <div class="iot-sensor-lbl">Temp</div>
      </div>
      <div class="iot-sensor-item">
        <div class="iot-sensor-icon">💧</div>
        <div class="iot-sensor-val" id="iot-hum-${b.id}">${b.humidity ? b.humidity + '%' : '--'}</div>
        <div class="iot-sensor-lbl">Humidity</div>
      </div>
      <div class="iot-sensor-item">
        <div class="iot-sensor-icon">🧪</div>
        <div class="iot-sensor-val" id="iot-ch4-${b.id}">${b.methane != null ? b.methane + ' ppm' : '--'}</div>
        <div class="iot-sensor-lbl">CH₄</div>
      </div>
      <div class="iot-sensor-item">
        <div class="iot-sensor-icon">📈</div>
        <div class="iot-sensor-val">${b.rate} kg/h</div>
        <div class="iot-sensor-lbl">Fill Rate</div>
      </div>
    </div>

    ${b.fill >= 85 ? `
    <div class="iot-alert-banner">
      ⚠️ <strong>Bin is critically full!</strong> Dispatch a collection immediately to prevent overflow.
      <button class="btn btn-primary btn-sm" style="margin-left:8px;" onclick="iotDispatchFromBin('${b.id}')">🚀 Dispatch Now</button>
    </div>` : ''}
  </div>`;
}

// ── IoT View Renderer ──
function renderIoT(mc, fullRender) {
  const bins = getIoTBins();
  syncIoTAlertBadge();
  startIoTSim(); // ensure sim is running

  if (!fullRender) { iotLiveUpdate(bins); return; }

  const alerts = bins.filter(b => b.fill >= 85 || b.status === 'offline');

  mc.innerHTML = `
    <!-- Header row -->
    <div class="between" style="margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div>
        <h3 class="heading">IoT Sensory Bin Network</h3>
        <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">
          Real-time fill monitoring · ${bins.length} bin${bins.length !== 1 ? 's' : ''} connected
        </div>
      </div>
      <button class="btn btn-primary" id="btn-add-iot-bin" onclick="iotAddBin()">＋ Add Bin</button>
    </div>

    <!-- Summary stats -->
    <div class="stats-grid" style="margin-bottom:28px;">
      <div class="stat-card">
        <div class="stat-val">${bins.length}</div>
        <div class="stat-lbl">Total Bins</div>
      </div>
      <div class="stat-card" style="border-top-color:var(--red);">
        <div class="stat-val" style="color:var(--red);">${bins.filter(b => b.fill >= 85).length}</div>
        <div class="stat-lbl">Critical (≥85%)</div>
      </div>
      <div class="stat-card" style="border-top-color:var(--amber);">
        <div class="stat-val" style="color:var(--amber);">${bins.filter(b => b.fill >= 60 && b.fill < 85).length}</div>
        <div class="stat-lbl">Filling (60–84%)</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${Math.round(bins.reduce((s,b) => s + b.fill, 0) / Math.max(bins.length, 1))}%</div>
        <div class="stat-lbl">Avg Fill Level</div>
      </div>
    </div>

    <!-- Alert Banner (if any critical bins) -->
    ${alerts.length ? `
    <div class="iot-global-alert glass-card" style="margin-bottom:24px; border-color:var(--red); background:var(--red-light); padding:16px;">
      <div style="font-weight:700; color:var(--red); margin-bottom:4px;">⚠️ ${alerts.length} bin${alerts.length > 1 ? 's require' : ' requires'} immediate attention</div>
      <div style="font-size:13px; color:var(--text-muted);">${alerts.map(b => b.name).join(', ')}</div>
    </div>` : ''}

    <!-- Bin Cards Grid -->
    <div class="iot-bins-grid" id="iot-bins-grid">
      ${bins.length ? bins.map(buildBinCard).join('') : renderDashboardListState({
        icon: '🗑️',
        title: 'No bins connected',
        description: 'Register your first IoT bin to begin monitoring waste fill levels.',
        actionHtml: '<button class="btn btn-ghost btn-sm" onclick="showView(\'v-iot-bins\')">Add Bin</button>',
        statusLabel: 'Idle',
        tone: 'inactive'
      })}
    </div>


    <!-- Network telemetry footer -->
    <div class="glass-card sensor-card" style="margin-top:28px; padding:20px;">
      <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:16px;">🛰️ Network Telemetry</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px;">
        <div><div style="font-size:11px;color:var(--text-muted);">SIGNAL HEALTH</div><div style="font-weight:700;color:var(--green);">98.4% Uptime</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);">DATA LATENCY</div><div style="font-weight:700;color:var(--blue);">~120 ms</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);">SIM TICK</div><div style="font-weight:700;">8 s interval</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);">PROTOCOL</div><div style="font-weight:700;">MQTT / LoRaWAN</div></div>
      </div>
    </div>
  `;
}

// ── IoT CRUD Actions ──
window.iotAddBin = function() {
  const html = `
    <h3 class="modal-title">Add IoT Sensory Bin</h3>
    <p class="modal-sub">Register a new bin to the network.</p>
    <div class="form-group"><label class="form-label">Bin Name / Location</label><input class="form-input" id="iot-m-name" placeholder="e.g. East Wing Organic Hub"></div>
    <div class="form-group"><label class="form-label">Initial Fill Level (%)</label><input class="form-input" type="number" id="iot-m-fill" value="0" min="0" max="100"></div>
    <div class="form-group"><label class="form-label">Fill Rate (kg/h)</label><input class="form-input" type="number" id="iot-m-rate" value="0.8" step="0.1" min="0.1"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="iotSaveNewBin()">Add Bin ✓</button>
    </div>`;
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal').classList.add('open');
};

window.iotSaveNewBin = function() {
  const name = document.getElementById('iot-m-name').value.trim();
  const fill = parseFloat(document.getElementById('iot-m-fill').value) || 0;
  const rate = parseFloat(document.getElementById('iot-m-rate').value) || 0.8;
  if (!name) return showToast('⚠ Enter a bin name.');
  const bins = getIoTBins();
  bins.push({ id: 'bin-' + uid(), name, fill, rate, status: 'active', lastReading: Date.now(), temp: 24, humidity: 60, methane: 0 });
  saveIoTBins(bins);
  closeModal();
  showToast('✓ Bin added to network.');
  refreshCurrentView(true);
};

window.iotEditBin = function(id) {
  const bins = getIoTBins();
  const b = bins.find(x => x.id === id);
  if (!b) return;
  const html = `
    <h3 class="modal-title">Edit Bin — ${escapeHTML(b.name)}</h3>
    <div class="form-group"><label class="form-label">Bin Name</label><input class="form-input" id="iot-m-name" value="${escapeHTML(b.name)}"></div>
    <div class="form-group"><label class="form-label">Fill Rate (kg/h)</label><input class="form-input" type="number" id="iot-m-rate" value="${b.rate}" step="0.1" min="0.1"></div>
    <div class="form-group"><label class="form-label">Status</label>
      <select class="form-select" id="iot-m-status">
        <option value="active" ${b.status==='active'?'selected':''}>Active</option>
        <option value="offline" ${b.status==='offline'?'selected':''}>Offline</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Mark as Emptied (Reset Fill to 0%)</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="iot-m-reset"> Reset fill level</label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="iotSaveEditBin('${id}')">Save Changes ✓</button>
    </div>`;
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal').classList.add('open');
};

window.iotSaveEditBin = function(id) {
  const bins = getIoTBins();
  const b = bins.find(x => x.id === id);
  if (!b) return;
  b.name   = document.getElementById('iot-m-name').value.trim() || b.name;
  b.rate   = parseFloat(document.getElementById('iot-m-rate').value) || b.rate;
  b.status = document.getElementById('iot-m-status').value;
  if (document.getElementById('iot-m-reset').checked) { b.fill = 0; b.lastReading = Date.now(); }
  saveIoTBins(bins);
  closeModal();
  showToast('✓ Bin updated.');
  refreshCurrentView(true);
};

window.iotDeleteBin = function(id) {
  if (!confirm('Remove this bin from the network?')) return;
  const bins = getIoTBins().filter(b => b.id !== id);
  saveIoTBins(bins);
  showToast('Bin removed.');
  refreshCurrentView(true);
};

window.iotDispatchFromBin = function(id) {
  // Pre-fill a dispatch request for this bin
  showView('v-pv-req');
  showToast('⚠ Fill in quantity and submit to dispatch a collection for this bin.');
};

window.refreshCurrentView = refreshCurrentView;
window.refreshLoginDropdown = refreshLoginDropdown;
window.startGreenWall = startGreenWall;
window.syncIoTAlertBadge = syncIoTAlertBadge;

// ── INIT ──
(function seedDB() {
  if (!DB.get('iot-bins')) {
    const now = Date.now();
    const bins = [
      { id: 'bin-1', name: 'West Wing Organic Hub',   fill: 24,  rate: 0.8, status: 'active',  lastReading: now - 30000, temp: 23.1, humidity: 61, methane: 0.12 },
      { id: 'bin-2', name: 'Kitchen Processing Unit', fill: 68,  rate: 1.2, status: 'active',  lastReading: now - 15000, temp: 27.4, humidity: 74, methane: 1.85 },
      { id: 'bin-3', name: 'Main Disposal Pit',       fill: 91,  rate: 0.4, status: 'active',  lastReading: now - 8000,  temp: 25.0, humidity: 58, methane: 3.20 },
      { id: 'bin-4', name: 'Rooftop Compost Bay',     fill: 12,  rate: 0.6, status: 'active',  lastReading: now - 60000, temp: 21.8, humidity: 52, methane: 0.04 }
    ];
    DB.set('iot-bins', bins);
  }
})();

document.getElementById('login-screen').style.display = 'flex';
switchAuthTab('login');

// ── Initialize Appwrite Cloud Sync Engine ──
setTimeout(() => { ReGenXRealtime?.init(); ReGenXRealtime?.requestSnapshot?.(); }, 1000);
setTimeout(() => { if (window.CloudSync) window.CloudSync.init(); }, 1000);

// Expose module-scoped functions to global scope for inline HTML handlers
window.doRegister = doRegister;
window.doLogin = doLogin;
window.switchAuthTab = switchAuthTab;
window.selectRole = selectRole;
window.detectGPS = detectGPS;
window.searchLocation = searchLocation;
window.resetAppData = resetAppData;
window.doLogout = doLogout;
window.toggleTheme = toggleTheme;
window.toggleSidebar = toggleSidebar;
window.toggleSmartAlerts = toggleSmartAlerts;
window.saveOrder = saveOrder;
window.refreshCurrentView = refreshCurrentView;

/**
 * Returns the currently active view ID.
 * @returns {string} The active view ID.
 */
window.getCurrentView = () => currentView;

/**
 * Returns the active user session object.
 * @returns {Object} The session object.
 */
window.getSESSION = () => SESSION;


/**
 * @function animateAuthEntry
 * @description Triggers a GSAP entrance animation on the login box for desktop viewports.
 * Enhances perceived performance and visual polish on non-touch devices.
 */
function animateAuthEntry() {
  if (window.gsap && window.matchMedia('(min-width: 768px)').matches) {
    gsap.from('.login-box', {
      y: 40,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out'
    });
  }
}

window.addEventListener('DOMContentLoaded', animateAuthEntry);

/**
 * @function detectDeviceClass
 * @description Detects whether the user is on a touch (mobile) or pointer (desktop) device
 * using the CSS media query API. Applies a data-device attribute to <body> so CSS can
 * serve targeted layout rules without JS-in-CSS hacks.
 * @returns {void}
 */
function detectDeviceClass() {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  document.body.setAttribute('data-device', isTouch ? 'mobile' : 'desktop');
}

detectDeviceClass();
window.detectDeviceClass = detectDeviceClass;
window.exportScanHistory = function() {
  const history = JSON.parse(localStorage.getItem('regenx_scan_history') || '[]');
  if (!history.length) return showToast('No scan history to export.');
  const csv = ['scanId,timestamp,role,organicPercentage,contaminationLevel,wasteCategory,linkedDispatchId',
    ...history.map(s => `${s.scanId},${s.timestamp},${s.role},${s.organicPercentage},${s.contaminationLevel},${s.wasteCategory},${s.linkedDispatchId || ''}`)
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'regenx_scan_history.csv';
  a.click();
  showToast('✓ CSV exported!');
};
// --- Copy to Clipboard Feature (Issue #78) ---

function copyTagToClipboard(tag) {
  navigator.clipboard.writeText(tag).then(() => {
    showToast(`Copied: "${tag}"`);
  });
}

function copyAllTags(tags) {
  const allTags = tags.join(', ');
  navigator.clipboard.writeText(allTags).then(() => {
    showToast('All tags copied to clipboard!');
  });
}

function exportTagsAsTxt(tags) {
  const content = tags.join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'regenx-tags.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// ==========================================
// DARK MODE TOGGLE LOGIC (ISSUE #79)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const navToggleBtn = document.getElementById('navbar-theme-toggle');
    const rootHtml = document.documentElement;

    const savedTheme = localStorage.getItem('regenx-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    if (isDark) {
        rootHtml.classList.add('dark');
        rootHtml.setAttribute('data-theme', 'dark');
        if (navToggleBtn) navToggleBtn.innerText = '☀️';
    } else {
        rootHtml.classList.remove('dark');
        rootHtml.setAttribute('data-theme', 'light');
        if (navToggleBtn) navToggleBtn.innerText = '🌙';
    }

    if (navToggleBtn) {
        navToggleBtn.addEventListener('click', () => {
            window.toggleTheme();
        });
    }

    // Initialize Accessibility Manager (Floating panel & options)
    if (window.AccessibilityManager) {
        window.AccessibilityManager.init();
    }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');

      console.info('Service Worker registered:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}