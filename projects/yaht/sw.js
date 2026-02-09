/**
 * Yahtzeeeee Service Worker
 * Handles offline caching + push notifications
 */

const CACHE_NAME = 'yaht-v1';
const ASSETS = [
    '/projects/yaht/',
    '/projects/yaht/index.html',
    '/projects/yaht/multiplayer.js',
    '/projects/yaht/manifest.json',
    '/projects/yaht/bonus-images/dolly.png',
    '/projects/yaht/bonus-images/jlo.png',
    '/projects/yaht/bonus-images/menage.png',
    '/projects/yaht/bonus-images/shawshank.png',
    '/projects/yaht/bonus-images/single-dot-yaht.png',
];

// Install — cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
    // Don't cache Supabase API calls
    if (event.request.url.includes('supabase.co')) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).then(response => {
                // Cache new requests on the fly
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => caches.match('/projects/yaht/index.html'))
    );
});

// Push notifications — "It's your turn!"
self.addEventListener('push', (event) => {
    let data = { title: 'Yahtzeeeee!', body: 'It\'s your turn!', icon: '/projects/yaht/icon-192.png' };

    if (event.data) {
        try { data = { ...data, ...event.data.json() }; } catch(e) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon || '/projects/yaht/icon-192.png',
            badge: '/projects/yaht/icon-192.png',
            vibrate: [200, 100, 200],
            tag: 'yaht-turn',
            renotify: true,
            data: data.url || '/projects/yaht/',
        })
    );
});

// Notification click — open the game
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data || '/projects/yaht/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            // Focus existing tab if open
            for (const client of clients) {
                if (client.url.includes('/yaht') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open new tab
            return self.clients.openWindow(url);
        })
    );
});
