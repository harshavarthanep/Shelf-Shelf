/*
 * Shelf Shelf — Pro licence (optional).
 *
 * Pro stays completely switched off — every feature free, no Pro screens anywhere — until
 * SHELF_CONFIG.pro is filled in (enabled + publicKey + checkoutUrl). See PRO-SETUP.md.
 *
 * Tokens are signed by your payment server ("<payload>.<signature>", ECDSA P-256 / SHA-256):
 *   licence     { v:1, product:'shelf-shelf', plan:'pro',   pid, email, iat, kind, sid?, exp? }
 *   trial pass  { v:1, product:'shelf-shelf', plan:'trial', sub, iat, exp }
 * Shelf only holds the public key, so tokens can't be forged and checking them works offline.
 * Both are kept in the browser account (storage.sync) and on the device. The payment server also
 * remembers them per browser account, so Pro comes back by itself after a reinstall, and a used
 * trial is never handed out again.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShelfPro = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (G) {
  'use strict';
  var KEY = 'shelf.license', TRIAL_KEY = 'shelf.trialPass';
  var PRODUCT = 'shelf-shelf';
  var DAY = 864e5;

  function cfg() { var c = G.SHELF_CONFIG && G.SHELF_CONFIG.pro; return c && typeof c === 'object' ? c : {}; }
  function validJwk(k) { return !!k && typeof k === 'object' && k.kty === 'EC' && k.crv === 'P-256' && typeof k.x === 'string' && typeof k.y === 'string' && !k.d; }
  function okUrl(u) { return /^https:\/\/[^\s]+$/i.test(u || '') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/[^\s]*$/i.test(u || ''); }   // http only for local testing
  /* Pro is "on" only when everything needed for a real purchase is configured. */
  function enabled() {
    var c = cfg();
    return c.enabled === true && validJwk(c.publicKey) && okUrl(c.checkoutUrl) && !!(G.crypto && G.crypto.subtle);
  }
  function apiUrl() { var u = String(cfg().apiUrl || '').replace(/\/+$/, ''); return okUrl(u + '/') ? u : ''; }
  function trialDays() { var d = Number(cfg().trialDays); return isFinite(d) && d > 0 ? Math.min(365, Math.round(d)) : 0; }

  function b64urlToBytes(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = G.atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function clean(token) {
    if (typeof token !== 'string') return '';
    return token.trim().replace(/^SHELF-PRO[:\s-]*/i, '').replace(/[\s"'<>]/g, '');
  }
  function parse(token) {
    token = clean(token);
    if (!token || token.length > 3000 || !/^[\w-]+\.[\w-]+$/.test(token)) return null;
    var parts = token.split('.');
    try {
      var payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
      var sig = b64urlToBytes(parts[1]);
      if (!payload || typeof payload !== 'object' || sig.length !== 64) return null;
      return { token: token, payload: payload, signed: new TextEncoder().encode(parts[0]), sig: sig };
    } catch (e) { return null; }
  }
  var keyPromise = null, keyFor = null;
  function publicKey() {
    var k = cfg().publicKey;
    if (keyPromise && keyFor === k) return keyPromise;
    keyFor = k;
    keyPromise = G.crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: k.x, y: k.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return keyPromise;
  }
  /* → Promise<payload | null>. Never throws. opts.allowExpired returns expired tokens too (marked expired:true). */
  function verify(token, now, opts) {
    if (!enabled()) return Promise.resolve(null);
    var t = parse(token);
    if (!t) return Promise.resolve(null);
    var p = t.payload;
    now = now || Date.now();
    if (p.v !== 1 || p.product !== PRODUCT || (p.plan !== 'pro' && p.plan !== 'trial')) return Promise.resolve(null);
    if (p.plan === 'trial' && typeof p.exp !== 'number') return Promise.resolve(null);
    var expired = typeof p.exp === 'number' && p.exp < now;
    if (expired && !(opts && opts.allowExpired)) return Promise.resolve(null);
    return publicKey().then(function (key) {
      return G.crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, t.sig, t.signed);
    }).then(function (ok) { return ok ? Object.assign({ token: t.token, expired: expired }, p) : null; }, function () { return null; });
  }

  function areas(Store) {
    var out = [];
    var api = Store && Store.API;
    if (api && api.storage && api.storage.sync) out.push({ name: 'sync', area: api.storage.sync });
    if (Store && Store.local) out.push({ name: 'local', area: Store.local });
    return out;
  }
  function get(area, key) {
    try {
      var r = area.get([key]);
      if (r && typeof r.then === 'function') return r.then(function (d) { return d && d[key]; }, function () { return null; });
      return new Promise(function (res) { area.get([key], function (d) { res(d && d[key]); }); });
    } catch (e) { return Promise.resolve(null); }
  }
  function set(area, obj) {
    try {
      var r = area.set(obj);
      if (r && typeof r.then === 'function') return r.catch(function () {});
      return new Promise(function (res) { area.set(obj, function () { res(); }); });
    } catch (e) { return Promise.resolve(); }
  }
  function remove(area, key) {
    try {
      var r = area.remove([key]);
      if (r && typeof r.then === 'function') return r.catch(function () {});
      return new Promise(function (res) { area.remove([key], function () { res(); }); });
    } catch (e) { return Promise.resolve(); }
  }
  /* Best valid token stored under `key` (account copy first, then device). Copies account → device. */
  function loadKey(Store, key, opts) {
    var list = areas(Store);
    return Promise.all(list.map(function (a) { return get(a.area, key); })).then(function (vals) {
      var tokens = vals.filter(function (v) { return typeof v === 'string' && v; });
      var tryNext = function (i) {
        if (i >= tokens.length) return null;
        return verify(tokens[i], null, opts).then(function (p) {
          if (!p) return tryNext(i + 1);
          // Never copy device → account: removing Pro from the account must not be undone by a stale local copy.
          list.forEach(function (a, j) { if (a.name === 'local' && vals[j] !== p.token && tokens[i] === vals[0]) { var o = {}; o[key] = p.token; set(a.area, o); } });
          return p;
        });
      };
      return tryNext(0);
    }, function () { return null; });
  }
  /* → Promise<{ license, trial, lapsed, pro }>: license = paid licence, trial = trial pass (possibly expired, see .expired),
     lapsed = a subscription licence past its date (renewal not picked up yet — refresh() fixes it when it was paid). */
  function status(Store, now) {
    if (!enabled()) return Promise.resolve({ license: null, trial: null, lapsed: null, pro: false });
    now = now || Date.now();
    return Promise.all([loadKey(Store, KEY, { allowExpired: true }), loadKey(Store, TRIAL_KEY, { allowExpired: true })]).then(function (r) {
      var lic = r[0], tr = r[1], lapsed = null;
      if (lic && typeof lic.exp === 'number' && lic.exp < now) { lapsed = lic.sid ? lic : null; lic = null; }
      if (tr) tr.expired = tr.exp < now;
      return { license: lic, trial: tr, lapsed: lapsed, pro: !!lic || !!(tr && !tr.expired) };
    });
  }
  /* Access payload (licence, else an active trial) → Promise<payload | null>. */
  function load(Store) {
    return status(Store).then(function (s) { return s.license || (s.trial && !s.trial.expired ? s.trial : null); });
  }
  /* Verifies and saves a licence or trial pass → Promise<payload | null>. */
  function activate(Store, token) {
    return verify(token, null, { allowExpired: true }).then(function (p) {
      if (!p) return null;
      if (p.plan === 'pro' && p.expired) return null;
      var o = {}; o[p.plan === 'trial' ? TRIAL_KEY : KEY] = p.token;
      return Promise.all(areas(Store).map(function (a) { return set(a.area, o); })).then(function () { return p; });
    });
  }
  function deactivate(Store) {
    var list = areas(Store);
    // account copy first, then this device (pages only ever copy account → device, so nothing comes back)
    return list.reduce(function (p, a) { return p.then(function () { return remove(a.area, KEY); }); }, Promise.resolve())
      .then(function () { return null; });
  }

  /* ───── talking to your payment server (only when apiUrl is set) ───── */
  function post(path, body) {
    var base = apiUrl();
    if (!base || typeof G.fetch !== 'function') return Promise.reject(new Error('Pro server not set up'));
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : 0;
    return G.fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Server error'); return j; }); })
      .then(function (j) { clearTimeout(timer); return j; }, function (e) { clearTimeout(timer); throw e; });
  }
  /* The browser account, as an anonymous id: sha256(product | Google account id). Needs the optional
     "identity" + "identity.email" permissions; never sends the email itself. → Promise<hex | null> */
  function accountId(API) {
    var id = API && API.identity;
    if (!id || typeof id.getProfileUserInfo !== 'function') return Promise.resolve(null);
    return new Promise(function (res) {
      try {
        var r = id.getProfileUserInfo({ accountStatus: 'ANY' }, function (info) { void (G.chrome && G.chrome.runtime && G.chrome.runtime.lastError); res(info); });
        if (r && typeof r.then === 'function') r.then(res, function () { res(null); });
      } catch (e) {
        try { id.getProfileUserInfo(function (info) { res(info); }); } catch (e2) { res(null); }
      }
    }).then(function (info) {
      if (!info || !info.id) return null;
      return G.crypto.subtle.digest('SHA-256', new TextEncoder().encode(PRODUCT + '|' + info.id)).then(function (h) {
        return Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    }, function () { return null; });
  }
  /* Start (or look up) the free trial for this browser account → Promise<trial payload (maybe expired) | null> */
  function claimTrial(Store, acct) {
    if (!acct || !trialDays()) return Promise.resolve(null);
    return post('/trial', { acct: acct }).then(function (j) { return j.trial ? activate(Store, j.trial) : null; });
  }
  /* Pro bought from this browser account (or another computer on it) → Promise<licence | null> */
  function fromAccount(Store, acct) {
    if (!acct) return Promise.resolve(null);
    return post('/account', { acct: acct }).then(function (j) { return j.license ? activate(Store, j.license) : null; }, function () { return null; });
  }
  /* Subscriptions: renew the licence a few days before it runs out (or once it lapsed).
     Lifetime: once a day, ask whether it was refunded. → Promise<licence | null> */
  function refresh(Store, lic, now, opts) {
    now = now || Date.now();
    if (!lic) return Promise.resolve(null);
    if (!lic.sid) {
      if (!(opts && opts.checkLifetime)) return Promise.resolve(lic);
      return post('/refresh', { license: lic.token }).then(function (j) {
        if (j && j.revoked === true) return deactivate(Store).then(function () { return null; });
        return lic;
      }, function () { return lic; });
    }
    if (typeof lic.exp !== 'number' || lic.exp - now > 10 * DAY) return Promise.resolve(lic);
    return post('/refresh', { license: lic.token }).then(function (j) {
      if (j.license) return activate(Store, j.license).then(function (p) { return p || lic; });
      return lic.exp > now ? lic : null;
    }, function () { return lic.exp > now ? lic : null; });
  }
  /* Everything at once: renew / re-check whatever licence this browser has. → Promise<licence | null> */
  function check(Store, opts) {
    if (!enabled() || !apiUrl()) return Promise.resolve(null);
    return status(Store).then(function (s) { return refresh(Store, s.license || s.lapsed, null, opts); });
  }
  /* Stop auto-renew. Pro keeps working until the end of the period already paid for. → Promise<{ until, license }> */
  function cancel(Store, lic) {
    if (!lic || !lic.sid) return Promise.reject(new Error('Only subscriptions can be cancelled'));
    return post('/cancel', { license: lic.token }).then(function (j) {
      return (j.license ? activate(Store, j.license) : Promise.resolve(null)).then(function (p) { return { until: j.until || null, license: p, status: j.status }; });
    });
  }
  /* Plans offered right now, with prices read from Razorpay by your server. → Promise<[{ id, amount, currency, … }] | null> */
  var plansMemo = null;
  function plans() {
    var base = apiUrl();
    if (!base || typeof G.fetch !== 'function') return Promise.resolve(null);
    if (plansMemo && Date.now() - plansMemo.at < 10 * 60e3) return Promise.resolve(plansMemo.plans);
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : 0;
    return G.fetch(base + '/plans', { signal: ctrl ? ctrl.signal : undefined }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      clearTimeout(timer);
      var list = j && Array.isArray(j.plans) ? j.plans.filter(function (p) { return p && /^(weekly|monthly|yearly|lifetime)$/.test(p.id) && Number(p.amount) > 0; }) : null;
      if (list) plansMemo = { at: Date.now(), plans: list };
      return list;
    }, function () { clearTimeout(timer); return null; });
  }

  return {
    KEY: KEY, TRIAL_KEY: TRIAL_KEY, PRODUCT: PRODUCT, enabled: enabled, parse: parse, verify: verify, load: load, status: status,
    activate: activate, deactivate: deactivate, config: cfg, clean: clean, trialDays: trialDays, apiUrl: apiUrl,
    accountId: accountId, claimTrial: claimTrial, fromAccount: fromAccount, refresh: refresh, check: check, cancel: cancel, plans: plans,
  };
});
