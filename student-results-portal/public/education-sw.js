const CACHE='dropare-education-v1';
const SHELL=['/education','/education/student','/education/student/learn','/education/student/assess','/education/student/results','/education/student/timetable','/education/student/attendance','/education/student/notifications','/education/student/ai-tutor','/education/offline'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(url=>new Request(url,{credentials:'include'}))).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/')) return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{if(response.ok&&url.origin===self.location.origin){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy));}return response;}).catch(async()=>await caches.match(request)||await caches.match('/education/offline')));
    return;
  }
  if(url.origin===self.location.origin&&(/\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname)||url.pathname.startsWith('/_next/static/'))){
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy));}return response;})));
  }
});
self.addEventListener('message',event=>{
  if(event.data?.type==='CACHE_URL'&&event.data.url){event.waitUntil(caches.open(CACHE).then(cache=>cache.add(event.data.url)).catch(()=>{}));}
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
