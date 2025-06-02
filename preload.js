const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkRoleValid: () => ipcRenderer.invoke('check-role'),
  launchGame: () => ipcRenderer.invoke('launch-game'),
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  getLatency: () => ipcRenderer.invoke('get-latency'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  clearCache: () => ipcRenderer.invoke('clear-fivem-cache'),
  getUser: () => ipcRenderer.invoke('get-user'),
  verifyRole: () => ipcRenderer.invoke('verify-discord-role'),
  scanForCheats: () => ipcRenderer.invoke("scan-for-cheats"),

  // Mises à jour
  checkForUpdate: () => ipcRenderer.invoke("check-for-update"),
  installUpdateNow: () => ipcRenderer.send("install-update-now"),

  // Listeners (event-based)
  onAuthSuccess: (callback) => ipcRenderer.on('auth-success', callback),
  onRoleMissing: (callback) => ipcRenderer.on("role-missing", callback),
  onFiveMClosed: (callback) => ipcRenderer.on('fivem-closed', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on("update-available", callback),
  onUpdateProgress: (callback) => ipcRenderer.on("update-progress", callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on("update-downloaded", callback),
});
