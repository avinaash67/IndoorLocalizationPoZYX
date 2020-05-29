<template>
  <div>
    <div v-if="upToDate === null || downloading || unzipping" id="slidingbackground"></div>

    <div style="position: absolute; top: 7px; left: 10px; cursor: pointer; z-index: 9999;" @click="close">
      <i class="fas fa-times has-text-white-bis"></i>
    </div>

    <div class="column has-text-centered" style="width: 100%; max-width: 370px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding-bottom: 10vh;">

      <img src="../../images/Logo-Pozyx-Only-Squared-White.png" style="width: 90%; max-width: 60px; margin: 0 auto 25px auto; display: block;" :class="{ 'breath': upToDate === null || downloading || unzipping }" />

      <p v-if="upToDate === null" class="has-text-white-bis" style="">Checking for Updates...</p>

      <div v-if="!downloading && !unzipping && !installed">
        <a v-if="upToDate === false" class="button is-ghost" @click="download"><i class="fas fa-play"></i> &nbsp; Start Installation</a>
        <a v-if="upToDate === true" class="button is-ghost" @click="download"><i class="fas fa-sync"></i> &nbsp; Rerun installation</a>

        <p v-if="upToDate !== null" class="has-text-white-bis has-text-weight-light" style="margin-top: 10px; font-size: 90%;">Requires an internet connection</p>
      </div>

      <progress v-if="downloading" class="progress" :value="this.downloadLoaded" :max="this.downloadTotal">{{ (this.downloadLoaded / this.downloadTotal) * 100 }}%</progress>
      <p v-if="downloading" class="has-text-white-bis" style="">Downloading...</p>
      <progress v-if="unzipping" class="progress" :value="this.unzippedEntries" :max="this.zipEntries">{{ (this.unzippedEntries / this.zipEntries) * 100 }}%</progress>
      <p v-if="unzipping" class="has-text-white-bis" style="">Unpacking...</p>
      <a v-if="downloading || unzipping" class="button is-ghost" @click="cancel" style="margin-top: 17px;">Cancel</a>

      <p v-if="installed && osIsWindows && !driverInstalled" class="has-text-white-bis" style="margin-bottom: 20px;">
        If you haven't already, install<br/>the USB driver
      </p>
      <a v-if="installed && osIsWindows && !driverInstalled" class="button is-ghost" @click="installDriver" style="margin-right: 15px;">Install driver</a>
      <a v-if="installed && osIsWindows && !driverInstalled" class="button is-ghost" @click="login">Continue without</a>

      <div v-if="installed && osIsLinux">
        <p class="has-text-white-bis" style="margin-bottom: 15px;">
          Grant your user access to the <br/>serial port. For Ubuntu:
        </p>

        <p class="has-text-white-bis" style="margin-bottom: 20px; font-family: Courier; background-color: rgba(255,255,255,0.1); padding: 3px 6px; text-align: left; border-radius: 3px;">
          sudo chmod 666 /dev/ttyACM0<br />
          sudo adduser $USER dialout
        </p>

        <p class="has-text-white-bis" style="margin-bottom: 15px;">
          Install following package:
        </p>

        <p class="has-text-white-bis" style="margin-bottom: 20px; font-family: Courier; background-color: rgba(255,255,255,0.1); padding: 3px 6px; text-align: left; border-radius: 3px;">
          sudo apt install libappindicator1
        </p>
      </div>

      <p v-if="installed && (osIsDarwin || driverInstalled)" class="has-text-white-bis" style="margin-bottom: 20px;">Successfully installed!</p>
      <a v-if="installed && (!osIsWindows || driverInstalled)" class="button is-ghost" @click="login">Continue</a>
    </div>
  </div>
</template>

