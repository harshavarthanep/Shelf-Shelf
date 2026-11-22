// Builds the app folder (www/) for the Windows / Mac / Linux / Android apps
// from the web app in the repository root (index.html, css/, js/, icons/).
//
//   node ../shared/prepare-www.mjs www        (run from native/desktop or native/mobile)
//
// Your website files are never changed — only the copy inside www/.
// The copy gets native-bridge.js (links open in your browser, reminders use the
// phone's notifications, backups save to Documents) and no web manifest or
// service worker, because the installed app already holds every file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const dest = path.resolve(process.cwd(), process.argv[2] || 'www');

let version = process.env.APP_VERSION || '';
if (!version) { try { version = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version; } catch (_) {} }
const repo = process.env.GITHUB_REPOSITORY || 'harshavarthanep/Shelf-Shelf';

const need = ['index.html', 'css', 'js', 'icons'];
for (const n of need) if (!fs.existsSync(path.join(root, n))) { console.error('Missing ' + n + ' in the repository root — upload the whole Shelf Shelf web app.'); process.exit(1); }

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
for (const d of ['css', 'js', 'icons']) fs.cpSync(path.join(root, d), path.join(dest, d), { recursive: true });
// pages the app links to (help, privacy, terms…) — everything except the download page
for (const f of fs.readdirSync(root)) {
  if (/\.(html|css)$/i.test(f) && !/^(index|download)\.html$/i.test(f)) fs.copyFileSync(path.join(root, f), path.join(dest, f));
}

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const bridge = fs.readFileSync(path.join(here, 'native-bridge.js'), 'utf8')
  .replace('__SS_VERSION__', JSON.stringify(version || '1.0.0'))
  .replace('__SS_REPO__', JSON.stringify(repo));
let injected = false;
html = html.replace(/<meta charset="utf-?8">/i, (m) => { injected = true; return m + '\n  <!-- shelf-native-bridge -->\n  <script>\n' + bridge + '\n  </script>'; });
if (!injected) { console.error('Could not find <meta charset="utf-8"> in index.html'); process.exit(1); }
html = html.replace(/\s*<link\s+rel=["']manifest["'][^>]*>/i, '');
// the app fills its own window (the website shows a framed card on big screens)
html = html.replace('</head>', '  <style>html.page[data-native] body{padding:0}html.page[data-native] .root{width:100%;max-width:none;height:100vh;height:100dvh;border-radius:0;box-shadow:none}</style>\n</head>');
fs.writeFileSync(path.join(dest, 'index.html'), html);

const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((t, e) => t + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log('Prepared ' + path.relative(process.cwd(), dest) + '/ — ' + (size(dest) / 1048576).toFixed(1) + ' MB, version ' + version + ', repo ' + repo);
