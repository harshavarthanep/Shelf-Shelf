// Run after "npx cap add android" (the GitHub workflow does this for you).
// Adds: the notification permission and status-bar icon for reminders,
// and the version number from the release.   Usage: node android-extras.mjs 1.0.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const version = (process.argv[2] || process.env.APP_VERSION || '1.0.0').replace(/^v/, '');
const main = path.join(here, 'android/app/src/main');
if (!fs.existsSync(main)) { console.error('Run "npx cap add android" first.'); process.exit(1); }

const mf = path.join(main, 'AndroidManifest.xml');
let m = fs.readFileSync(mf, 'utf8');
const perms = ['android.permission.POST_NOTIFICATIONS'];
const add = perms.filter((p) => !m.includes('"' + p + '"')).map((p) => '    <uses-permission android:name="' + p + '" />\n').join('');
if (add) m = m.replace(/(\s*)<application/, '\n' + add + '$1<application');
fs.writeFileSync(mf, m);

// small white status-bar icon: the four Shelf tiles
fs.mkdirSync(path.join(main, 'res/drawable'), { recursive: true });
fs.writeFileSync(path.join(main, 'res/drawable/ic_stat_shelf.xml'),
`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="#FFFFFFFF" android:pathData="M5,3h4a2,2 0 0,1 2,2v4a2,2 0 0,1 -2,2h-4a2,2 0 0,1 -2,-2v-4a2,2 0 0,1 2,-2z"/>
  <path android:fillColor="#FFFFFFFF" android:pathData="M15,3h4a2,2 0 0,1 2,2v4a2,2 0 0,1 -2,2h-4a2,2 0 0,1 -2,-2v-4a2,2 0 0,1 2,-2z"/>
  <path android:fillColor="#FFFFFFFF" android:pathData="M5,13h4a2,2 0 0,1 2,2v4a2,2 0 0,1 -2,2h-4a2,2 0 0,1 -2,-2v-4a2,2 0 0,1 2,-2z"/>
  <path android:fillColor="#FFFFFFFF" android:pathData="M15,13h4a2,2 0 0,1 2,2v4a2,2 0 0,1 -2,2h-4a2,2 0 0,1 -2,-2v-4a2,2 0 0,1 2,-2z"/>
</vector>
`);

const gradle = path.join(here, 'android/app/build.gradle');
let g = fs.readFileSync(gradle, 'utf8');
const [a, b, c] = version.split('.').map((n) => parseInt(n, 10) || 0);
g = g.replace(/versionCode \d+/, 'versionCode ' + (a * 10000 + b * 100 + c)).replace(/versionName "[^"]*"/, 'versionName "' + version + '"');
fs.writeFileSync(gradle, g);
console.log('Android project ready — version ' + version);
