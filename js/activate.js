/* Shelf Shelf Pro — receives a licence from the checkout page (activate.html#license=…) and saves it. */
(function () {
  'use strict';
  var Pro = window.ShelfPro, Store = window.ShelfStore;
  var msg = document.getElementById('act-msg'), manual = document.getElementById('act-manual');
  var key = document.getElementById('act-key'), go = document.getElementById('act-go'), open = document.getElementById('act-open');
  try { if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-scheme', 'dark'); } catch (e) { /* ignore */ }
  function done(p) {
    msg.textContent = 'Pro is unlocked' + (p.email ? ' for ' + p.email : '') + ' — on every computer signed in to this browser account. Thank you!';
    manual.hidden = true; open.hidden = false; open.focus();
    document.documentElement.classList.add('act-ok');
  }
  function fail(text) { msg.textContent = text; manual.hidden = false; }
  function tryToken(t) {
    if (!Pro || !Pro.enabled()) { fail('Pro isn’t set up in this version of Shelf Shelf yet.'); manual.hidden = true; open.hidden = false; return; }
    msg.textContent = 'Checking your licence…';
    Pro.activate(Store, t).then(function (p) { if (p) done(p); else fail('That licence key isn’t valid. Paste the whole key from your receipt.'); });
  }
  open.addEventListener('click', function () { location.href = 'options.html'; });
  go.addEventListener('click', function () { if (key.value.trim()) tryToken(key.value); });
  var m = /[#&]license=([\w.-]+)/.exec(location.hash || '');
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
  if (m) tryToken(m[1]); else fail('Paste your licence key to unlock Pro.');
})();
