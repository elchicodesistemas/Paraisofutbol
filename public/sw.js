const CACHE = 'nexo-shell-v2';
const SHELL = ['./','./index.html','./styles.css','./config.js','./icon.svg','./manifest.webmanifest','./src/app.js','./src/core/ui.js','./src/core/validation.js','./src/core/store.js','./src/core/supabase.js','./src/core/records-view.js','./src/modules/index.js',...['auth','push','calendar','payments','documents','chat','agenda','qr','loyalty','admin'].map(id => `./src/modules/${id}/index.js`)];
SHELL.push('./icon-192.png','./icon-512.png','./src/core/id.js');
self.addEventListener('install',event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))));
self.addEventListener('activate',event => event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('nexo-shell-') && key !== CACHE).map(key => caches.delete(key)))),self.clients.claim()])));
self.addEventListener('fetch',event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Cache only explicit public application assets. Never cache API responses or files.
  const allowed = SHELL.some(path => new URL(path,self.registration.scope).pathname === url.pathname);
  if (!allowed) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {const copy = response.clone();event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request,copy)));}
    return response;
  }).catch(async () => (await caches.match(event.request)) || Response.error()));
});
self.addEventListener('push',event => {
  let data = {};try { data = event.data?.json() || {}; } catch { data = {body:event.data?.text()}; }
  event.waitUntil(self.registration.showNotification(data.title || 'Nexo',{body:data.body || 'Tenés una novedad.',icon:'./icon.svg'}));
});
self.addEventListener('notificationclick',event => {
  event.notification.close();event.waitUntil(self.clients.openWindow(self.registration.scope));
});
