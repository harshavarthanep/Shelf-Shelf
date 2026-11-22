// Shelf Shelf for Windows, Mac and Linux — built by H24 Creationz.
// Loads the same web app as the website, from inside the app, so it opens
// instantly and works offline. Your sites open in your default browser.
const { app, BrowserWindow, Menu, shell, session, protocol, net, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const APP_ID = 'com.h24creationz.shelfshelf';
const WWW = path.join(__dirname, 'www');
const ORIGIN = 'app://shelf';

app.setAppUserModelId(APP_ID);
app.setName('Shelf Shelf');

// A private, secure "app://" address: local loading, its own storage, the same browser features as the website.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } }]);

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const isWebLink = (url) => /^(https?:|mailto:|tel:)/i.test(url);

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 800, minWidth: 360, minHeight: 520,
    title: 'Shelf Shelf',
    backgroundColor: '#F2F2F7',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true },
  });
  if (process.platform !== 'darwin') win.removeMenu();
  win.once('ready-to-show', () => win.show());

  // Every website you open from Shelf goes to your default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebLink(url)) shell.openExternal(url);
    else if (url.startsWith(ORIGIN)) return { action: 'allow', overrideBrowserWindowOptions: { width: 900, height: 760, autoHideMenuBar: true, title: 'Shelf Shelf' } };
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith(ORIGIN)) return;
    e.preventDefault();
    if (isWebLink(url)) shell.openExternal(url);
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta, wc = win.webContents;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); event.preventDefault(); }
    else if (ctrl && (input.key === '=' || input.key === '+')) { wc.setZoomLevel(wc.getZoomLevel() + 0.5); event.preventDefault(); }
    else if (ctrl && input.key === '-') { wc.setZoomLevel(wc.getZoomLevel() - 0.5); event.preventDefault(); }
    else if (ctrl && input.key === '0') { wc.setZoomLevel(0); event.preventDefault(); }
    else if (ctrl && input.shift && input.key.toLowerCase() === 'i') { wc.toggleDevTools(); event.preventDefault(); }
    else if (input.key === 'F5' || (ctrl && input.key.toLowerCase() === 'r' && !input.shift)) { wc.reload(); event.preventDefault(); }
  });
  win.webContents.on('render-process-gone', (e, d) => {
    if (d.reason === 'clean-exit') return;
    const r = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Reload', 'Close'], message: 'Shelf Shelf stopped unexpectedly', detail: 'Your apps and to-dos are saved on this computer. Reload to continue.' });
    if (r === 0) win.reload(); else app.quit();
  });
  win.on('closed', () => { win = null; });
  win.loadURL(ORIGIN + '/index.html');
}

function macMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Shelf Shelf', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'Shelf Shelf website', click: () => shell.openExternal('https://harshavarthanep.github.io/Shelf-Shelf/download.html') }] },
  ]));
}

ipcMain.on('shelf:ready', () => {});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  protocol.handle('app', async (req) => {
    const u = new URL(req.url);
    let rel = decodeURIComponent(u.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(WWW, rel));
    if (!file.startsWith(WWW + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return new Response('Not found', { status: 404 });
    const res = await net.fetch(pathToFileURL(file).toString());
    const type = MIME[path.extname(file).toLowerCase()];
    return type ? new Response(res.body, { status: 200, headers: { 'Content-Type': type, 'Cache-Control': 'no-cache' } }) : res;
  });
  // One person, one computer: allow what Shelf asks for (notifications for reminders, clipboard, storage).
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(!['media', 'geolocation', 'hid', 'serial', 'usb'].includes(perm)));
  app.setAboutPanelOptions({ applicationName: 'Shelf Shelf', applicationVersion: app.getVersion(), copyright: 'Built by H24 Creationz', credits: 'Your favourite sites as apps, folders and a dock — plus to-dos with reminders.' });
  if (process.platform === 'darwin') macMenu();
  createWindow();
});

app.on('activate', () => { if (!win) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
