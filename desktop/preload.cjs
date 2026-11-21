const {contextBridge, ipcRenderer} = require('electron');
if (process.isMainFrame && location.protocol === 'nextrole:' && location.host === 'app' &&
    /^\/(workspace|demo)\/dashboard\.html$/.test(location.pathname)) {
  contextBridge.exposeInMainWorld('nextRoleDesktop', {
    save: payload => ipcRenderer.invoke('dashboard:save',payload),
    refresh: builtAt => ipcRenderer.invoke('dashboard:refresh',builtAt)
  });
}

