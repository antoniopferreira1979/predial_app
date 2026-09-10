// Predial — service worker
// Guarda o "esqueleto" da app (HTML, manifesto, ícones e bibliotecas externas)
// para que a app continue a abrir mesmo sem ligação à internet.
// Os DADOS continuam a precisar de internet (vêm do Supabase) — isto só
// garante que a aplicação em si carrega offline.

const CACHE_NAME = 'predial-cache-v1';

const APP_SHELL = [
  './predial.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

// Bibliotecas de terceiros (CDN) de que a app depende para arrancar.
const EXTERNAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(APP_SHELL); } catch (e) { /* ignora falhas parciais */ }
    await Promise.all(EXTERNAL_ASSETS.map(async (url) => {
      try {
        const req = new Request(url, { mode: 'no-cors' });
        const res = await fetch(req);
        await cache.put(req, res);
      } catch (e) { /* sem internet no primeiro arranque — fica por cachear */ }
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    const networkFetch = fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => cached);
    // Mostra logo o que já está em cache (rápido, funciona offline);
    // atualiza a cache em segundo plano quando há internet.
    return cached || networkFetch;
  })());
});
