const CACHE='paraiso-pilot-v4';const ASSETS=['/','/app.js','/club.css','/pilot.css','/escudo.png','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('paraiso-pilot-')&&k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==location.origin||e.request.method!=='GET')return;if(!ASSETS.includes(u.pathname)&&e.request.mode!=='navigate')return;e.respondWith(fetch(e.request).catch(async()=>await caches.match(e.request.mode==='navigate'?'/':e.request)||Response.error()));});
self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  event.waitUntil(self.registration.showNotification(typeof data.title==='string'?data.title:'El Paraíso Deportes',{
    body:typeof data.body==='string'?data.body:'Tenés un nuevo aviso del club.',
    icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',
    tag:typeof data.id==='string'?data.id:undefined,
    data:{url:'/mi-cuenta#avisos'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const url=new URL('/mi-cuenta#avisos',self.location.origin).href;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
    if(existing){await existing.navigate(url);return existing.focus();}
    return self.clients.openWindow(url);
  })());
});
