importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
    console.log(`Workbox Divine Loaded ⚡`);

    // Background Sync for Chat
    const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('chatQueue', {
        maxRetentionTime: 24 * 60 // Retry for 24 Hours
    });

    workbox.routing.registerRoute(
        ({url}) => url.href.includes('/chat'),
        new workbox.strategies.NetworkOnly({
            plugins: [bgSyncPlugin]
        }),
        'POST'
    );

    // Stale-While-Revalidate (Assets)
    workbox.routing.registerRoute(
        ({request}) => ['document', 'script', 'style', 'worker'].includes(request.destination) || request.url.endsWith('.json'),
        new workbox.strategies.StaleWhileRevalidate({ cacheName: 'fs-divine-assets' })
    );

    // Cache First (Images)
    workbox.routing.registerRoute(
        ({request}) => request.destination === 'image',
        new workbox.strategies.CacheFirst({
            cacheName: 'fs-images',
            plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
        })
    );
}