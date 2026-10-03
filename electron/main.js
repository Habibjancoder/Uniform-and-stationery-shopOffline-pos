const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: 'KitabGhar POS & Uniform ERP - Windows Desktop Edition',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load production Next.js build or local dev server
  const devUrl = 'http://localhost:3000';
  mainWindow.loadURL(devUrl);

  // Remove standard window menu for kiosk/POS look
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler for native Windows file backup
ipcMain.handle('save-database-backup', async (event, { defaultName, data }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Choose Backup Location on Windows',
    defaultPath: defaultName,
    filters: [{ name: 'KitabGhar Backup Database (*.json)', extensions: ['json'] }],
  });

  if (filePath) {
    fs.writeFileSync(filePath, data, 'utf-8');
    return { success: true, filePath };
  }
  return { success: false };
});
