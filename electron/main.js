const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, desktopCapturer } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Himo AI Assistant",
    icon: path.join(__dirname, '../public/icon.png'), // Assume an icon exists or will be added
    backgroundColor: '#0a0a0c',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Himo', click: () => mainWindow.show() },
    { label: 'Quit', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);

  tray.setToolTip('Himo AI Assistant');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow.show());
}

// IPC for Desktop Automation
ipcMain.handle('run-system-command', async (event, command) => {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({ error: error.message });
        return;
      }
      resolve({ stdout, stderr });
    });
  });
});

// Advanced System Controls
ipcMain.handle('control-system', async (event, action, value) => {
  switch (action) {
    case 'volume':
      // Windows specific volume control (requires nircmd or similar, or powershell)
      const volCmd = `(new-object -com wscript.shell).SendKeys([char]${value > 0 ? 175 : 174})`; // Simple vol up/down
      exec(`powershell -Command "${volCmd}"`);
      return { status: 'ok' };
    case 'brightness':
      // Windows brightness via PowerShell
      exec(`powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${value})"`);
      return { status: 'ok' };
    case 'open-app':
      spawn(value, { detached: true, stdio: 'ignore' }).unref();
      return { status: 'ok' };
    case 'shutdown':
      exec('shutdown /s /t 60');
      return { status: 'ok' };
    case 'restart':
      exec('shutdown /r /t 60');
      return { status: 'ok' };
    case 'media':
      const keyMap = { 'playpause': 179, 'next': 176, 'prev': 177 };
      const keyCode = keyMap[value] || 179;
      exec(`powershell -Command "(new-object -com wscript.shell).SendKeys([char]${keyCode})"`);
      return { status: 'ok' };
    default:
      return { error: 'Unknown action' };
  }
});

ipcMain.handle('capture-screen', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
    if (sources.length > 0) {
      return { data: sources[0].thumbnail.toDataURL().split(',')[1] };
    }
    return { error: 'No screen found' };
  } catch (err) {
    return { error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
