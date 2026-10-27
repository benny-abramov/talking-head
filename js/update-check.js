// Offers a reload when the deployed files differ from the ones this page is running.
// Compares file contents, so there is no version number to maintain.
(function () {
  'use strict';

  if (!window.fetch || location.protocol === 'file:') return;

  const FILES = ['index.html', 'styles.css', 'js/visemes.js', 'js/looks.js', 'js/avatar.js', 'js/app.js', 'js/update-check.js'];
  const CHECK_EVERY = 5 * 60 * 1000;
  const MIN_GAP = 30 * 1000;

  const snapshot = (cache) =>
    Promise.all(FILES.map((f) => fetch(f, { cache }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(f + ' ' + r.status))))))
      .then((texts) => texts.join('\u0000'));

  let running = null;     // contents of the files this page loaded
  let dismissed = null;   // a version the user chose to ignore
  let lastCheck = 0;
  let banner = null;

  function check() {
    if (running == null || Date.now() - lastCheck < MIN_GAP) return;
    lastCheck = Date.now();
    snapshot('no-store')
      .then((latest) => { if (latest !== running && latest !== dismissed) show(latest); })
      .catch(() => { /* offline or mid-deploy: try again later */ });
  }

  function show(latest) {
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'update';
      banner.setAttribute('role', 'status');
      banner.innerHTML =
        '<span>A new version is available.</span>' +
        '<button type="button" class="update-reload">Reload</button>' +
        '<button type="button" class="update-close" aria-label="Dismiss">&times;</button>';
      banner.querySelector('.update-reload').addEventListener('click', reload);
      banner.querySelector('.update-close').addEventListener('click', () => {
        dismissed = banner.dataset.version;
        banner.hidden = true;
      });
      document.body.appendChild(banner);
    }
    banner.dataset.version = latest;
    banner.hidden = false;
  }

  function reload() {
    // Refresh the HTTP cache first: a plain reload may keep using cached scripts.
    Promise.all(FILES.map((f) => fetch(f, { cache: 'reload' }).catch(() => {})))
      .finally(() => location.reload());
  }

  // 'force-cache' returns the cached copies, i.e. what this page actually loaded.
  snapshot('force-cache')
    .then((s) => {
      running = s;
      setInterval(check, CHECK_EVERY);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    })
    .catch(() => {});
})();
