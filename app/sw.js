/* Óptima Reservas · trabaja sin internet.
   La página se pide primero a internet (así siempre llega la versión nueva) y,
   si no hay conexión, se abre la copia guardada. Íconos y fuentes salen de la copia. */
const CACHE = 'optima-v3.3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function saveCopy(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    // Internet primero, pero si la señal está lenta (más de 3 s) se abre la copia guardada
    e.respondWith(new Promise(resolve => {
      let done = false;
      const finish = r => { if (!done && r) { done = true; resolve(r); } };
      const net = fetch(req).then(res => { if (res.ok) saveCopy('./index.html', res); return res; });
      const timer = setTimeout(() => { caches.match('./index.html').then(finish); }, 3000);
      net.then(res => { clearTimeout(timer); finish(res); })
         .catch(() => { clearTimeout(timer); caches.match('./index.html').then(c => finish(c || Response.error())); });
    }));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const fonts = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (sameOrigin || fonts) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => saveCopy(req, res))));
  }
});
