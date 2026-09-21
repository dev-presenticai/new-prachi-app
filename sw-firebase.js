// Service Worker for New Prachi Medical Agencies PWA
// Provides offline capability and intelligent caching

const CACHE_VERSION = 'v1';
const CACHE_NAME = `prachi-pwa-${CACHE_VERSION}`;
const RUNTIME_CACHE = `prachi-runtime-${CACHE_VERSION}`;

// Assets to cache on install (shell)
const ASSETS_TO_CACHE = [
  '/',
  '/index-firebase.html',
  '/styles-firebase.css',
  '/app-firebase.js',
  '/firebase-config.js',
  '/firebase-auth.js',
  '/firebase-db.js',
  '/catalog.js',
  '/manifest.webmanifest',
  '/icon.svg'
];

// Install event - cache shell
self.addEventListener('install', event => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE.filter(url => url !== '/'));
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('Cache error:', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (Firebase, etc.)
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => response)
        .catch(() => {
          // Offline: return offline response for cross-origin
          return new Response('Offline - external service unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // Strategy for app shell files: cache first, fallback to network
  if (ASSETS_TO_CACHE.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then(response => {
              if (!response || response.status !== 200 || response.type === 'error') {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, responseToCache));
              return response;
            });
        })
        .catch(err => {
          console.error('Fetch error:', err);
          return caches.match(request);
        })
    );
    return;
  }

  // Default: network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE)
          .then(cache => cache.put(request, responseToCache));
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then(response => {
            if (response) {
              return response;
            }
            // Offline fallback for HTML pages
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/index-firebase.html');
            }
            return new Response('Offline - resource unavailable', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync for offline orders (when connection restored)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      syncOfflineOrders()
        .catch(err => {
          console.error('Background sync failed:', err);
          throw err; // Retry
        })
    );
  }
});

// Sync offline orders from localStorage to Firebase
async function syncOfflineOrders() {
  try {
    const clients = await self.clients.matchAll();

    if (clients.length === 0) {
      console.log('No clients available for sync');
      return;
    }

    // Send message to client to trigger sync
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_DATA',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}

// Message handler for client communication
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  }
});

// Periodic background sync (check for updates)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-updates') {
    event.waitUntil(checkForUpdates());
  }
});

async function checkForUpdates() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch('/index-firebase.html');

    if (response.ok) {
      const cachedResponse = await cache.match('/index-firebase.html');

      if (cachedResponse) {
        const cachedText = await cachedResponse.text();
        const newText = await response.text();

        if (cachedText !== newText) {
          console.log('App update available');

          // Notify all clients about update
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'APP_UPDATE_AVAILABLE',
              timestamp: Date.now()
            });
          });
        }
      }
    }
  } catch (error) {
    console.log('Update check failed:', error);
  }
}

// Push notification handler (future SMS/email notifications)
self.addEventListener('push', event => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from Prachi Medical',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: {
        ...data
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Prachi Medical', options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: event.notification.data
          });
          return;
        }
      }
      // Open app if not already open
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Log service worker status
console.log('Service Worker script loaded');
