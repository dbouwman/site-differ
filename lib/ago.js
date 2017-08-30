/**
 * ago.js
 * Helper that wraps up some common Portal calls
 */

var ajax = require('./ajax');
var api = {};

/**
 * Get a token from a portal, given the username + password
 */
api.getToken = function (portalBaseUrl, username, password) {
  var options = {
    url: portalBaseUrl + '/sharing/rest/generateToken?f=json',
    method: 'POST',
    form: {
      username: username,
      password: password,
      referer: portalBaseUrl
    },
    json: true
  };
  return ajax.xhr(options);
};

/**
 * Run a search at AGO
 */
api.search = function (portalBaseUrl, query, start = 1, num = 100, token = null) {
  var options = {
    method: 'GET',
    url: `${portalBaseUrl}/sharing/rest/search?f=json&q=${query}&start=${start}&num=${num}`,
    json: true
  };
  if (token) {
    options.url = options.url + '&token=' + token;
  }
  console.log(`Requesting ${options.url}`);
  return ajax.xhr(options);
};

/**
 * Get the data for an item
 */
api.getDataById = function (portalBaseUrl, id, token = null) {
  var options = {
    method: 'GET',
    url: `${portalBaseUrl}/sharing/rest/content/items/${id}/data?f=json`,
    json: true
  };
  if (token) {
    options.url = options.url + '&token=' + token;
  }
  // console.log(`Requesting ${options.url}`);
  return ajax.xhr(options);
};

/**
 * Delete an item
 */
api.remove = function (portalBaseUrl, itemId, owner, token) {
  var url = `${portalBaseUrl}/sharing/rest/content/users/${owner}/items/${itemId}/delete?f=json&token=${token}`;

  var options = {
    url: url,
    method: 'POST',
    json: true
  };

  return ajax.xhr(options);
};

module.exports = api;
