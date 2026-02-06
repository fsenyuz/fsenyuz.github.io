const CACHE_NAME = 'divine-v20-final'; // Versiyon kontrolü
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
  // Veri dosyalarını zorla cache'liyoruz (Offline garantisi)
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
        console.log('[SW] Divine cache yükleniyor... 💾');
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

// 3. İSTEKLERİ YAKALA (Stale-While-Revalidate Benzeri Strateji)
// Önce cache'ten ver, sonra arka planda yenisini kontrol et.
self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini ve kendi domainimizi cache'le
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Chatbot (POST) isteklerini cache'leme, sunucuya gitmeli
  if (event.request.url.includes('/chat')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      // Cache'te varsa hemen onu döndür (Hız!)
      if (cachedResponse) {
          // Ama arka planda yenisi var mı diye bak ve cache'i güncelle (Sessiz güncelleme)
          fetch(event.request).then(networkResponse => {
              if(networkResponse && networkResponse.status === 200) {
                  cache.put(event.request, networkResponse.clone());
              }
          }).catch(() => {}); // Offline ise hata verme, zaten cache'ten döndük
          
          return cachedResponse;
      }

      // Cache'te yoksa internetten çek
      return fetch(event.request);
    })
  );
});
