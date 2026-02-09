/**
 * Yahtzeeeee Service Worker
 * Handles offline caching + push notifications
 */

const CACHE_NAME = 'yaht-v3';
const STATIC_ASSETS = [
    '/projects/yaht/bonus-images/dolly.png',
    '/projects/yaht/bonus-images/jlo.png',
    '/projects/yaht/bonus-images/menage.png',
    '/projects/yaht/bonus-images/shawshank.png',
    '/projects/yaht/bonus-images/single-dot-yaht.png',
    '/projects/yaht/icon-192.png',
    '/projects/yaht/icon-512.png',
];

// Install — only cache images (static assets that rarely change)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate — delete ALL old caches immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — NETWORK FIRST for HTML/JS, cache-first only for images
self.addEventListener('fetch', (event) => {
    // Never cache Supabase or CDN calls
    if (event.request.url.includes('supabase.co')) return;
    if (event.request.url.includes('cdn.jsdelivr.net')) return;

    // Images: cache-first (they don't change)
    if (event.request.url.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                return cached || fetch(event.request).then(response => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // HTML, JS, CSS: NETWORK FIRST — always get latest, fall back to cache if offline
    event.respondWith(
        fetch(event.request).then(response => {
            if (response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => caches.match(event.request))
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
