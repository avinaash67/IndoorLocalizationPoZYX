const path = require('path');

module.exports = {
  make_targets: {
    win32: [
      'squirrel',
    ],
    darwin: [
      'dmg',
    ],
    linux: [
      'deb',
      // 'rpm',
    ],
  },
  electronPackagerConfig: {
    packageManager: 'yarn',
    icon: path.resolve(__dirname, 'static/images/icon'),
  },
  electronWinstallerConfig: {
    name: 'gateway_tray',
    description: 'Pozyx',
  },
  electronInstallerDebian: {},
  electronInstallerRedhat: {},
  github_repository: {
    owner: '',
    name: '',
  },
  windowsStoreConfig: {
    packageName: '',
    name: 'gatewaytray',
  },
};
