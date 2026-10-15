/* Moonlit Grove Phase 1: simple cache-first offline app shell, no third parties. */
const VERSION='moonlit-grove-shell-v4';
const APP_FILES=['./','./index.html','./manifest.webmanifest','./src/styles.css','./src/phase2.css','./src/phase2.js','./src/phase2-storage.js','./src/account-ui.js','./src/account-api.js','./src/account-config.js','./src/account.css','./src/app.js','./src/decor.js','./src/storage.js','./assets/grove-scene.svg','./assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(APP_FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('moonlit-grove-shell-')&&key!==VERSION).map(key=>caches.delete(key)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(hit=>hit||fetch(event.request)));
});
