/* jshint node: true */
/**
 * logger.js
 */
'use strict';
var winston = require('winston');
var config = require('./config');

function Logger () {
  var transports;
  if (config.logger.filename) {
    console.log('Logging to ' + config.logger.filename);
    // we need a dir to do log rotation so we get the dir from the file
    var logpath = config.logger.filename.split('/');
    logpath.splice(-1, 1);
    logpath = logpath.join('/');

    // define a custom log formatter
    var formatter = function (options) {
      // console.log('------------------------')
      // console.log(' FORMATTER OPTIONS ')
      // console.log('------------------------')
      // console.log(JSON.stringify(options))
      // console.log('------------------------')
      var parts = [
        new Date().toISOString(),
        options.level
      ];
      // inject the job-id
      if (options.meta && options.meta.job_id) {
        parts.push('job:' + options.meta.job_id);
        // delete the job_id from meta
        delete options.meta.job_id;
      } else {
        // parts.push('job:UNK-JOB')
      }
      // inject the message
      if (options.message) {
        parts.push(options.message);
      } else {
        parts.push('');
      }
      // and the stringified meta
      if (options.meta && Object.keys(options.meta).length) {
        // TODO: Wrap in try/catch b/c this can throw errors
        parts.push(JSON.stringify(options.meta));
      }
      return parts.join(' ');
    };

    transports = [
      new (winston.transports.Console)({
        level: 'debug',
        colorize: true,
        prettyPrint: true,
        formatter: formatter
      }),

      new (winston.transports.File)({
        filename: config.logger.filename,
        name: 'log.all',
        dirname: logpath,
        colorize: false,
        json: false,
        level: config.logger.level,
        formatter: formatter
      }),
      new (winston.transports.File)({
        filename: config.logger.errors_filename,
        name: 'log.error',
        dirname: logpath,
        colorize: false,
        json: false,
        level: 'error',
        formatter: formatter
      })
    ];
  } else {
    // no logfile defined, log to console only
    console.log('NO LOG TRANPORTS ENABLED: DEBUG ONLY TO CONSOLE!');
    transports = [ new (winston.transports.Console)({ level: 'debug' }) ];
  }
  return new (winston.Logger)({ transports: transports });
}

module.exports = Logger();
