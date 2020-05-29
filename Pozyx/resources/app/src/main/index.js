const PozyxTray = require('./tray');

PozyxTray.startUp();

setTimeout(function() {
  setInterval(PozyxTray.checkConnections, 500);
}, 1000);
