/**
 * opendata.js
 * Helper that handles requests to the opendata api
 */

var ajax = require('./ajax');
var Logger = require('./logger');
var api = {};

api.getSiteById = function (apiBaseUrl, siteId, token = null) {
  var options = {
    method: 'GET',
    url: `${apiBaseUrl}/api/v2/sites/${siteId}`,
    json: true
  };
  if (token) {
    options.url = options.url + '&token=' + token;
  }
  Logger.info(`Requesting ${options.url}`);
  return ajax.xhr(options);
};

module.exports = api;
