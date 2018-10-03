var Logger = require('./lib/logger');
var async = require('async');
var siteService = require('./lib/sites');
// var _ = require('lodash');
var differ = require('./lib/mrdiffer');
// let siteMap = {};
let capper = require('./lib/capper');
// var fsp = require('fs-promise');
let fs = require('fs');
var jsonfile = require('jsonfile');
let AWS = require('aws-sdk');
AWS.config.loadFromPath('./.env.aws.json');

let s3Stream = require('s3-upload-stream')(new AWS.S3());

/**
 * Upload an image to s3
 */
function uploader (task, callback) {
  let filePath = `${task.dir}/${task.fileName}`;
  var read = fs.createReadStream(filePath);
  var upload = s3Stream.upload({
    Bucket: 'site-compare',
    Key: filePath,
    ACL: 'public-read',
    ContentType: 'binary/octet-stream'
  });
  upload.on('uploaded', function (details) {
    Logger.info(`Uploaded ${filePath} to S3`);
    callback();
  });
  upload.on('error', function (error) {
    Logger.error(`Error uploading ${filePath} to S3 ${error}`);
    // callback();
  });
  read.pipe(upload);
}

function uploadJsonFile (filePath) {
  var read = fs.createReadStream(filePath);
  var upload = s3Stream.upload({
    Bucket: 'site-compare',
    Key: filePath,
    ACL: 'public-read',
    ContentType: 'application/json'
  });
  upload.on('uploaded', function (details) {
    Logger.info(`Uploaded ${filePath} to S3`);
  });
  upload.on('error', function (error) {
    Logger.error(`Error uploading ${filePath} to S3 ${error}`);
  });
  read.pipe(upload);
}

var uploadQueue = async.queue(uploader, 2);
/**
 * Create screencaps, save them out, diff them...
 */
function screenCapper (task, callback) {
  // task must have props url, outputPath, filename
  Logger.info(`Taking screencap for ${task.url1} and ${task.url2} into ${task.dir}`);
  if (!fs.existsSync(task.dir)) {
    // Logger.info(`...creating ${task.dir}...`);
    fs.mkdirSync(task.dir);
  }
  // now write out the url files...
  writeUrlFile('prod.url', task.dir, task.url1);
  writeUrlFile('check.url', task.dir, task.url2);
  // create the screencaps
  capper.screencap(task.url1, task.url2, task.dir, task.imageSize, function (err) {
    if (err) {
      Logger.error(`Not uploading for ${task.dir}`);
      callback();
    } else {
      // ask diffem to diff the two images...
      let fn1 = `prod-${task.imageSize}.png`;
      uploadQueue.push({
        fileName: fn1,
        dir: task.dir
      });
      let fn2 = `compare-${task.imageSize}.png`;
      uploadQueue.push({
        fileName: fn2,
        dir: task.dir
      });

      let diffname = 'diff';
      differ.filesExist(task.dir, fn1, fn2)
        .then((exists) => {
          if (exists) {
            differ.diffem(task.dir, fn1, fn2, diffname, function () {
              // stuff the diff into an upload queue...
              uploadQueue.push({
                fileName: `${diffname}.png`,
                dir: task.dir
              });
              // and fire the callback
              callback();
            });
          } else {
            Logger.error(`Could not diff files in ${task.dir} - some files do not exist`);
            // close this queue task...
            callback();
          }
        });
    } // if
  }); // capper
}
// Create a queye for screencapping...
var screenCapQueue = async.queue(screenCapper, 2);

// message when queue is drained
screenCapQueue.drain = function () {
  console.info('All Screencap Tasks are complete.');
};
function writeUrlFile (fileName, dir, url) {
  let content = `
  [InternetShortcut]
  URL=${url}`;
  // write it out...
  let fullPath = `${dir}/${fileName}`;
  fs.writeFileSync(fullPath, content);
}

/**
 * Kick things off by getting all the public site items...
 */
let max = 5000;
let allTasks = [];
let ownerPurgeList = ['GHudginsTNG', 'andrewstauffer', 'aturner', 'cclaessens_cityx',
  'cclaessens', 'cclaessensTNG', 'chuyujin_l10nRelease', 'cityofx_admin', 'dbouwman',
  'ghudgins5', 'KKantharaj_statesales', 'laur7006@esri.com_citygov', 'LocalGovDevelopmentScott',
  'mattviverito_esri', 'mperry_dcdev', 'phammons_dcdev', 'phammons_citygov',
  'support_jlanteigne'];
let imageSize = '1000x1200';
siteService.getSiteItems()
  .then((results) => {
    // create list of things to capture...
    let ct = 0;
    results.map((item) => {
      // don't run if we own it...
      if (!ownerPurgeList.includes(item.owner)) {
        let dir = item.url.split('//')[1];
        // homepage diff task...
        let task = {
          siteId: item.id,
          imageSize: imageSize,
          url1: item.url,
          url2: `http://siteviewer.surge.sh/#/${item.id}`,
          url1Img: `images/${dir}/prod-${imageSize}.png`,
          url2Img: `images/${dir}/compare-${imageSize}.png`,
          diffImg: `images/${dir}/diff.png`,
          owner: item.owner,
          dir: `images/${dir}`
        };
        // datasets route diff
        let datasetsTask = {
          siteId: item.id,
          imageSize: imageSize,
          url1: item.url + '/datasets',
          url2: `http://siteviewer.surge.sh/#/${item.id}/datasets`,
          url1Img: `images/${dir}-datasets/prod-${imageSize}.png`,
          url2Img: `images/${dir}-datasets/compare-${imageSize}.png`,
          diffImg: `images/${dir}-datasets/diff.png`,
          owner: item.owner,
          dir: `images/${dir}-datasets`
        };
        if (ct <= max) {
          allTasks.push(task);
          allTasks.push(datasetsTask);
          screenCapQueue.push(task);
          screenCapQueue.push(datasetsTask);
        } else {
          console.info(`MAX of ${max} reached: Skipping ${item.url}`);
        }
        ct++;
      }
    });
    console.info(`Looking at ${ct} sites`);
    jsonfile.writeFile('tasks.json', allTasks, {flag: 'w'}, function (err) {
      console.error(err);
    });
    uploadJsonFile('tasks.json');
  });
