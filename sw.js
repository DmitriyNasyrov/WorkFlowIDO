// EduFlow Service Worker v1
// Кэширует оболочку приложения для работы офлайн и быстрого запуска

const CACHE = 'eduflow-v1';
const SHELL = [
  '/',
  '/index.html',
];

// Установка: кэшируем оболочку
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Запросы: сначала сеть, при ошибке — кэш (для API всегда только сеть)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase API — всегда через сеть, никогда не кэшируем
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
    return; // браузер сам делает запрос
  }

  // CDN ресурсы (Supabase JS, шрифты) — сначала кэш, потом сеть
  if (url.hostname.includes('jsdelivr') || url.hostname.includes('googleapis')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Основной HTML — Network First (всегда свежая версия если есть сеть)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request).then(c => c || caches.match('/')))
  );
});
