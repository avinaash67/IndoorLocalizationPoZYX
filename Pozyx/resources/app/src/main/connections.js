const axios = require('axios');
// const log = require('electron-log');

// from Axios docs https://github.com/axios/axios#handling-errors
function httpErrorString(error) {
  // log.log(error.config);
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    return `data: ${error.response.data}, status: ${error.response.status}, headers: ${error.response.headers}`
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    return `${error.request}`
  } else {
    // Something happened in setting up the request that triggered an Error
    return `Error, ${error.message}`
  }
}

function coreConnection() {
  return axios.get('http://localhost:5000/v1.0/system')
}

function gatewayConnection() {
  return axios.get('http://localhost:4000/status')
}

function logoutGateway() {
  return axios.get('http://localhost:4000/logout')
}

function getIsCoreRunning() {
  return new Promise(function(resolve, reject) {
    coreConnection()
      .then(function(response) {
        resolve(true);
      })
      .catch(function(error) {
        if (error.response) {
          resolve(true);
        } else if (error.request) {
          resolve(false);
        } else {
          reject("Weird stuff!")
        }
      })
  });
}

function getIsGatewayRunning() {
  return new Promise(function(resolve, reject) {
    gatewayConnection()
      .then(function(response) {
        resolve(true);
      })
      .catch(function(error) {
        if (error.response) {
          resolve(true);
        } else if (error.request) {
          resolve(false);
        } else {
          reject("Weird stuff!")
        }
      })
  });
}

module.exports = {
  coreConnection,
  gatewayConnection,
  logoutGateway,
  getIsCoreRunning,
  getIsGatewayRunning,
  httpErrorString,
}
