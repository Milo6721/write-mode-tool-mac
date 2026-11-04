'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const on = (ch, cb) => ipcRenderer.on(ch, (e, v) => cb(v));
contextBridge.exposeInMainWorld('api', {
  onOpen: (cb) => on('open', cb),
  onChunk: (cb) => on('chunk', cb),
  onDone: (cb) => on('done', cb),
  onError: (cb) => on('error', cb),
  run: (action, instruction) => ipcRenderer.send('run', { action, instruction }),
  cancel: () => ipcRenderer.send('cancel'),
  close: () => ipcRenderer.send('close'),
  copy: (t) => ipcRenderer.send('copy', t),
  replace: (t) => ipcRenderer.send('replace', t),
  setKey: (k) => ipcRenderer.invoke('setKey', k),
  openConsole: () => ipcRenderer.send('openConsole'),
  getData: () => ipcRenderer.invoke('getData'),
  saveContacts: (list) => ipcRenderer.invoke('saveContacts', list),
  saveActions: (list) => ipcRenderer.invoke('saveActions', list),
  setLang: (l) => ipcRenderer.send('setLang', l),
  search: (t) => ipcRenderer.send('search', t),
  addCalendar: (t) => ipcRenderer.invoke('addCalendar', t),
  sendTo: (contactId, channel, text) => ipcRenderer.invoke('sendTo', { contactId, channel, text }),
});
