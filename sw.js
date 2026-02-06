const CACHE_NAME = 'divine-v21-sync'; // Versiyonu V21 yaptık (Cache temizlensin diye)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/favicon.ico',
  '/profile.jpg',
  '/icon-192.png',
  '/icon-512.png',
  // Veri dosyalarını zorla cache'liyoruz
  '/data/translations.json?v=20',
  '/data/experience.json?v=20',
  '/data/education.json?v=20',
  '/data/locations.json?v=20',
  '/data/repos.json?v=20'
];

// 1. KURULUM (Dosyaları hafızaya al)
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Beklemeden aktif ol
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Divine cache v21 yükleniyor... 💾');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// 2. AKTİF OLMA (Eski versiyonları temizle)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. İSTEKLERİ YAKALA (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  if (event.request.url.includes('/chat')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      if (cachedResponse) {
          fetch(event.request).then(networkResponse => {
              if(networkResponse && networkResponse.status === 200) {
                  cache.put(event.request, networkResponse.clone());
              }
          }).catch(() => {}); 
          return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// 4. BACKGROUND SYNC (Script.js'den gelen talebi karşıla)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-chat') {
        console.log('[SW] Background Sync tetiklendi: sync-chat');
        // Buraya normalde IndexedDB'den mesajları alıp sunucuya gönderme kodu gelir.
        // Şimdilik sadece log basıyoruz, böylece tarayıcı hata vermez.
        event.waitUntil(Promise.resolve());
    }
});
