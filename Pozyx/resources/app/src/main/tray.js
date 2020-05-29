const { app, Menu, Tray, dialog, shell, Notification, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const log = require('electron-log');

const {
  systemDetails,
  appWindow,
  closeAppWindow,
  installWindow,
  updatesWindow,
  onboardingWindow,
} = require('./windows')

const {
  coreConnection,
  gatewayConnection,
  logoutGateway,
  getIsCoreRunning,
  getIsGatewayRunning,
  httpErrorString,
} = require('./connections')

const {
  ACTIVE_ICON,
  ACTIVE_ICON_HR,
  ERROR_ICON,
  ERROR_ICON_HR,
  ON_ICON,
  OFF_ICON,
} = require('./constants');

const {
  startCore,
  startGateway,
  installUsbDriver,
} = require('./processes');

const Store = require('electron-store');
const store = new Store({
  name: "pozyx-server-config"
});

if (!store.get('installLocation')) {
  store.set('installLocation', path.join(app.getPath('home'), '.pozyx-server'));
}

let active = false;
let tray = null;
let authenticated = false;
let pozyxConnected = false;
let shouldUpdate = false;
let displays;
let gateway;
let core;
let coreRunningExternally = false;
let gatewayRunningExternally = false;

const onError = function(e) {
  log.log("ERROR IN PROCESS", e);
}

const onExit = function() {
  log.log("EXITED")
}

function quitApplication() {
  if (core) {
    core.kill();
  }
  if (gateway) {
    gateway.kill();
  }

  app.quit();
}

ipcMain.on('stop-server', () => {
  stopCore();
  stopGateway();
});

ipcMain.on('start-server', () => {
  // TODO: booleans not set correctly?
  if (!coreRunningExternally) {
    restartCore();
  }
  if (!gatewayRunningExternally) {
    restartGateway();
  }
});

function stopCore() {
  if (core) {
    core.kill();
  }
  core = null;
}

function restartCore() {
  if (core) {
    core.kill();
  }
  core = startCore();
}

function stopGateway() {
  if (gateway) {
    gateway.kill();
  }
  gateway = null;
}

function restartGateway() {
  if (gateway) {
    gateway.kill();
  }
  gateway = startGateway();
}

function restartAll() {
  if (core) {
    restartCore();
  }
  if (gateway) {
    restartGateway();
  }
}

function makeContextMenu() {
  const items = [
    {
      label: pozyxConnected ? "Pozyx device connected" : "No Pozyx device connected",
      icon: pozyxConnected ? ON_ICON : OFF_ICON,
      enabled: false,
    },
    {
      label: authenticated ? "Authenticated" : "Not authenticated",
      icon: authenticated ? ON_ICON : OFF_ICON,
      enabled: false,
    },
    {
      type: 'separator'
    },
    {
      label: "Open Visualization",
      click: appWindow,
    },
    {
      label: "Open Visualization (browser)",
      click: function () {
        shell.openExternal('http://bapp.cloud.pozyxlabs.com', { activate: true })
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'System details',
      click: systemDetails,
    },
    // {
    //   label: 'Restart',
    //   type: 'submenu',
    //   submenu: [
    //     core === undefined ? {label: "Core managed externally", enabled: false} :
    //     {
    //       label: "Core",
    //       click: restartCore,
    //     },
    //     gateway === undefined ? {label: "Gateway managed external", enabled: false} :
    //     {
    //       label: "Gateway",
    //       click: restartGateway,
    //     },
    //     {
    //       label: "All",
    //       enabled: gateway !== undefined && core !== undefined,
    //       click: restartAll,
    //     },
    //   ]

    // },
    {
      label: 'Restart services',
      enabled: (gateway !== null && typeof gateway !== 'undefined') || (core !== null && typeof core !== 'undefined'),
      click: restartAll,
    },
    // {
    //   label: 'Check for Updates... Old',
    //   click: installWindow,
    // },
    //
    {
      type: "checkbox",
      label: "Open app on startup",
      checked: store.get('openAppOnStartup') !== false,
      click: toggleOpenAppOnStartup,
    },
    // {
    //   label: 'Check for Updates...',
    //   click: updatesWindow,
    // },
    {
      label: authenticated ? "Log out" : "Log in",
      click: authenticated ? logout : onboardingWindow,
    },
    {
      label: 'Quit',
      accelerator: "CommandOrControl+Q",
      click: quitApplication,
    },
  ];

  // if (process.platform === 'win32') {
  //   items.splice(items.length - 2, 0, {
  //     label: 'Install USB driver',
  //     click: installUsbDriver,
  //   })
  // }
  return Menu.buildFromTemplate(items);
}

function logout() {
  logoutGateway()
    .then(() => {
      closeAppWindow();
      onboardingWindow();
    })
    .catch(() => {
      closeAppWindow();
      onboardingWindow();
    });
}

app.on('ready', () => {
  tray = new Tray(pozyxConnected ? ACTIVE_ICON : ERROR_ICON);

  tray.setToolTip('Pozyx');
  tray.setContextMenu(makeContextMenu(true, true))
});

// prevent tray from being killed
app.on('window-all-closed', () => {

});

function toggleOpenAppOnStartup() {
  const openAppOnStartup = store.get('openAppOnStartup') !== false;
  store.set('openAppOnStartup', !openAppOnStartup);
  const contextMenu = makeContextMenu()
  tray.setContextMenu(contextMenu)
}

function updateContextMenu() {
  // required for linux
  if (shouldUpdate) {
    const contextMenu = makeContextMenu()
    tray.setToolTip('Pozyx');
    tray.setContextMenu(contextMenu)
    shouldUpdate = false;
  }
}

function setActive(active) {
  if (tray) {
    tray.setImage(active ? ACTIVE_ICON : ERROR_ICON);
    updateContextMenu();
  }
}

function notifyPozyxConnected() {
  const notification = new Notification({
    title: "Pozyx",
    body: "Device connected",
    icon: ACTIVE_ICON_HR,
  })
  notification.show()
  shouldUpdate = true;
}

function notifyPozyxDisconnected() {
  const notification = new Notification({
    title: "Pozyx",
    body: "Device disconnected",
    icon: ERROR_ICON_HR,
  })
  notification.show()
  shouldUpdate = true;
}

function notifyCoreDisconnected() {
  const notification = new Notification({
    title: "Pozyx",
    body: "Core server disconnected",
    icon: ERROR_ICON
  })
  notification.show()
  shouldUpdate = true;
}

function checkGateway() {
  return new Promise(function(resolve, reject) {
    gatewayConnection()
      .then(function(response) {
        const { data } = response;
        const { authenticated: gatewayAuthenticated } = data;
        if (authenticated !== gatewayAuthenticated) {
          authenticated = gatewayAuthenticated;
          shouldUpdate = true;
        }
        resolve();
      })
      .catch(function(error) {
        log.log('Error checking gateway: ', httpErrorString(error));
        if (authenticated !== false) {
          authenticated = false;
          shouldUpdate = true;
        }
        reject('Error checking gateway', httpErrorString(error));
      });
  });
}

function checkCoreConnection() {
  return new Promise(function(resolve, reject) {
    coreConnection()
      .then(function (response) {
        const { data } = response;

        if (data) {
          const { status, pozyxStatus } = data;

          if ((status === "NOT_CONNECTED" || pozyxStatus === "NOT_CONNECTED") && pozyxConnected) {
            pozyxConnected = false;
            notifyPozyxDisconnected();
            tray.setImage(ERROR_ICON);
          } else if (((!pozyxStatus && status !== "NOT_CONNECTED") || (pozyxStatus === "CONNECTED")) && !pozyxConnected) {
            pozyxConnected = true;
            notifyPozyxConnected();
            tray.setImage(ACTIVE_ICON);
          }
        }
        resolve();
      })
      .catch(function (error) {
        log.log("Error in getting core status", httpErrorString(error));
        if (pozyxConnected) {
          pozyxConnected = false;
          notifyCoreDisconnected();
          tray.setImage(ERROR_ICON);
        }
        reject('Error in getting core status', httpErrorString(error));
      });
  });
}

function checkConnections() {
  const cloudCheck = checkGateway();
  const coreCheck = checkCoreConnection()

  Promise.all([cloudCheck, coreCheck])
    .then(() => {
      updateContextMenu();
  })
    .catch((err) => {
      updateContextMenu();
  });
}

function openAppOnStartup() {
  checkGateway().then(() => {
    if (authenticated) {
      if (store.get('openAppOnStartup') !== false) {
        appWindow();
      }
    } else {
      onboardingWindow();
    }
  });
}

function startUp() {
  const isInstalled = fs.existsSync(store.get('installLocation'));

  if (isInstalled) {
    getIsCoreRunning()
      .then(function(isCoreRunning) {
        coreRunningExternally = isCoreRunning;

        if (!isCoreRunning) {
          core = startCore();
        } else {
          log.log("Core is already running")
        }
      })
      .catch(function(error) {
        log.log("Start core => ", error);
      });

    getIsGatewayRunning()
      .then(function(isGatewayRunning) {
        gatewayRunningExternally = isGatewayRunning;

        if (!isGatewayRunning) {
          gateway = startGateway();
          setTimeout(openAppOnStartup, 1000);
        } else {
          log.log("Gateway is already running");
          openAppOnStartup();
        }
      })
      .catch(function(error) {
        log.log("Start gateway => ", error);
      });

  } else {
    app.on('ready', updatesWindow);
  }
}

module.exports = {
  setActive,
  checkConnections,
  checkGateway,
  checkCoreConnection,
  startUp,
};
