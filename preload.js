const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // === 🔐 Auth & Role
  checkRoleValid: () => ipcRenderer.invoke('check-role'),
  verifyRole: () => ipcRenderer.invoke('verify-discord-role'),
  getUser: () => ipcRenderer.invoke('get-user'),

  // === 🎮 Gameplay
  launchGame: () => ipcRenderer.invoke('launch-game'),
  clearCache: () => ipcRenderer.invoke('clear-fivem-cache'),
  scanForCheats: () => ipcRenderer.invoke('scan-for-cheats'),

  // === 🌐 Server Info
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  getLatency: () => ipcRenderer.invoke('get-latency'),

  // === 🔗 External Resources
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // === 🚀 Mise à jour
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  installUpdateNow: () => ipcRenderer.invoke('install-update-now'),

  // === 📡 Event Listeners
  onAuthSuccess: (callback) => ipcRenderer.on('auth-success', callback),
  onRoleMissing: (callback) => ipcRenderer.on('role-missing', callback),
  onFiveMClosed: (callback) => ipcRenderer.on('fivem-closed', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback)
});
