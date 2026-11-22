const PREFIX = 'finview-';
const CACHE = PREFIX + 'v1.5.0';
const SHARE = 'finview-share';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
// 只刪除本 APP 自己的舊快取（保留分享暫存），不影響同網址下其他 APP
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== SHARE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 手機「分享 → 財經觀點庫」：先把檔案暫存，再打開新增頁
  if (e.request.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const cache = await caches.open(SHARE);
        for (const k of await cache.keys()) await cache.delete(k);
        let i = 0;
        for (const f of fd.getAll('files')) {
          if (!(f instanceof File)) continue;
          await cache.put(new Request('./share-inbox/' + (i++)), new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'shared'), 'x-lm': String(f.lastModified || Date.now()) } }));
        }
      } catch (err) {}
      return Response.redirect(new URL('./index.html#/new/share', self.registration.scope).href, 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
