// Shelf Shelf desktop — the only thing the page learns about the app: which computer it runs on.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('shelfDesktop', {
  platform: process.platform,
  ready() { ipcRenderer.send('shelf:ready'); },
});
