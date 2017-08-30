/**
 * jsonfile.js
 * promisified json file read/write functions
 */

var jsonfile = require('jsonfile'),
  path = require('path'),
  fs = require('fs-extra'),
  Q = require('q');

var api = {};

/**
* Promisified Json File Reader
*/
api.readJsonFile = function (file) {
  var dfd = Q.defer();
  // console.log('Reading file ' + file)
  jsonfile.readFile(file, function (err, obj) {
    if (err) {
      console.log('Problem reading file ' + file, err);
      dfd.reject(new Error(err));
    } else {
      var data = {
        fileName: file,
        data: obj
      };
      dfd.resolve(data);
    }
  });
  return dfd.promise;
};

/**
* Promisified Json File Writer
*/
api.writeJsonFile = function (filename, obj) {
  var dfd = Q.defer();
  api._ensurePath(filename)
    .then(function (result) {
      jsonfile.writeFile(filename, obj, {spaces: 2}, function (err, obj) {
        if (err) {
          console.log(err);
          dfd.reject(new Error(err));
        } else {
          dfd.resolve({fileName: filename});
        }
      });
    });
  return dfd.promise;
};

/**
 * Ensure the the folder we want to write to exists...
 */
api._ensurePath = function (filename) {
  var chk = path.parse(filename).dir;
  var dfd = Q.defer();
  fs.ensureDir(chk, function (err) {
    if (err) {
      dfd.reject(err);
    }else {
      dfd.resolve();
    }
  });
  return dfd.promise;
};

module.exports = api;
