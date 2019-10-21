// Service worker logic
const version = 3;

// List all assets that should be in cache all time
const assets = [
    self.registration.scope,
    'build/app.css',
    'build/app.js',
];

const cachePrefix = 'mysite-v';

const cacheName = cachePrefix + version;

const cacheNameStatic = cacheName + '-static';
const cacheNameDynamic = cacheName + '-dynamic';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheNameStatic).then(function(cache) {
            return cache.addAll(assets).then(function() {
                // Be careful with skipWaiting, as client will directly use new SW but started to load on old version
                self.skipWaiting();
            });
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (curCacheName) {
                    // Return true if you want to remove this cache,
                    // but remember that caches are shared across the whole origin
                    return curCacheName.startsWith(cachePrefix) && !curCacheName.startsWith(cacheName);
                }).map(function (curCacheName) {
                    return caches.delete(curCacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request).then(function (response) {
            if (response) {
                // Content is in Cache, use it
                console.log('Serves from cache: '+event.request.url);
                return response;
            }

            // No content in cache, fetch it
            // Open cache at same time in order to save it too
            return Promise.all([
                fetch(event.request),
                caches.open(cacheNameDynamic)
            ]).then(function(rets) {
                const response = rets[0];
                const cache = rets[1];

                console.log('Fetches from server and added on cache: '+event.request.url);

                // Save it in cache for later
                cache.put(event.request, response.clone());

                // Return it to the client
                return response;
            });
        })
    );
});