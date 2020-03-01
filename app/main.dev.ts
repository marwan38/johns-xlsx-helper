/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { Intent } from '@blueprintjs/core';
import MenuBuilder from './menu';
import { Events } from './events';
import { bus, init } from './message-bus';
import xlsxFunctions from './xlsx-functions';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    webPreferences:
      process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true'
        ? {
            nodeIntegration: true
          }
        : {
            preload: path.join(__dirname, 'dist/renderer.prod.js')
          }
  });

  // Init message bus
  // needs better name convention
  init(mainWindow);

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  const x = await autoUpdater.checkForUpdatesAndNotify();
  console.log('UPDATE ----------------------');
  console.log(x);
  console.log('=========================');
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', createWindow);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

/**
 * Start app stuff..
 */

ipcMain.on(Events.Compare, async (event, args) => {
  const { file, compare, output } = args;
  try {
    bus.message('Starting compare process');
    const result = await xlsxFunctions.doCompare(compare, file);
    await result.xlsx.writeFile(output);
    bus.message(
      'Compare process done and file has been output',
      Intent.SUCCESS
    );
  } catch (e) {
    bus.message(e.message || e, Intent.ERROR);
  }
});

ipcMain.on(Events.Merge, async (event, args) => {
  const { files, output } = args;
  try {
    bus.message('Starting merge process');
    const result = await xlsxFunctions.doMerge(files);
    await result.xlsx.writeFile(output);
    bus.message('Merge process done and file has been output', Intent.SUCCESS);
  } catch (e) {
    bus.message(e.message || e, Intent.ERROR);
  }
});

ipcMain.on(Events.Find, async (event, args) => {
  const { files, output, columns, word } = args;
  try {
    bus.message('Starting find process');
    const result = await xlsxFunctions.doFind({ columns, word }, files);
    await result.xlsx.writeFile(output);
    bus.message('Find process complete', Intent.SUCCESS);
  } catch (e) {
    bus.message(e.message || e, Intent.ERROR);
  }
});

ipcMain.on(Events.GetPath, event => {
  // eslint-disable-next-line no-param-reassign
  event.returnValue = path.join(process.cwd());
});

ipcMain.on('x', () => {
  bus.message('something else');
});
