/**
 * We have found some sites with css resources that are borked.
 * This script fetches all of them, then checks if they are css or not
 */
let siteService = require('./lib/sites');
var config = require('./lib/config');
var async = require('async');
var jsonfile = require('jsonfile');
var Logger = require('./lib/logger');
var fetch = require('node-fetch');

let failedResources = [];

function cssChecker (task, callback) {
  // fetch it...
  fetch(task.cssUrl)
    .then((result) => {
      if (result.status === 200) {
        return result.text();
      } else {
        throw new Error(`Result.status = ${result.status}`);
      }
    })
    .then((styleText) => {
      // check for a particular class
      if (styleText.indexOf('.navbar-default') === -1) {
        // not in the string!
        if (styleText.indexOf('<html>') > -1) {
          let version = styleText.match(/opendata-admin .+?(?= -->)/g);
          task.error = `css resource contains admin html ${version[0]}`;
          Logger.error(`ERROR: ${task.cssUrl} contains HTML... last modified ${new Date(task.modified)} Version: ${version[0]}`);
        } else {
          task.error = '.navbar-default not found!';
          Logger.error(`ERROR: ${task.cssUrl} missing .navbar-default`);
        }
        failedResources.push(task);
      } else {
        Logger.info(`${task.url} has css in resource...`);
      }
      callback();
    })
    .catch((err) => {
      task.error = err;
      Logger.error(`ERROR: ${task.cssUrl} error fetching ${err}!`);
      failedResources.push(task);
      callback();
    });
}
// Create a queye for screencapping...
var cssCheckerQueue = async.queue(cssChecker, 100);

cssCheckerQueue.drain = function () {
  console.info('All css Tasks are complete.');
  // write oout the results...
  jsonfile.writeFile('failedCssResources.json', failedResources, {flag: 'w'}, function (err) {
    console.error(err);
  });
};

siteService.getSiteItems()
  .then((results) => {
    let sites = results.slice(0, 100000);
    // create a task to check the css...
    sites.forEach((item) => {
      let task = {
        id: item.id,
        url: item.url,
        modified: item.modified,
        cssUrl: `${config.portalBaseUrl}/sharing/rest/content/items/${item.id}/resources/opendata.css.txt`
      };
      cssCheckerQueue.push(task);
    });
  });
