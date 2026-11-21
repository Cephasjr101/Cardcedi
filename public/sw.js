/* CardCedi service worker — static assets cache-first, HTML network-first.
   API calls are never intercepted. New versions activate immediately so a
   republish never serves stale HTML. */
const STATIC_CACHE = 'cardcedi-static-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  /* API traffic must always hit the server — never cache, never intercept */
  if (url.pathname.startsWith('/api/')) return

  /* HTML entries and navigations: network-first */
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request)),
    )
    return
  }

  /* Static assets: cache-first, populate on miss */
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((resp) => {
          if (resp.ok) {
            const copy = resp.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          }
          return resp
        }),
    ),
  )
})
