/* 呐呐财记 Service Worker —— 页面优先走网络，保证更新立刻生效；离线时用缓存 */
const CACHE = 'nana-cai-shell-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api/')) return;

  // 页面导航：先网络（拿最新版本），失败再用缓存
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res && res.ok) {
          const c = res.clone();
          caches.open(CACHE).then((x) => x.put(e.request, c));
        }
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // 其他静态资源：缓存优先，后台更新
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.ok) { const c = res.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