<script>
  import axios from 'axios';
  import log from 'electron-log';
  import { ipcRenderer } from 'electron';
  import Store from 'electron-store';
  import fs from 'fs-extra';
  import path from 'path';
  import yauzl from 'yauzl';
  import os from 'os';
  import { exec } from 'child_process';
  import pRetry from 'p-retry';

  const store = new Store({
    name: "pozyx-server-config"
  });

  if (!store.get('installLocation')) {
    store.set('installLocation', path.join(app.getPath('home'), '.pozyx-server'));
  }

  export default {
    name: 'updates',
    data() {
      return {
        upToDate: null,

        downloading: false,
        downloadLoaded: 0,
        downloadTotal: 1,

        unzipping: false,
        unzippedEntries: 0,
        zipEntries: 1,

        installed: false,

        osIsWindows: process.platform === 'win32',
        osIsLinux: process.platform === 'linux',
        osIsDarwin: process.platform === 'darwin',
        driverInstalled: false,

        cancelled: false,

        cancelTokenSource: axios.CancelToken.source(),
      };
    },
    mounted() {
      this.checkUpdates();
    },
    methods: {
      checkUpdates() {
        setTimeout(() => {
          const installedLocation = store.get('installLocation');

          // const foldersExist =  && fs.existsSync(path.join(installedLocation, 'gateway'));
          // let subFoldersExists = foldersExist && fs.existsSync(path.join(installedLocation, 'core', `core${process.platform === 'win32' ? '.exe' : ''}`)) &&
          //   fs.existsSync(path.join(installedLocation, 'gateway', `gateway${process.platform === 'win32' ? '.exe' : ''}`));

          this.upToDate = fs.existsSync(installedLocation);
        }, 2000);
      },

      download() {
        if (this.downloading) {
          return;
        }

        const downloadLocations = {
          'win32': 'win',
          'darwin': 'macos',
          'linux': 'linux'
        };
        const downloadLocation = downloadLocations[process.platform];

        if (!downloadLocation) {
          return
        }

        ipcRenderer.send('stop-server');

        this.cancelled = false;
        this.downloading = true;

        axios({
          method: 'get',
          url: `http://diy.cloud.pozyxlabs.com/${downloadLocation}.zip`,
          responseType: 'blob',
          onDownloadProgress: (progress) => {
            this.downloadLoaded = progress.loaded;
            this.downloadTotal = progress.total;
          },
          cancelToken: this.cancelTokenSource.token,
        }).then((response) => {
          if (this.cancelled) {
            return;
          }

          const targetFile = this.fileInstallLocation('pozyx-server.zip');

          if (response.statusText !== 'OK') {
            this.downloading = false;
            throw new Error(`Unable to download, server returned ${response.status} ${response.statusText}`);
          }

          const body = response.data;
          var fileReader = new FileReader();

          fileReader.onload = () => {
            fs.outputFileSync(targetFile, Buffer.from(new Uint8Array(fileReader.result)));

            this.downloading = false;

            this.unzipFile(targetFile).then(() => {
              this.installed = true;

              if (!this.osIsWindows) {
                exec(`chmod +x ${path.join(store.get('installLocation'), 'gateway-api', 'gateway-api')}`);
                exec(`chmod +x ${path.join(store.get('installLocation'), 'core-diy', 'core')}`);
              }
            });
          };
          fileReader.readAsArrayBuffer(body);

        }).catch((err) => {
          log.error(err);
        });
      },

      fileDownloadDestination(filename) {
        return path.join(os.tmpdir(), 'pozyx', filename);
      },

      fileInstallLocation(filename) {
        return path.join(store.get('installLocation'), filename);
      },

      unzipFile(filePath) {
        return new Promise((resolve, reject) => {
          this.unzipping = true;

          yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
            if (err) {
              this.unzipping = false;
              throw err;
            }

            this.zipEntries = zipfile.entryCount;
            this.unzippedEntries = 0;

            zipfile.readEntry();

            zipfile.on('end', () => {
              resolve();
              this.unzipping = false;
            });

            zipfile.on('entry', (entry) => {
              if (this.cancelled) {
                return;
              }

              if (/\/$/.test(entry.fileName)) {
                // Directory file names end with '/'.
                // Note that entries for directories themselves are optional.
                // An entry's fileName implicitly requires its parent directories to exist.
                const dir = this.fileInstallLocation(entry.fileName);
                fs.ensureDirSync(dir);
                zipfile.readEntry();

              } else {
                // File entry
                zipfile.openReadStream(entry, (err, readStream) => {
                  if (err) {
                    throw err;
                  }

                  const dir = path.dirname(this.fileInstallLocation(entry.fileName));
                  fs.ensureDirSync(dir);

                  readStream.on('end', () => {
                    zipfile.readEntry();
                  });

                  const writeStream = fs.createWriteStream(this.fileInstallLocation(entry.fileName));

                  readStream.pipe(writeStream);
                });
              }

              this.unzippedEntries += 1;
            });
          });
        });
      },

      cancel() {
        this.cancelled = true;
        this.downloading = false;
        this.unzipping = false;

        this.cancelTokenSource.cancel();
        this.cancelTokenSource = axios.CancelToken.source();
      },

      installDriver() {
        this.driverInstalled = true;

        ipcRenderer.send('install-usb-driver');
      },

      login() {
        ipcRenderer.send('start-server');

        pRetry(() => axios.get('http://localhost:4000/status'), { retries: 40, minTimeout: 50, maxTimeout: 500 })
          .then(({ data }) => {
            if (!data.authenticated) {
              ipcRenderer.send('open-window', {
                windowName: 'onboarding',
              });
            }

            ipcRenderer.send('close-window', {
              windowName: 'updates',
            });
          })
          .catch(() => {
            ipcRenderer.send('close-window', {
              windowName: 'updates',
            });
          });
      },

      close() {
        ipcRenderer.send('close-window', {
          windowName: 'updates',
        });
      },
    },
  };
</script>
