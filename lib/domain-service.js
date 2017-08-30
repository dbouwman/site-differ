/**
 * Hacky domain service module
 */
var config = require('./config');
var Q = require('q');
var ajax = require('./ajax');
let api = {};

api.removeDomainsForSite = function (siteId, token) {
  return api.fetchDomainsForSite(siteId, token)
  .then((results) => {
    let deletePromises = [];
    if (results.length) {
      results.forEach((entry) => {
        console.log(`Deleting domain ${entry.hostname} for site ${entry.siteTitle}`);
        deletePromises.push(api.deleteDomainEntry(entry.id, token));
      });
    } else {
      console.log(`No domains found for site ${siteId}`);
    }

    return Q.allSettled(deletePromises);
  })
  .then((results) => {
    // so... log out if something did not delete for some reason?
    results.forEach((result) => {
      if (result.state === 'fulfilled') {
        console.log('Domain deletion successful...');
      } else {
        console.log('Domain deletion failed ' + JSON.stringify(result.reason));
      }
    });
    return;
  });
};

api.fetchDomainsForSite = function (siteId, token) {
  var opendataApiUrl = config.apiBaseUrl;
  var options = {
    method: 'GET',
    url: `${opendataApiUrl}/utilities/domains?siteId=${siteId}&token=${token}`,
    json: true
  };
  // console.log(`Requesting ${options.url}`);
  return ajax.xhr(options);
};

api.deleteDomainEntry = function (id, token) {
  var opendataApiUrl = config.apiBaseUrl;
  var options = {
    method: 'DELETE',
    url: `${opendataApiUrl}/utilities/domains/${id}?token=${token}`,
    json: true
  };
  console.log(`DELETE TO ${options.url}`);
  return ajax.xhr(options);
};

module.exports = api;
