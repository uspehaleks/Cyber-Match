// Service Worker for PWA - Offline Functionality

const CACHE_NAME = 'ai-mechanic-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/offline.html'
];

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[ServiceWorker] Skip waiting');
                return self.skipWaiting();
            })
    );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[ServiceWorker] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Claiming clients');
                return self.clients.claim();
            })
    );
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // For API calls, use network only
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ error: 'Offline - API not available' }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // For navigation requests, use network first with cache fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match('/offline.html')
                        .then((response) => {
                            return response || caches.match('/index.html');
                        });
                })
        );
        return;
    }

    // For static assets, use cache first
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached response and update cache in background
                    fetch(request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(request, networkResponse);
                                    });
                            }
                        })
                        .catch(() => {
                            // Network failed, but we have cached response
                        });
                    
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetch(request)
                    .then((networkResponse) => {
                        // Cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(request, responseClone);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // If fetch fails, return offline page for HTML requests
                        if (request.headers.get('accept').includes('text/html')) {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Push Notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'AI-Механік';
    const options = {
        body: data.body || 'Нове повідомлення',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: data.primaryKey || 1,
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Відкрити'
            },
            {
                action: 'dismiss',
                title: 'Закрити'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Check if there's already a window open
                for (let client of windowClients) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Background Sync (for offline form submissions)
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Sync event:', event.tag);
    
    if (event.tag === 'sync-check-results') {
        event.waitUntil(
            // Sync logic here
            Promise.resolve()
        );
    }
});

// Message Handler
self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => {
                    return cache.addAll(event.data.urls);
                })
        );
    }
});
