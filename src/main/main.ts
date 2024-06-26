/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import './server';
import path from 'path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath, getAssetPath } from './util';
import { logToFile } from './log';
import { _dbRoot$, dbRoot$ } from './state';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    // autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;


if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(logToFile);
};

ipcMain.on('ipc-on-got-db-root', async (event, arg) => {
  logToFile('ipc-on-got-db-root:', arg);
  if (arg.length > 0) {
    _dbRoot$.next(arg[0]);
  }
});

ipcMain.on('ipc-select-dir', async (event, arg) => {
  dialog
    .showOpenDialog({
      title: '请选择视频目录',
      // 默认打开的路径，比如这里默认打开下载文件夹
      defaultPath: app.getPath('desktop'),
      buttonLabel: '选取目录',
      properties: ['openDirectory'],
      message: '请选择Comma视频目录',
    })
    .then(({ filePaths }) => {
      if (filePaths && filePaths.length > 0) {
        event.reply('ipc-select-dir', filePaths[0]);
        _dbRoot$.next(filePaths[0]);
      }
    })
    .catch((e) => {
      console.error('showOpenDialog to selectMainDir error', e);
    });
});

ipcMain.on('ipc-show-dir', async (event, arg) => {
  shell.showItemInFolder(arg[0]);
});


const openChildWindow = (url: string, fullscreen = false) => {
  const win = new BrowserWindow({
    fullscreen,
    width: 900,
    height: 1200,
    icon: getAssetPath('icon.png'),
  });
  win.loadURL(url);
  win.menuBarVisible = false;
  win.on('ready-to-show', () => {
      win.show();
  });
};
ipcMain.on('ipc-open-comma', (event, arg) => {
  openChildWindow(arg[0]);
});


const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 900,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  mainWindow.loadURL(resolveHtmlPath('index.html'));
  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
    openChildWindow('http://localhost:8080');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.menuBarVisible = false;
  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      callback({ requestHeaders: { Origin: '*', ...details.requestHeaders } });
    },
  );

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Headers': ['*'],
        ...details.responseHeaders,
      },
    });
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  app.quit();
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(logToFile);
