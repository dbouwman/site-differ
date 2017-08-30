/**
 * Simple wrapepr over screen cap util
 */

let Pageres = require('pageres');
var Logger = require('./logger');
let api = {};

api.screencap = function (url1, url2, dir, size, callback) {
  let p = new Pageres({delay: 45, timeout: 120})
    .src(url1, [size], {filename: 'prod-<%= size %>'})
    .src(url2, [size], {filename: 'compare-<%= size %>'})
    .dest(dir);

  p.run()
    .then(() => {
      callback();
    })
    .catch((err) => {
      Logger.error(`Warning capturing ${url1}:: ${JSON.stringify(err)}`);
      callback(err);
    });
};

module.exports = api;
