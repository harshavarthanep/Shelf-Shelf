/* Shelf Shelf Pro — checkout page (website). Razorpay Checkout + your payment server (see PRO-SETUP.md).
   Lifetime = one Razorpay order. Weekly / Monthly / Yearly = Razorpay subscriptions that renew automatically (autopay).
   Which plans exist and what they cost comes from your server (GET /plans → read from Razorpay); config.js is the fallback. */
(function () {
  'use strict';
  var C = window.SHELF_CONFIG || {}, P = C.pro || {};
  var $ = function (id) { return document.getElementById(id); };
  var okPage = /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(P.checkoutUrl || '');
  var on = P.enabled === true && P.publicKey && /^https:\/\//.test(P.apiUrl || '') && okPage;
  try { if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-scheme', 'dark'); } catch (e) { /* ignore */ }
  var api = String(P.apiUrl || '').replace(/\/+$/, '');
  var params = new URLSearchParams(location.search);
  var acct = /^[a-f0-9]{64}$/.test(params.get('acct') || '') ? params.get('acct') : '';   // links the purchase to the buyer's browser account

  // Only ever hand a licence back to Shelf itself: an extension's activate page, or this website.
  function safeReturn(u) {
    if (!u) return '';
    try {
      var x = new URL(u);
      if (/^(chrome|moz|safari-web)-extension:$/.test(x.protocol) && /\/activate\.html$/.test(x.pathname)) return x.origin + x.pathname;
      if (x.origin === location.origin) return x.origin + x.pathname;
    } catch (e) { /* ignore */ }
    return '';
  }
  var ret = safeReturn(params.get('return')) || new URL('./', location.href).href;

  if (C.chromeExtensionId) { var g = $('get-ext'); g.href = 'https://chromewebstore.google.com/detail/' + C.chromeExtensionId; g.hidden = false; }
  if (C.feedbackUrl) $('mail').href = C.feedbackUrl; else $('mail').hidden = true;
  var FEATURES = ['Liquid Glass & Pro Looks', 'Auto-Organize', 'Daily Digest & Smart Reminders', 'Insights', 'App Windows & Pinned Tabs', 'Unlimited Lists', 'Repeating To-Dos', 'Backup Files'];
  $('perks').innerHTML = FEATURES.map(function (f) { return '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>' + f + '</li>'; }).join('');

  if (!on) { $('buy-off').hidden = false; $('restore').hidden = true; return; }
  $('buy-main').hidden = false;

  // ── plans
  var cfgPlans = P.plans && typeof P.plans === 'object' ? P.plans : {};
  var META = [['weekly', 'Weekly', 'week'], ['monthly', 'Monthly', 'month'], ['yearly', 'Yearly', 'year'], ['lifetime', 'Lifetime', '']];
  function money(amount, currency) {
    var v = Number(amount) / 100;
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'INR', maximumFractionDigits: v % 1 ? 2 : 0, minimumFractionDigits: v % 1 ? 2 : 0 }).format(v); }
    catch (e) { return '₹' + v; }
  }
  function build(server) {
    return META.map(function (x) {
      var c = cfgPlans[x[0]] && typeof cfgPlans[x[0]] === 'object' ? cfgPlans[x[0]] : {};
      var sp = server && server.find(function (p) { return p.id === x[0]; });
      if (server && server.length ? !sp : !c.price) return null;
      if (c.enabled === false) return null;
      return { id: x[0], name: x[1], per: x[2], price: sp ? money(sp.amount, sp.currency) : c.price, note: c.note || (x[0] === 'lifetime' ? 'Pay once' : '') };
    }).filter(Boolean);
  }
  var PLANS = build(null);
  if (!PLANS.length) PLANS = [{ id: 'lifetime', name: 'Lifetime', per: '', price: '', note: 'Pay once' }];
  var want = params.get('plan');
  var sel = null;
  function pickDefault() {
    var ids = PLANS.map(function (p) { return p.id; });
    if (sel && ids.indexOf(sel) >= 0) return sel;
    return [want, P.defaultPlan, 'yearly', 'monthly', 'lifetime', 'weekly'].filter(function (id) { return id && ids.indexOf(id) >= 0; })[0] || ids[0];
  }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function render() {
    sel = pickDefault();
    $('plans').className = 'plan-pick n' + PLANS.length;
    $('plans').innerHTML = PLANS.map(function (p) {
      return '<button type="button" role="radio" class="plan" data-plan="' + p.id + '"><b>' + esc(p.name) + '</b><span class="plan-price">' + esc(p.price) + (p.per ? '<small>/' + p.per + '</small>' : '') + '</span>' + (p.note ? '<em>' + esc(p.note) + '</em>' : '') + '</button>';
    }).join('');
    $('plans').hidden = PLANS.length < 2;
    paint();
  }
  function plan() { return PLANS.find(function (p) { return p.id === sel; }) || PLANS[0]; }
  function paint() {
    Array.prototype.forEach.call($('plans').children, function (b) { b.setAttribute('aria-checked', String(b.dataset.plan === sel)); });
    var p = plan();
    $('pay').textContent = (p.id === 'lifetime' ? 'Pay Once' : 'Subscribe') + (p.price ? ' · ' + p.price + (p.per ? '/' + p.per : '') : '');
    $('price-note').textContent = p.id === 'lifetime' ? 'One-time payment · no autopay · yours forever on all your computers'
      : 'Autopay every ' + p.per + ' via Razorpay · cancel anytime in Shelf (Settings → Pro) · all your computers';
  }
  $('plans').addEventListener('click', function (e) { var b = e.target.closest('.plan'); if (b) { sel = b.dataset.plan; paint(); } });
  render();
  // Live plans & prices from the server (read from Razorpay), so the page can never show a price that differs from the charge.
  fetch(api + '/plans').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    var list = j && Array.isArray(j.plans) ? j.plans.filter(function (p) { return p && Number(p.amount) > 0; }) : null;
    if (!list || !list.length) return;
    var next = build(list);
    if (next.length && JSON.stringify(next) !== JSON.stringify(PLANS)) { PLANS = next; render(); }
  }).catch(function () { /* config prices stay */ });
  if (location.hash === '#restore') setTimeout(function () { $('r-email').focus(); $('restore').scrollIntoView({ behavior: 'smooth' }); }, 200);
  try { var last = localStorage.getItem('shelf.buyEmail'); if (last) { $('email').value = last; $('r-email').value = last; } } catch (e) { /* ignore */ }

  function post(path, body) {
    return fetch(api + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong'); return j; }); },
        function () { throw new Error('Couldn’t reach the payment server — check your connection'); });
  }
  function msg(el, text, bad) { el.textContent = text || ''; el.className = 'field-msg' + (bad ? ' error' : ''); }
  var rzpReady = null;
  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    if (rzpReady) return rzpReady;
    rzpReady = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.async = true;
      s.onload = function () { res(); }; s.onerror = function () { rzpReady = null; rej(new Error('Couldn’t load Razorpay — check your connection')); };
      document.head.appendChild(s);
    });
    return rzpReady;
  }
  loadRazorpay().catch(function () { /* retried on click */ });

  function finish(licence, email) {
    $('buy-main').hidden = true; $('restore').hidden = true; $('buy-done').hidden = false;
    $('licence').value = licence;
    $('done-text').textContent = 'Thank you' + (email ? ', ' + email : '') + '! Pro unlocks on every computer signed in to your browser account — and comes back by itself after a reinstall.';
    var go = function () { location.href = ret + '#license=' + encodeURIComponent(licence); };
    $('activate').onclick = go;
    $('activate').focus();
    setTimeout(go, 1800);                                     // straight back into Shelf, Pro unlocked
  }
  $('copy').addEventListener('click', function () {
    var t = $('licence').value;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(function () { $('licence').select(); document.execCommand('copy'); });
    $('copy').textContent = 'Copied ✓';
  });

  $('pay').addEventListener('click', function () {
    var email = $('email').value.trim(), m = $('buy-msg'), p = plan();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg(m, 'Enter your email address', true); $('email').focus(); return; }
    try { localStorage.setItem('shelf.buyEmail', email); } catch (e) { /* ignore */ }
    if ($('pay').disabled) return;
    $('pay').disabled = true; msg(m, 'Opening secure checkout…');
    var sub = p.id !== 'lifetime';
    var create = sub ? post('/subscribe', { email: email, plan: p.id, acct: acct }) : post('/order', { email: email, acct: acct });
    Promise.all([loadRazorpay(), create]).then(function (r) {
      var o = r[1];
      var opts = {
        key: o.keyId, name: 'Shelf Shelf', description: 'Shelf Shelf Pro — ' + p.name + (sub ? ' (autopay, cancel anytime)' : ' (one-time)'), prefill: { email: email }, notes: { email: email, acct: acct, product: 'shelf-shelf' },
        theme: { color: '#0A84FF' },
        handler: function (res) {
          msg(m, 'Payment received — unlocking Pro…');
          var body = { paymentId: res.razorpay_payment_id, signature: res.razorpay_signature, email: email, acct: acct };
          if (sub) body.subscriptionId = o.subscriptionId; else body.orderId = res.razorpay_order_id || o.orderId;
          var tries = 0;
          (function verify() {
            post('/verify', body).then(function (j) { finish(j.license, email); }).catch(function (e) {
              if (++tries < 3 && /not (complete|active) yet/i.test(e.message)) { setTimeout(verify, 2500); return; }   // bank still confirming
              msg(m, e.message + ' — your payment is safe. Use “Restore a purchase” below with ' + (sub ? 'subscription ID ' + o.subscriptionId : 'payment ID ' + res.razorpay_payment_id) + '.', true);
              $('r-email').value = email; $('r-pid').value = sub ? o.subscriptionId : res.razorpay_payment_id; $('pay').disabled = false;
            });
          })();
        },
        modal: { ondismiss: function () { $('pay').disabled = false; msg(m, ''); } },
      };
      if (sub) opts.subscription_id = o.subscriptionId; else { opts.order_id = o.orderId; opts.amount = o.amount; opts.currency = o.currency; }
      var rzp = new window.Razorpay(opts);
      rzp.on && rzp.on('payment.failed', function (e) { $('pay').disabled = false; msg(m, (e && e.error && e.error.description) || 'Payment failed — you weren’t charged. Try again.', true); });
      rzp.open();
    }).catch(function (e) { $('pay').disabled = false; msg(m, e.message, true); });
  });
  $('r-go').addEventListener('click', function () {
    var email = $('r-email').value.trim(), id = $('r-pid').value.trim(), m = $('r-msg');
    var isSub = /^sub_\w{6,}$/.test(id);
    if (!email || !(isSub || /^pay_\w{6,}$/.test(id))) { msg(m, 'Enter your email and the ID from your Razorpay email (pay_… or sub_…)', true); return; }
    $('r-go').disabled = true; msg(m, 'Looking it up…');
    var body = { email: email, acct: acct }; body[isSub ? 'subscriptionId' : 'paymentId'] = id;
    post('/restore', body).then(function (j) { finish(j.license, email); }).catch(function (e) { msg(m, e.message, true); }).then(function () { $('r-go').disabled = false; });
  });
})();
