/* jshint node: true */
var config = {};

config.logger = {
  level: 'debug',
  log_path: 'logs',
  filename: 'logs/run.log',
  errors_filename: 'logs/run.errors.log'
};

config.portalBaseUrl = 'https://www.arcgis.com';

module.exports = config;
