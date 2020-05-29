const path = require('path');

// current workaround for production
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '../../static').replace(/\\/g, '\\\\')
}

const ACTIVE_ICON = path.join(__static, 'icons/16x16.png');
const ACTIVE_ICON_HR = path.join(__static, 'icons/64x64.png');
const ERROR_ICON = path.join(__static, 'icons/16x16-error.png');
const ERROR_ICON_HR = path.join(__static, 'icons/64x64-error.png');

const ON_ICON = path.join(__static, 'icons/on.png');
const OFF_ICON = path.join(__static, 'icons/off.png');

const POZYX_LOGO = path.join(__static, 'images/Logo-Pozyx-Only-Squared.png');

module.exports = {
  ACTIVE_ICON,
  ACTIVE_ICON_HR,
  ERROR_ICON,
  ERROR_ICON_HR,
  ON_ICON,
  OFF_ICON,
  POZYX_LOGO,
};
