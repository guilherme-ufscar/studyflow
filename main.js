const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// On Windows, set an AppUserModelID so the app icon/notifications behave correctly
if (process.platform === 'win32' && app && typeof app.setAppUserModelId === 'function') {
  try { app.setAppUserModelId('com.example.flow'); } catch (e) { /* ignore */ }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Hide native application menu (prevents showing File/Edit/View on Windows)
  try { Menu.setApplicationMenu(null); } catch (e) { }
  if (typeof win.removeMenu === 'function') win.removeMenu();
  if (typeof win.setMenuBarVisibility === 'function') win.setMenuBarVisibility(false);

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
