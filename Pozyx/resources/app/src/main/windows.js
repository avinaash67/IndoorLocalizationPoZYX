const { BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const log = require('electron-log');

const { ACTIVE_ICON, ACTIVE_ICON_HR, ERROR_ICON } = require('./constants');

const windows = {};

const WINDOW_OPENERS = {
  'app-window': appWindow,
  'details/system': systemDetails,
  'install': installWindow,
  'updates': updatesWindow,
  'onboarding': onboardingWindow,
};

ipcMain.on('open-window', (event, options) => {
  if (WINDOW_OPENERS[options.windowName]) {
    WINDOW_OPENERS[options.windowName](options);
  }
});

ipcMain.on('close-window', (event, options) => {
  if (windows[options.windowName]) {
    windows[options.windowName].close();
  }
});

function openOrFocusWindow(windowName, openWindow) {
  if (windows[windowName]) {
    windows[windowName].focus();
  } else {
    windows[windowName] = openWindow();
    windows[windowName].on('closed', () => {
      delete windows[windowName];
    });
  }
}

function showWindow(windowName, options, debug) {
  openOrFocusWindow(windowName, () => {
    let win = new BrowserWindow(options);

    if (debug) {
      win.webContents.openDevTools();
    }

    const windowPath = path.join(__static, `windows/${windowName}/index.html`);
    win.loadURL(`file://${windowPath}`);

    return win;
  });
}

function appWindow(options) {
  openOrFocusWindow('app-window', () => {
    const url = 'http://bapp.cloud.pozyxlabs.com';

    const win = new BrowserWindow({ icon: ACTIVE_ICON });

    if (options && options.tenantId && options.refreshToken) {
      const expire = new Date();
      expire.setTime(expire.getTime() + 10000);

      win.webContents.session.cookies.set({
        url,
        expirationDate: expire.getTime() / 1000,
        name: 'tenantId',
        value: options.tenantId,
      }, (err) => {
        if (err) {
          log.error(err);
        }
      });

      win.webContents.session.cookies.set({
        url,
        expirationDate: expire.getTime() / 1000,
        name: 'refreshToken',
        value: options.refreshToken,
      }, (err) => {
        if (err) {
          log.error(err);
        }
      });
    }

    win.maximize();
    win.loadURL(url, { extraHeaders: 'pragma: no-cache\n' });

    const reload = () => win.reload();
    const forceReload = () => win.webContents.reloadIgnoringCache();

    globalShortcut.register('F5', reload);
    globalShortcut.register('CommandOrControl+R', reload);
    globalShortcut.register('CommandOrControl+F5', forceReload);
    globalShortcut.register('Shift+CommandOrControl+R', forceReload);
    win.on('close', () => {
      globalShortcut.unregister('F5', reload);
      globalShortcut.unregister('CommandOrControl+R', reload);
      globalShortcut.unregister('CommandOrControl+F5', forceReload);
      globalShortcut.unregister('Shift+CommandOrControl+R', forceReload);
    });

    return win;
  });
}

function closeAppWindow() {
  if (windows['app-window']) {
    windows['app-window'].close();
  }
}

function systemDetails() {
  showWindow('details/system', { width: 500, height: 770, icon: ACTIVE_ICON });
}

function installWindow() {
  showWindow('install', { width: 1000, height: 600, icon: ACTIVE_ICON });
}

function updatesWindow() {
  showWindow('updates', { width: 450, height: 450, icon: ACTIVE_ICON, frame: false });
}

function onboardingWindow() {
  showWindow('onboarding', { width: 450, height: 600, icon: ACTIVE_ICON, titleBarStyle: 'hidden' });
}

module.exports = {
  appWindow,
  closeAppWindow,
  systemDetails,
  installWindow,
  updatesWindow,
  onboardingWindow,
};
