const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkRoleValid: () => ipcRenderer.invoke('check-role'),
  verifyRole: () => ipcRenderer.invoke('verify-discord-role'),
  getUser: () => ipcRenderer.invoke('get-user'),
  launchGame: () => ipcRenderer.invoke('launch-game'),
  clearCache: () => ipcRenderer.invoke('clear-fivem-cache'),
  scanForCheats: () => ipcRenderer.invoke('scan-for-cheats'),
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  getLatency: () => ipcRenderer.invoke('get-latency'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  installUpdateNow: () => ipcRenderer.invoke('install-update-now'),
  onAuthSuccess: (callback) => ipcRenderer.on('auth-success', callback),
  onRoleMissing: (callback) => ipcRenderer.on('role-missing', callback),
  onFiveMClosed: (callback) => ipcRenderer.on('fivem-closed', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
