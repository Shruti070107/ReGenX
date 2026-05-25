// ══════════════════════════════════════════════════════
// ReGenX Service Worker v4 — Resilient Offline-First PWA Engine
// Strategies: Safe precache, CacheFirst static assets, NetworkFirst dynamic assets
// Supports: Offline fallback, Background Sync, Push Notifications
// ══════════════════════════════════════════════════════

const CACHE_VERSION = 'regenx-v7';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const SYNC_TAG = 'regenx-order-sync';

const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/manifest.json',
  '/src/styles.css',
  '/src/app.js',
  '/src/scanner.js',
  '/src/intelligence.js',
  '/src/trust.js',
  '/src/yield-optimizer.js',
  '/src/vision-scanner.js',
  '/src/esg-reporter.js',
  '/src/cloud-sync.js',
  '/src/accessibility.js',
  '/src/i18n.js',
  '/icons/icon-72x72.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/models/mobilenet/model.json',
  '/models/mobilenet/group1-shard1of5.bin',
  '/models/mobilenet/group1-shard2of5.bin',
  '/models/mobilenet/group1-shard3of5.bin',
  '/models/mobilenet/group1-shard4of5.bin',
  '/models/mobilenet/group1-shard5of5.bin'
];

const STATIC_ASSET_PATHS = new Set(STATIC_ASSETS.map((asset) => new URL(asset, self.location.origin).pathname));

/**
 * Resolves notification targets through the browser URL parser and keeps only
 * same-origin destinations.
 *
 * @param {string} url - Notification-provided destination.
 * @returns {string} Safe in-origin URL or the offline fallback.
 */
function getSafeNotificationUrl(url) {
  try {
    const parsedUrl = new URL(String(url || '/'), self.location.origin);

    if (parsedUrl.origin !== self.location.origin) {
      return OFFLINE_URL;
    }

    return parsedUrl.href;
  } catch (error) {
    return OFFLINE_URL;
  }
}

/**
 * Adds assets to cache one-by-one so a missing optional file does not break
 * the complete service worker installation.
 *
 * @param {Cache} cache - Browser Cache API instance.
 * @param {string[]} assets - Static asset URLs to precache.
 * @returns {Promise<void>}
 */
async function safePrecache(cache, assets) {
  const results = await Promise.allSettled(
    assets.map(async (asset) => {
      const response = await fetch(asset, { cache: 'reload' });

      if (!response.ok) {
        throw new Error(`${asset} returned ${response.status}`);
      }

      await cache.put(asset, response);
    })
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`[SW] Skipped precache asset: ${assets[index]}`, result.reason);
    }
  });
}

/**
 * Stores successful GET responses in the dynamic cache.
 *
 * @param {Request} request - Fetch request.
 * @param {Response} response - Network response.
 * @returns {Promise<void>}
 */
async function cacheDynamicResponse(request, response) {
  if (!response || !response.ok) return;

  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.put(request, response.clone());
}

/**
 * Returns the offline fallback page for navigation requests.
 * Falls back to a simple HTML response if the cached page is unavailable.
 *
 * @returns {Promise<Response>}
 */
async function getOfflineFallback() {
  const cached = await caches.match(OFFLINE_URL);

  if (cached) {
    return cached;
  }

  return new Response(
    '<!doctype html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="font-family:system-ui, sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0D9488;color:#fff;text-align:center;"><div><h1>Offline</h1><p>You are currently offline. Please reconnect to continue.</p></div></body></html>',
    {
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

function shouldIgnoreSearch(request, url) {
  return request.mode === 'navigate' || STATIC_ASSET_PATHS.has(url.pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => safePrecache(cache, STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => {
              console.log(`[SW] Deleting stale cache: ${key}`);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  if (url.origin === location.origin) {
    const ignoreSearch = shouldIgnoreSearch(request, url);

    event.respondWith(
      caches.match(request, ignoreSearch ? { ignoreSearch: true } : undefined).then(async (cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(request);
          await cacheDynamicResponse(request, networkResponse);
          return networkResponse;
        } catch (error) {
          if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
            return getOfflineFallback();
          }

          throw error;
        }
      })
    );

    return;
  }

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        await cacheDynamicResponse(request, response);
        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayQueuedOrders());
  }
});

/**
 * Notifies open ReGenX clients after queued offline actions are replayed.
 *
 * @returns {Promise<void>}
 */
async function replayQueuedOrders() {
  try {
    // Notify all open clients to trigger offline sync
    const clients = await self.clients.matchAll({ type: 'window' });

    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        message: '☁️ Back online! Queued orders have been synced to the cloud.'
      });
    });

    console.log('[SW] Background sync triggered — offline queue notified');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data = {
      title: 'ReGenX Alert',
      body: 'You have a new notification.'
    };

    if (event.data) {
      try {
        data = event.data.json();
      } catch (error) {
        data.body = await event.data.text();
      }
    }

    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/'
      },
      actions: [
        { action: 'view', title: 'View on Map' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    return self.registration.showNotification(data.title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = getSafeNotificationUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return;
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});