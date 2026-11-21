const {contextBridge, ipcRenderer} = require('electron');
if (process.isMainFrame && location.protocol === 'nextrole:' && location.host === 'app' &&
    location.pathname === '/workspace/dashboard.html') {
  contextBridge.exposeInMainWorld('nextRoleDesktop', {
    save: payload => ipcRenderer.invoke('dashboard:save',payload),
    refresh: builtAt => ipcRenderer.invoke('dashboard:refresh',builtAt)
  });
}

