// Client side logic
if ('serviceWorker' in navigator) {

    // Show the update button to the user and wait for a click on it
    var _reqUpdate = function () {
        return new Promise(function (resolve, reject) {
            const refreshButton = document.createElement('a');
            refreshButton.href = '#';
            refreshButton.className = 'refreshBut';
            refreshButton.innerText = 'Refresh';
            
            refreshButton.addEventListener('click', function(e) {
                resolve();
            });

            document.body.appendChild(refreshButton);
        });
    };

    // Call this function when an update is ready to show the button and request update
    var _updateReady = function (worker) {
        return _reqUpdate()
            .then(function () {
                // post message to worker to make him call skiWaiting for us
                worker.postMessage({
                    action: 'skipWaiting'
                });
            })
            .catch(() => {
                console.log('Rejected new version');
            });
    };

    // Track state change on worker and request update when ready
    var _trackInstalling = function (worker) {
        worker.addEventListener('statechange', () => {
            if (worker.state == 'installed') {
                _updateReady(worker);
            }
        });
    };

    navigator.serviceWorker.register('sw.js').then(function (reg) {
        // registration worked
        console.log('Registration succeeded. Scope is ' + reg.scope);

        if (!navigator.serviceWorker.controller) {
            return;
        }

        if (reg.waiting) {
            // There is another SW waiting, the user can switch
            _updateReady(reg.waiting);
            return;
        }

        if (reg.installing) {
            // There is another SW installing, listen to it to know when it's ready/waiting
            _trackInstalling(reg.installing);
            return;
        }

        // If an update if found later, track the installing too
        reg.addEventListener('updatefound', () => {
            _trackInstalling(reg.installing);
        });
    }).catch(function (error) {
        // registration failed
        console.log('Registration failed with ' + error);
    });

    var refreshing;
    // When skiwaiting is called, reload the page only once
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) {
            return;
        }
        refreshing = true;
        window.location.reload();
    });
};