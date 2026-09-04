// Service Worker para Finanças Familiar
const CACHE_NAME = 'financas-familiar-v1';
const OFFLINE_URL = '/offline.html';

// Assets essenciais pré-armazenados no cache durante a instalação
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
];

// Instalação: armazena página offline e assets estruturais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Ativação: limpa caches de versões anteriores e assume o controle imediatamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: intercepta requisições aplicando regras de segurança estritas
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignora requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ignora esquemas não-HTTP (ex: extensões de navegador)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Bypass estrito (Network-Only): nunca armazena requisições de API financeira em cache
  if (
    url.pathname.startsWith('/api') ||
    url.port === '3001' ||
    url.hostname.includes('backend')
  ) {
    return;
  }

  // 1. Navegação de páginas (Network-First com fallback para offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // 2. Assets estáticos visuais (ícones e favicons: Cache-First)
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/logo.png'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Demais requisições de assets ou scripts: busca da rede normalmente
  return;
});
