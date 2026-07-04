const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

const APP_NAME = 'ChemVault Mail';
const APP_ID = 'science.chemvault.mail';
const isDev = !app.isPackaged;
const rendererDevUrl = process.env.ELECTRON_RENDERER_URL;
const disableAutoUpdate = process.env.CHEMVAULT_DESKTOP_DISABLE_AUTO_UPDATE === '1';
const updateFeedUrl = process.env.CHEMVAULT_DESKTOP_UPDATE_FEED_URL;

app.setName(APP_NAME);
app.setAppUserModelId(APP_ID);

let mainWindow;
let splashWindow;
let updateDownloaded = false;
let checkingForUpdate = false;

const iconPath = () => path.join(__dirname, 'icon.ico');

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = undefined;
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 300,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    title: APP_NAME,
    icon: iconPath(),
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: false,
    },
  });

  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
    }
  });

  splashWindow.on('closed', () => {
    splashWindow = undefined;
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html')).catch((error) => {
    log('warn', 'Splash screen failed to load', error);
    closeSplashWindow();
  });
}

function log(level, ...messages) {
  const line = `[${new Date().toISOString()}] [${level}] ${messages.map(stringifyLogValue).join(' ')}\n`;
  const consoleMethod = console[level] || console.log;
  consoleMethod(line.trim());

  if (!app.isReady()) {
    return;
  }

  const logsDir = app.getPath('logs');
  fs.mkdir(logsDir, { recursive: true }, (mkdirError) => {
    if (mkdirError) {
      console.warn('Unable to create log directory', mkdirError);
      return;
    }
    fs.appendFile(path.join(logsDir, 'desktop-updater.log'), line, (appendError) => {
      if (appendError) {
        console.warn('Unable to append updater log', appendError);
      }
    });
  });
}

function stringifyLogValue(value) {
  if (value instanceof Error) {
    return `${value.message}\n${value.stack || ''}`;
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

function sendUpdaterStatus(status, payload = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', {
      status,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }
}

function configureSecurity() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    log('warn', `Denied permission request: ${permission}`);
    callback(false);
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = details.responseHeaders || {};
    responseHeaders['Content-Security-Policy'] = [
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://mail.chemvault.science https://skymail.ink wss:",
        "frame-src https://challenges.cloudflare.com",
        "form-action 'self'",
      ].join('; '),
    ];

    callback({ responseHeaders });
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: APP_NAME,
    icon: iconPath(),
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: isDev,
    },
  });

  mainWindow.once('ready-to-show', () => {
    const showMainWindow = () => {
      closeSplashWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    };

    setTimeout(showMainWindow, isDev ? 250 : 900);
  });

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isInternalNavigation(url)) {
      return;
    }

    event.preventDefault();
    openExternalUrl(url);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log('error', 'Renderer failed to load', { errorCode, errorDescription, validatedURL });
    closeSplashWindow();
  });

  if (rendererDevUrl) {
    mainWindow.loadURL(rendererDevUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function isInternalNavigation(url) {
  if (!url) {
    return false;
  }

  if (rendererDevUrl && url.startsWith(rendererDevUrl)) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'file:' || parsed.protocol === 'about:' || parsed.protocol === 'devtools:';
  } catch (error) {
    return false;
  }
}

function openExternalUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      shell.openExternal(parsed.toString());
    } else {
      log('warn', `Blocked external navigation: ${url}`);
    }
  } catch (error) {
    log('warn', `Blocked invalid external navigation: ${url}`);
  }
}

function getValidatedUpdateFeedUrl() {
  if (!updateFeedUrl) {
    return null;
  }

  try {
    const parsed = new URL(updateFeedUrl);
    const isLocalhost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsed.hostname);

    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhost)) {
      log('warn', `Ignoring insecure update feed override: ${updateFeedUrl}`);
      return null;
    }

    if (!parsed.pathname.endsWith('/')) {
      parsed.pathname = `${parsed.pathname}/`;
    }

    return parsed.toString();
  } catch (error) {
    log('warn', `Ignoring invalid update feed override: ${updateFeedUrl}`);
    return null;
  }
}

function configureUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = {
    info: (...args) => log('info', ...args),
    warn: (...args) => log('warn', ...args),
    error: (...args) => log('error', ...args),
    debug: (...args) => log('info', ...args),
  };

  const validatedFeedUrl = getValidatedUpdateFeedUrl();
  if (validatedFeedUrl) {
    autoUpdater.setFeedURL({ provider: 'generic', url: validatedFeedUrl });
    log('info', `Using Windows desktop update feed override: ${validatedFeedUrl}`);
  }

  autoUpdater.on('checking-for-update', () => {
    checkingForUpdate = true;
    sendUpdaterStatus('checking');
    log('info', 'Checking for Windows desktop update');
  });

  autoUpdater.on('update-available', async (info) => {
    checkingForUpdate = false;
    sendUpdaterStatus('available', { version: info.version });
    log('info', 'Update available', info);

    const response = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'ChemVault Mail Update',
      message: `ChemVault Mail ${info.version} is available.`,
      detail: 'You can keep working while the update downloads. Installation starts only after you choose to restart.',
      buttons: ['Download update', 'Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (response.response === 0) {
      autoUpdater.downloadUpdate().catch((error) => {
        log('error', 'Update download failed', error);
        sendUpdaterStatus('error', { message: error.message });
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    checkingForUpdate = false;
    sendUpdaterStatus('not-available', { version: info.version });
    log('info', 'No update available', info);
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdaterStatus('downloading', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', async (info) => {
    updateDownloaded = true;
    sendUpdaterStatus('downloaded', { version: info.version });
    log('info', 'Update downloaded', info);

    const response = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'ChemVault Mail Update Ready',
      message: `ChemVault Mail ${info.version} has been downloaded.`,
      detail: 'Restart when you are ready. Unsaved drafts or edits should be saved before restarting.',
      buttons: ['Restart and update', 'Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (response.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  autoUpdater.on('error', (error) => {
    checkingForUpdate = false;
    sendUpdaterStatus('error', { message: error.message });
    log('error', 'Updater error', error);
  });
}

async function checkForUpdates() {
  if (isDev || disableAutoUpdate) {
    const reason = isDev ? 'development mode' : 'CHEMVAULT_DESKTOP_DISABLE_AUTO_UPDATE=1';
    log('info', `Skipping auto update check in ${reason}`);
    sendUpdaterStatus('disabled', { reason });
    return { skipped: true, reason };
  }

  if (checkingForUpdate) {
    return { skipped: true, reason: 'already-checking' };
  }

  if (updateDownloaded) {
    return { skipped: true, reason: 'update-downloaded' };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    return { skipped: false, result: Boolean(result) };
  } catch (error) {
    log('error', 'Update check failed', error);
    sendUpdaterStatus('error', { message: error.message });
    return { skipped: false, error: error.message };
  }
}

ipcMain.handle('updater:check', () => checkForUpdates());

ipcMain.handle('updater:install', () => {
  if (updateDownloaded) {
    autoUpdater.quitAndInstall(false, true);
    return { installing: true };
  }
  return { installing: false, reason: 'no-update-downloaded' };
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    configureSecurity();
    configureUpdater();
    createSplashWindow();
    createMainWindow();
    setTimeout(() => {
      checkForUpdates();
    }, 3000);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
