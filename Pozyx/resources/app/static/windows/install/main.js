const dialog = require('electron').remote.dialog;
const app = require('electron').remote.app;
const log = require('electron-log');

const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const axios = require('axios');
const yauzl = require('yauzl');

const Store = require('electron-store');
const store = new Store({
  name: "pozyx-server-config"
});

function verifyInstalledLocation(installedLocation) {
  // TODO check for installed core (with version)
  const foldersExist = fs.existsSync(`${installedLocation}/core`) && fs.existsSync(`${installedLocation}/gateway`)
  if (foldersExist) {
    if (process.platform === "win32") {
      return fs.existsSync(`${installedLocation}/core/core.exe`) && fs.existsSync(`${installedLocation}/gateway/gateway.exe`)
    } else if (process.platform === "linux" || process.platform === "darwin") {
      return fs.existsSync(`${installedLocation}/core/core`) && fs.existsSync(`${installedLocation}/gateway/gateway`)
    } else {
      log.error(`OS type ${process.platform} not supported!`)
      return false;
    }
  } else {
    return false;
  }
  // TODO check for installed gateway (with version?)
}

function selectInstallFolder() {
  const selectedPath = dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (selectedPath) {
    updateInstallLocation(selectedPath);
  }
}

function resetInstallFolder() {
  updateInstallLocation(path.join(app.getPath('home'), '.pozyx-server'));
}

function selectDirectory() {
  log.log("SELECTING DIRECTORY!");
  const selectedPath = dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (selectedPath) {
    log.log("Selected path:", selectedPath);

    const isInstalled = verifyInstalledLocation(selectedPath);
    if (isInstalled) {
      store.set('installLocation', selectedPath);
    }
    log.log(isInstalled);
  }
}

var elem = document.getElementById("myBar");
function move(loaded, total) {
    const percent = (100 * loaded / total).toFixed(0)
    elem.style.width = percent + '%';
}

function fileInstallLocation(filename) {
  return path.join(store.get('installLocation'), filename);
}

async function unzipFile(filePath) {
  yauzl.open(filePath, {lazyEntries: true}, function(err, zipfile) {
    if (err) throw err;
    zipfile.readEntry();
    zipfile.on("entry", function(entry) {
      log.log(entry);
      if (/\/$/.test(entry.fileName)) {
        // Directory file names end with '/'.
        // Note that entires for directories themselves are optional.
        // An entry's fileName implicitly requires its parent directories to exist.
        const dir = fileInstallLocation(entry.fileName);
        fs.ensureDirSync(dir);
        zipfile.readEntry();
      } else {
        // file entry
        zipfile.openReadStream(entry, function(err, readStream) {
          const dir = path.dirname(fileInstallLocation(entry.fileName));
          fs.ensureDirSync(dir);

          if (err) throw err;
          readStream.on("end", function() {
            zipfile.readEntry();
          });

          const writeStream = fs.createWriteStream(fileInstallLocation(entry.fileName));

          readStream.pipe(writeStream);
        });
      }
    });
  });
}

async function download(sourceUrl, targetFile, progressCallback, length) {
  const response = await axios({
    method: 'get',
    url: sourceUrl,
    responseType: 'blob',
    onDownloadProgress: function(progress) {
      log.log(progress);
      move(progress.loaded, progress.total)
    },
  });

  log.log(response);

  if (response.statusText !== "OK") throw Error(`Unable to download, server returned ${response.status} ${response.statusText}`);

  const finalLength = length || parseInt(response.headers['content-length'] || '0', 10);
  const body = response.data;

  // https://stackoverflow.com/questions/39395195/how-to-write-wav-file-from-blob-in-javascript-node/40066768
  var fileReader = new FileReader();

  fileReader.onload = function() {
    fs.outputFileSync(targetFile, Buffer.from(new Uint8Array(this.result)));

    unzipFile(targetFile);
  };
  fileReader.readAsArrayBuffer(body);
}


function fileDownloadDestination(filename) {
  return path.join(os.tmpdir(), 'pozyx', filename);
}


function downloadCore() {
  download('https://www.pozyx.io/assets/downloads/pozyx-beta.zip', fileDownloadDestination('core.zip'),
     (bytes, percent) => log.log(`Downloaded ${bytes} (${percent})`));
}


function downloadLibrary() {
  download('https://github.com/pozyxLabs/Pozyx-Python-library/archive/master.zip', fileDownloadDestination('lib.zip'),
     (bytes, percent) => log.log(`Downloaded ${bytes} (${percent})`));
}

function updateInstallLocation(installLocation) {
  var elem = document.getElementById("installLocation");
  elem.innerText = `Install location: ${installLocation}`;
  store.set('installLocation', installLocation);
}


updateInstallLocation(store.get('installLocation'));
