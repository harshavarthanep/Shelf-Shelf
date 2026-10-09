/*
 * ─────────────────────────────────────────────────────────────
 *  Shelf Shelf — configuration
 *  Edit this file, then click "Reload" on the extension card
 *  (chrome://extensions). Defaults only apply on first run or
 *  after Settings → Reset everything.
 * ─────────────────────────────────────────────────────────────
 */
// eslint-disable-next-line no-unused-vars
var SHELF_CONFIG = {
  /*
   * Pre-load the apps below on first run?
   *   false → the shelf starts empty (default)
   *   true  → the shelf starts with defaultApps
   */
  useDefaultApps: false,

  /*
   * Default apps (and folders). `name` and `icon` are optional:
   *   - name is derived from the URL when omitted
   *   - icon is fetched automatically when omitted; set it to an
   *     image URL (https://…) or a data:image/… URI for a custom logo
   */
  defaultApps: [
    { name: 'Gmail', url: 'https://mail.google.com/' },
    { name: 'Calendar', url: 'https://calendar.google.com/' },
    { name: 'Drive', url: 'https://drive.google.com/' },
    { name: 'YouTube', url: 'https://www.youtube.com/' },
    { name: 'GitHub', url: 'https://github.com/' },
    { name: 'ChatGPT', url: 'https://chatgpt.com/' },
    { name: 'Claude', url: 'https://claude.ai/' },
    { name: 'Notion', url: 'https://www.notion.so/' },
    // { name: 'My Tool', url: 'https://example.com', icon: 'https://example.com/logo.png' },
    // { type: 'folder', name: 'Work', apps: [ { name: 'Slack', url: 'https://app.slack.com/' } ] },
  ],

  /*
   * One-tap suggestions shown on the empty screen and in "New App".
   * Set to [] to hide them.
   */
  suggestions: [
    { name: 'Gmail', url: 'https://mail.google.com/' },
    { name: 'Calendar', url: 'https://calendar.google.com/' },
    { name: 'Drive', url: 'https://drive.google.com/' },
    { name: 'YouTube', url: 'https://www.youtube.com/' },
    { name: 'GitHub', url: 'https://github.com/' },
    { name: 'ChatGPT', url: 'https://chatgpt.com/' },
    { name: 'Claude', url: 'https://claude.ai/' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/' },
  ],

  /*
   * Default settings (users can change all of these in Settings).
   *   theme:        'system' | 'light' | 'dark'
   *   palette:      'classic' | 'graphite' | 'ocean' | 'forest' | 'sand' | 'rose' | 'midnight'
   *   accent:       any #RRGGBB color
   *   view:         'grid' | 'list'
   *   orientation:  'vertical' | 'horizontal'
   *   columns:      1–8  (apps per row, vertical icon view)
   *   listColumns:  1–3  (columns in vertical list view)
   *   rows:         1–6  (apps per column, horizontal)
   *   iconSize:     'small' | 'medium' | 'large'
   *   iconShape:    'rounded' | 'circle'
   */
  defaultSettings: {
    theme: 'system',
    palette: 'classic',
    accent: '#0A84FF',
    view: 'grid',
    orientation: 'vertical',
    columns: 4,
    listColumns: 1,
    rows: 2,
    iconSize: 'medium',
    iconShape: 'rounded',
    showNames: true,
    showSearch: true,
    autofocusSearch: true,
    openInBackground: false,
    sort: 'manual',        // 'manual' | 'name' | 'usage'
    glass: false,          // Liquid Glass look
    wallpaper: 'aurora',   // 'aurora' | 'sunset' | 'ocean' | 'meadow' | 'dusk' | 'mono' | 'accent'
    sync: true,            // keep a backup in the browser account + sync devices
  },

  /*
   * "Rate Shelf Shelf" (Settings → Help, and a one-time request after a few days of use).
   * {id} becomes the extension's ID, which on a store install is the store listing ID.
   * '' turns rating off for that store (e.g. until the Firefox or Safari listing is live).
   */
  reviewUrls: {
    chrome: 'https://chromewebstore.google.com/detail/{id}/reviews',
    edge: 'https://microsoftedge.microsoft.com/addons/detail/{id}',
    firefox: '',   // e.g. 'https://addons.mozilla.org/firefox/addon/shelf-shelf/reviews/'
    safari: '',    // your App Store link, once published
  },
  /* When to ask for a rating: after this many days installed, opens, and different days used. Asked at most 3 times. */
  reviewPrompt: { afterDays: 4, afterOpens: 8, activeDays: 3 },

  /*
   * "Send Feedback" in Settings → Help (a form, GitHub issues or mailto:).
   * '' uses the Chrome Web Store support tab in Chrome, and hides the row elsewhere.
   */
  feedbackUrl: 'mailto:h24creationz@gmail.com?subject=Shelf%20Shelf%20feedback',

  /* The Chrome Web Store ID — the website uses it for "Get the extension" and to hand a Pro licence to the extension. */
  chromeExtensionId: 'bhhnembgfddoomakgmegbhkpklcgelhn',

  /*
   * Optional "Buy Me a Coffee" row at the end of Settings. '' hides it.
   * e.g. 'https://buymeacoffee.com/yourname' or a Razorpay payment link / UPI page.
   */
  coffeeUrl: '',

  /*
   * Shelf Shelf Pro (optional, paid with Razorpay). Leave enabled: false until the payment server
   * works end to end — until then every feature is free and no Pro screens appear anywhere.
   * Step-by-step setup: PRO-SETUP.md in the store kit.
   */
  pro: {
    enabled: false,
    publicKey: null,        // { kty: 'EC', crv: 'P-256', x: '…', y: '…' } from tools/make-keys.mjs (public half only!)
    checkoutUrl: '',        // https://<you>.github.io/shelf-shelf/pro.html  (the website's Pro page)
    apiUrl: '',             // https://shelf-pro.<you>.workers.dev  (your payment server, used by pro.html)
    // Plans. Which ones exist is decided by your server (wrangler.toml: PLAN_WEEKLY / PLAN_MONTHLY / PLAN_YEARLY
    // = Razorpay autopay plans, PRICE_AMOUNT = one-time Lifetime) and the prices shown are read from Razorpay.
    // The prices below are only used when the server can't be reached (offline) — keep them the same.
    // To hide a plan everywhere, leave it empty on the server; `enabled: false` here also hides it in the app.
    plans: {
      weekly: { price: '', note: '' },                // e.g. '₹19'   (autopay every week)
      monthly: { price: '', note: '' },               // e.g. '₹49'   (autopay every month)
      yearly: { price: '', note: 'Best value' },      // e.g. '₹399'  (autopay every year)
      lifetime: { price: '', note: 'Pay once' },      // e.g. '₹999'  (one payment, no autopay)
    },
    defaultPlan: 'yearly',  // the plan that's pre-selected
    priceNote: 'Secure checkout by Razorpay · all your computers · cancel anytime',
    trialDays: 30,          // free Pro trial, linked to the browser account (0 = no trial). Must match TRIAL_DAYS on your server.
    freeLists: 3,           // to-do lists on the free plan (more with Pro)
  },
};
