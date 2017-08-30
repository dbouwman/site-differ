var ago = require('./ago');
var config = require('./config');
var Logger = require('./logger');
var Q = require('q');
let api = {};

/**
 * Make paged queries to get all the siteItems that are public...
 */
api.getSiteItems = function getSiteItems () {
  let publicSiteItems = [];
  let blocksize = 100;
  return ago.search(config.portalBaseUrl, `typekeywords:hubSite`, 1, 1)
    .then((searchResults) => {
      // usign this we get the total number of results, which we will page in blocks of N
      var total = searchResults.total;
      let pagedPromises = [];
      for (var i = 1; i < total; i = i + blocksize) {
        Logger.info(`Fetching from ${i} in blocks of ${blocksize}`);
        pagedPromises.push(ago.search(config.portalBaseUrl, `typekeywords:hubSite`, i, blocksize));
      }
      return Q.allSettled(pagedPromises);
    })
    .then((pagedResults) => {
      // iterate all the resultsets...
      pagedResults.forEach((result) => {
        // stuff the items into the publicSiteItems array...
        if (result.state === 'fulfilled') {
          result.value.results.forEach((itm) => {
            // make sure we do not nuke things we *MUST* keep...
            publicSiteItems.push(itm);
          });
        }
      });
      Logger.info(`Got ${publicSiteItems.length} public sites...`);
      return publicSiteItems;
    });
};

module.exports = api;
