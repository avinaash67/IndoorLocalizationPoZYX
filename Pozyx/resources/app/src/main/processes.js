const { ipcMain } = require('electron');
const { spawn, exec } = require('child_process');
const log = require('electron-log');
const path = require('path');
const Store = require('electron-store');
const os = require('os');

const store = new Store({
  name: "pozyx-server-config"
});

const osIsWindows = process.platform === 'win32';

const suffix = osIsWindows ? '.exe' : '';

function startCore() {
  log.log("STARTING CORE");
  // const core = spawn('python', ['main.py', '-c', 'sim', '-r'], {cwd: '../../DIY/core-diy'});

  const coreDir = path.join(store.get('installLocation'), 'core-diy');
  const corePath = path.join(coreDir, `core${suffix}`);

  const core = spawn(corePath, { cwd: coreDir });

  core.on('error', function(e) {log.log('Core error, code', e);});
  core.on('close', function(e) {log.log('Core closed, code:', e);});
  // Doing this prevents the core from for some absurd reason stopping...
  core.stdout.on('data', function() {});
  core.stderr.on('data', function(data) {
    log.log("Core error output:", data.toString());
  });
  return core;
}

function startGateway() {
  log.log("STARTING GATEWAY");
  // const gateway = spawn('npm', ['start'], {cwd: '../gateway-api'});

  const gatewayDir = path.join(store.get('installLocation'), 'gateway-api');
  const gatewayPath = path.join(gatewayDir, `gateway-api${suffix}`);

  const gateway = spawn(gatewayPath, { cwd: gatewayDir });

  gateway.on('error', function(e) {log.log('Gateway error, code', e);});
  gateway.on('close', function(e) {log.log('Gateway closed, code:', e);});
  // Write hook so can be used later?
  gateway.stdout.on('data', function() {});
  gateway.stderr.on('data', function(data) {
    log.log("Gateway error output:", data.toString());
  });
  return gateway;
}

ipcMain.on('install-usb-driver', installUsbDriver);
function installUsbDriver() {
  log.log("INSTALLING USB DRIVER");

  if (!osIsWindows) {
    return;
  }

  const osRelease = os.release();

  // https://stackoverflow.com/questions/42524606/how-to-get-windows-version-using-node-js
  const osMajor = parseInt(osRelease.substring(0, osRelease.indexOf('.')), 10);
  const osMinor = parseInt(osRelease.substring(osRelease.indexOf('.') + 1, osRelease.indexOf('.', osRelease.indexOf('.') + 1)), 10);

  const osIsWindows8Newer = osMajor > 6 || (osMajor === 6 && osMinor >= 2);
  const osIsWindows64bit = process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');

  let driverDir;
  let driverPath;

  if (osIsWindows8Newer) {
    driverDir = path.join(store.get('installLocation'), 'usb-driver', 'Win8');
  } else {
    driverDir = path.join(store.get('installLocation'), 'usb-driver', 'Win7');
  }

  if (osIsWindows64bit) {
    driverPath = path.join(driverDir, 'dpinst_amd64.exe');
  } else {
    driverPath = path.join(driverDir, 'dpinst_x86.exe');
  }

  exec(driverPath, { cwd: driverDir });
}

module.exports = {
  startCore,
  startGateway,
  installUsbDriver,
};
