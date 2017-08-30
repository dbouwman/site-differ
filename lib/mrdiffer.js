/**
 * image differ
 */

let fs = require('fs');
let PNG = require('pngjs').PNG;
let pixelmatch = require('pixelmatch');
var Logger = require('./logger');
var Q = require('q');
var fsp = require('fs-promise');
let api = {};

/**
 * Promisified parallelized file exists check
 */
api.filesExist = function (folderName, imageName1, imageName2) {
  let checks = [];
  checks.push(fsp.exists(`${folderName}/${imageName1}`));
  checks.push(fsp.exists(`${folderName}/${imageName2}`));
  return Q.allSettled(checks)
    .then((results) => {
      let canProceed = true;
      results.forEach((result) => {
        if (result.state !== 'fulfilled') {
          canProceed = false;
        } else {
          // only override the setting if it's truthy
          if (canProceed) {
            canProceed = result.value;
          }
        }
      });
      if (!canProceed) {
        Logger.info(`Exist is returning ${canProceed} for ${folderName} with ${imageName1} and ${imageName2}`);
      }
      return canProceed;
    });
};

/**
 * Diff the files
 */
api.diffem = function (folderName, imageName1, imageName2, diffname, callback) {
  let img1 = fs.createReadStream(`${folderName}/${imageName1}`)
    .pipe(new PNG())
    .on('parsed', doneReading)
    .on('error', function () {
      Logger.error(`Error reading ${imageName1}`);
    });
  let img2 = fs.createReadStream(`${folderName}/${imageName2}`)
    .pipe(new PNG())
    .on('parsed', doneReading)
    .on('error', function () {
      Logger.error(`Error reading ${imageName2}`);
    });
  let filesRead = 0;

  function doneReading () {
    if (++filesRead < 2) return;
    var diff = new PNG({width: img1.width, height: img1.height});
    pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {threshold: 0.1});
    let ws = fs.createWriteStream(`${folderName}/${diffname}.png`);
    ws.on('finish', callback);
    ws.on('error', function () {
      Logger.error(`Error writing diff for ${diffname}`);
      callback();
    });
    diff.pack().pipe(ws);
  }
};

module.exports = api;
