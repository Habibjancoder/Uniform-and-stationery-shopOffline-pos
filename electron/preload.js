const { contextBridge, ipcRenderer } = require('electron');

// Expose safe native Windows desktop capabilities to renderer
if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electronAPI', {
    saveDatabaseBackup: (payload) => ipcRenderer.invoke('save-database-backup', payload),
    isWindowsDesktop: true,
  });
} else {
  window.electronAPI = {
    saveDatabaseBackup: (payload) => ipcRenderer.invoke('save-database-backup', payload),
    isWindowsDesktop: true,
  };
}
