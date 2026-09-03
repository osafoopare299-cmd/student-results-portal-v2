const CACHE='dropare-education-static-v2';
const OFFLINE='/education/offline';

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.add(new Request(OFFLINE,{credentials:'omit'}))).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&!k.startsWith('dropare-education-resources-v2-')).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/'))return;

  // Never cache authenticated Education HTML. Navigation must come from the network.
  if(request.mode==='navigate'){
    if(url.pathname.startsWith('/education/')){
      event.respondWith(fetch(request,{cache:'no-store'}).catch(async()=>await caches.match(OFFLINE)));
    }
    return;
  }

  // Cache only immutable/static application assets. No API responses or private documents.
  if(url.pathname.startsWith('/_next/static/')||/\.(?:css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname)){
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
      if(response.ok&&response.type==='basic'){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
      }
      return response;
    })));
  }
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
