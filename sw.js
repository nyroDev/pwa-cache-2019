// Service worker logic
const version = 7;

const LAYOUTURL = self.registration.scope + 'layout.html';
const layoutedUrls = 'page';

// List all assets that should be in cache all time
const assets = [
    self.registration.scope, // To add index.html as / URL
    LAYOUTURL,
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
            return cache.addAll(assets);
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

self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', function (event) {
    if (event.request.url.startsWith(self.registration.scope)) {
        // We're sur to be in our scope, maybe we should layout the request ?
        const localUrl = event.request.url.substr(self.registration.scope.length);
        if (localUrl.startsWith(layoutedUrls)) {
            const localJsonUrl = localUrl.replace('.html', '.json');

            event.respondWith(
                caches.open(cacheNameDynamic).then(function(cache) {
                    return cache.match(localJsonUrl);
                }).then(function(cachedResponse) {
                    if (cachedResponse) {
                        // We have a json cached, use it
                        return cachedResponse;
                    }

                    return Promise.all([
                        fetch(localJsonUrl),
                        caches.open(cacheNameDynamic),
                    ]).then(function(fetchRets) {
                        const response = fetchRets[0];
                        const cache = fetchRets[1];

                        // Save json response for later use
                        cache.put(localJsonUrl, response.clone());

                        return response;
                    });
                }).then(function(response) {
                    return Promise.all([
                        response.json(),
                        caches.open(cacheNameStatic).then(function(cache) {
                            return cache.match(LAYOUTURL)
                                .then(function(responseTpl) {
                                    return responseTpl.text().then(function(text) {
                                        return {
                                            response: responseTpl,
                                            text
                                        };
                                    });
                                });
                        })
                    ]);
                }).then(function(rets) {
                    const content = rets[0];
                    const tplObj = rets[1];
                    const html = tplObj.text
                        .replace('%TITLE%', content.title)
                        .replace('%CONTENT%', content.content)
                    ;
                
                    return new Response(html, {
                        status: 200,
                        type: tplObj.response.type,
                        headers: tplObj.response.headers  // To return exactly what's come from server
                    });
                })
            );

            return;
        }
    }

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