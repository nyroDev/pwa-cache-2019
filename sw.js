// Service worker logic
const version = 1;

const cachePrefix = 'mysite-v';

const cacheName = cachePrefix + version;

self.addEventListener('install', function(event) {
    // Be careful with skipWaiting, as client will directly use new SW but started to load on old version
    self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.open(cacheName).then(function (cache) {
            return cache.match(event.request).then(function (response) {
                if (response) {
                    // Content is in Cache, use it
                    console.log('Serves from cache: '+event.request.url);
                    return response;
                }

                // No content in cache, fetch it
                return fetch(event.request).then(function (response) {
                    console.log('Fetches from server and added on cache: '+event.request.url);

                    // Save it in cache for later
                    cache.put(event.request, response.clone());

                    // Return it to the client
                    return response;
                });
            });
        })
    );
});