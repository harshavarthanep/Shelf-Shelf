/* =========================================================================
   SHELF SHELF — NATIVE BRIDGE                       built by H24 Creationz
   =========================================================================
   Added to index.html when the apps are built, before any of Shelf's code.
   In a normal browser it does nothing (first check below), so the website
   behaves exactly as before.

   In the desktop app (Windows / Mac / Linux, Electron) and the Android app
   (Capacitor) it takes care of what a browser does differently:
     1. tells Shelf it is installed (no "Install app" card)
     2. no service worker (the app already holds every file)
     3. phone: your sites open in the phone's browser
     4. phone: reminders use the phone's notifications
     5. phone: Export Backup saves to Documents/Shelf Shelf, with Share
   ========================================================================= */
(function () {
  'use strict';
  var desk = window.shelfDesktop;
  var C = window.Capacitor;
  var isCap = !!(C && (typeof C.isNativePlatform === 'function' ? C.isNativePlatform() : C.isNative));
  if (!desk && !isCap) return;                       // plain browser: change nothing

  var VERSION = __SS_VERSION__, REPO = __SS_REPO__;
  var platform = desk ? desk.platform : (C.getPlatform ? C.getPlatform() : 'mobile');
  var owner = REPO.split('/')[0], name = REPO.split('/')[1] || '';
  window.SHELF_NATIVE = { platform: platform, version: VERSION, repo: REPO,
    download: 'https://' + owner.toLowerCase() + '.github.io/' + name + '/download.html' };
  document.documentElement.setAttribute('data-native', platform);

  /* 1. installed */
  try { Object.defineProperty(navigator, 'standalone', { configurable: true, get: function () { return true; } }); } catch (e) {}
  if (window.matchMedia) {
    var realMatch = window.matchMedia.bind(window);
    window.matchMedia = function (q) {
      if (/display-mode\s*:\s*standalone/i.test(String(q))) {
        var r = realMatch(q);
        return { matches: true, media: r.media, onchange: null, addListener: function () {}, removeListener: function () {},
          addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () { return false; } };
      }
      return realMatch(q);
    };
  }
  /* 2. no service worker */
  try { delete Navigator.prototype.serviceWorker; } catch (e) {}
  try { if ('serviceWorker' in navigator) Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: function () { return undefined; } }); } catch (e) {}

  if (desk) { if (desk.ready) desk.ready(); return; }  // desktop: Electron handles links, downloads and notifications

  var P = C.Plugins || {};
  function toast(msg, actionLabel, action) {
    function show() {
      var t = document.createElement('div');
      t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483647;max-width:92vw;' +
        'display:flex;gap:12px;align-items:center;background:#1c1c1e;color:#fff;font:500 14px/1.35 -apple-system,system-ui,sans-serif;padding:12px 14px;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.28)';
      var s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
      if (actionLabel && action) {
        var b = document.createElement('button'); b.textContent = actionLabel;
        b.style.cssText = 'background:#0a84ff;color:#fff;border:0;border-radius:9px;padding:7px 12px;font:600 13px -apple-system,system-ui,sans-serif';
        b.onclick = function () { action(); t.remove(); }; t.appendChild(b);
      }
      document.body.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.remove(); }, 6500);
    }
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  }

  /* 3. websites open in the phone's browser */
  function openOutside(href) { if (P.Browser) P.Browser.open({ url: href }).catch(function () { location.href = href; }); else location.href = href; }
  var realOpen = window.open;
  window.open = function (url) {
    try {
      var u = new URL(url, location.href);
      if (/^https?:$/.test(u.protocol) && u.origin !== location.origin) { openOutside(u.href); return null; }
      if (/^(mailto|tel):$/.test(u.protocol)) { location.href = u.href; return null; }
    } catch (e) {}
    return realOpen.apply(window, arguments);
  };
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download')) return;
    try {
      var u = new URL(a.href, location.href);
      if (/^https?:$/.test(u.protocol) && u.origin !== location.origin) { e.preventDefault(); openOutside(u.href); }
    } catch (err) {}
  }, true);

  /* 4. reminders -> phone notifications */
  if (P.LocalNotifications) {
    var LN = P.LocalNotifications, perm = 'default', nextId = Math.floor(Date.now() / 1000) % 1000000;
    var asPerm = function (r) { var d = r && r.display; return d === 'granted' ? 'granted' : d === 'denied' ? 'denied' : 'default'; };
    LN.checkPermissions().then(function (r) { perm = asPerm(r); }).catch(function () {});
    var N = function (title, o) {
      o = o || {};
      var id = ++nextId, self = this;
      this.title = String(title || ''); this.body = String(o.body || ''); this.tag = o.tag || ''; this.data = o.data; this.onclick = null; this.onclose = null;
      LN.schedule({ notifications: [{ id: id, title: this.title, body: this.body, extra: { tag: this.tag }, smallIcon: 'ic_stat_shelf', iconColor: '#409BFE' }] }).catch(function () {});
      this.close = function () { LN.cancel({ notifications: [{ id: id }] }).catch(function () {}); if (self.onclose) self.onclose(); };
    };
    N.requestPermission = function (cb) {
      return LN.requestPermissions().then(function (r) { perm = asPerm(r) === 'granted' ? 'granted' : 'denied'; if (cb) cb(perm); return perm; },
        function () { perm = 'denied'; if (cb) cb(perm); return perm; });
    };
    Object.defineProperty(N, 'permission', { get: function () { return perm; } });
    N.maxActions = 0;
    try { Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: N }); } catch (e) { window.Notification = N; }
  }

  /* 5. Export Backup and other downloads -> Documents/Shelf Shelf */
  var blobs = new Map(), realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL;
  URL.createObjectURL = function (obj) { var u = realCreate.call(URL, obj); if (obj instanceof Blob) blobs.set(u, obj); return u; };
  URL.revokeObjectURL = function (u) { setTimeout(function () { blobs.delete(u); try { realRevoke.call(URL, u); } catch (e) {} }, 120000); };
  function getBlob(href) { return blobs.has(href) ? Promise.resolve(blobs.get(href)) : fetch(href).then(function (r) { return r.blob(); }); }
  function b64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); res(s.slice(s.indexOf(',') + 1)); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function clean(n) { n = String(n || '').replace(/[\\/:*?"<>|]+/g, '_').trim(); return n || ('Shelf Shelf ' + Date.now() + '.json'); }
  function save(href, rawName) {
    if (!P.Filesystem) return false;
    var name = clean(rawName);
    getBlob(href).then(b64).then(function (data) {
      return P.Filesystem.writeFile({ path: 'Shelf Shelf/' + name, data: data, directory: 'DOCUMENTS', recursive: true })
        .then(function (res) {
          toast('Saved to Documents/Shelf Shelf/' + name, P.Share ? 'Share' : '', function () { P.Share.share({ title: name, files: [res.uri], dialogTitle: 'Send ' + name }).catch(function () {}); });
        }, function () {
          return P.Filesystem.writeFile({ path: name, data: data, directory: 'CACHE' }).then(function (res) {
            return P.Share ? P.Share.share({ title: name, files: [res.uri], dialogTitle: 'Save ' + name }) : null;
          });
        });
    }).catch(function (err) { var m = String((err && err.message) || err || ''); if (!/cancel/i.test(m)) toast('Could not save the file: ' + m); });
    return true;
  }
  function handleAnchor(a) {
    if (!a || !a.hasAttribute || !a.hasAttribute('download')) return false;
    var href = a.href || '';
    if (!/^(blob:|data:)/i.test(href)) return false;
    return save(href, a.getAttribute('download') || a.download);
  }
  var realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (handleAnchor(this)) return; return realClick.apply(this, arguments); };
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
    if (a && handleAnchor(a)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
})();
