/* jshint node: true */
/**
 * Helper for requests to AGO api
 */
'use strict';
var Q = require('q'),
  logger = require('./logger'),
  request = require('request');

var api = {};
module.exports = api;
api.totalXhrs = 0;

/**
 * Helper for testing so we can force 'failures'
 */
api.xhrFail = function (options) {
  // always fail unless a localhost call
  if (options.url.indexOf('localhost') > -1) {
    return api.xhrGood(options);
  }else {
    var dfd = Q.defer();
    var rej = {
      log: 'Got Error on ' + options.method + ' to ' + options.url,
      type: 'error',
      i18n: {key: 'messages.ajax.http_error'},
      payload: {
        request: options,
        response: {statusCode: 0}
      }
    };
    rej.message.log = 'Timeout on ' + options.method + ' to ' + options.url;
    rej.message.i18n.key = 'messages.ajax.timeout';
    rej.job_status = 'retry';
    dfd.reject(rej);
    return dfd.promise;
  }
};

/**
 * Json specific xhr. Allows xhr() to return other types
 */
api.json = function (options) {
  // TODO remove the dfd and just return the promise from api.xhr
  // var dfd = Q.defer()

  // force everything to have application/json content-type
  if (!options.json) {
    options.json = true;
  }

  // pass thru to .xhr() and then either pass the rejection
  // forward or add an additional check that ensures the response
  // is json before sending it out.
  return api.xhr(options);
  // .then(function(json){
  //   dfd.resolve(json)
  // })
  // .fail(function(rejection){
  //   dfd.reject(rejection)
  // })
  // .done()

  // return dfd.promise

};

api._preprocessOptions = function (options) {
  if (!options.maxRedirects) {
    options.maxRedirects = 10;
  }

  // default to GET if no method passed
  if (!options.method) {
    options.method = 'GET';
  }

  // if https, don't force strictssl
  if (options.url.indexOf('https') > -1) {
    options.strictSSL = false;
  }

  // set the timeout to 30 seconds max...
  if (!options.timeout) {
    options.timeout = 60000;
  }

  if (!options.headers) {
    options.headers = {
      'User-Agent': 'ArcGIS Hub Research Application (nodejs)',
      'Content-Type': 'application/json'
    };
  }

  // logger.warn("Request Headers: " + options.headers['Content-Type'])
  // handle both encoded and non-encoded unicode chars in urls,
  // but don't mess with query strings
  if (options.url.indexOf('?') > -1) {
    var qs = options.url.split('?')[1];
    var base = options.url.split('?')[0];
    options.url = encodeURI(decodeURI(base)) + '?' + qs;
  }else {
    // no query string, encode the whole url
    options.url = encodeURI(decodeURI(options.url));
  }
  return options;
};

api._createErrorResponseRejection = function (options, error, response) {
  // this is the error callback - basically something
  // catastrophic has happened.
  var rej = {
    message: {
      log: 'Got Error on ' + options.method + ' to ' + options.url,
      type: 'error',
      i18n: {
        key: 'messages.ajax.http_error',
        data: {
          url: options.url,
          method: options.method,
          options: options
        }
      }
    },
    payload: {
      request: options,
      response: {statusCode: 0}
    }
  };

  if (error.reason) {
    rej.message.log = rej.message.log + ' Reason: ' + error.reason;
    rej.message.i18n.key = 'messages.ajax.http_error_reason';
    rej.message.i18n.data.reason = error.reason;
    rej.job_resolution = 'fulfill';
  }

  if (response) {
    rej.payload.response = {statusCode: response.statusCode};
    if (response.body) {
      // only send the first 300 chars of the response to keep from bloating logs
      rej.payload.response.body = response.body.substr(0, 300);
    }
  }else {
    // no response
    if (error.code) {
      if (error.code === 'ETIMEDOUT') {
        rej.message.log = 'AJAX: Exceeded timeout of ' + options.timeout + 'ms on ' + options.method + ' to ' + options.url;
        rej.message.i18n.key = 'messages.ajax.timeout';
        rej.job_resolution = 'retry';
        logger.warn(rej.message.log + ' Recommending retry.');
      }else if (error.code === 'ENOTFOUND') {
        rej.message.log = 'AJAX: DNS lookup failed for ' + options.method + ' to ' + options.url;
        rej.message.i18n.key = 'messages.ajax.dns_error';
        rej.job_resolution = 'retry';
        logger.warn(rej.message.log + ' Recommending retry.');
      }else if (error.code === 'ECONNRESET') {
        rej.message.log = 'AJAX: Connection reset for ' + options.method + ' to ' + options.url;
        rej.message.i18n.key = 'messages.ajax.connection_reset';
        rej.job_resolution = 'fulfill';
      }else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        rej.message.log = 'AJAX: Certificate error UNABLE_TO_VERIFY_LEAF_SIGNATURE for ' + options.url;
        rej.message.i18n.key = 'messages.ajax.certificate_error';
        rej.message.i18n.data.error = error.code;
        rej.job_resolution = 'fulfill';
      }else if (error.code === 'ENETUNREACH' || error.code === 'ECONNREFUSED') {
        rej.message.log = 'AJAX: Url ' + options.url + ' is unreachable';
        rej.message.i18n.key = 'messages.ajax.unreachable';
        rej.job_resolution = 'fulfill';
        // logger.warn(rej.message.log + ' Recommending no retry.')

      }else {
        rej.payload.error = JSON.stringify(error);
        logger.warn('AJAX: Unexpected xhr error: ' + error.code + ' on ' + options.method + ' to ' + options.url, rej);
      }
    }else {
      if (error.toString().indexOf('Exceeded maxRedirects') > -1) {
        rej.payload.error = error.toString();
        rej.message.i18n.key = 'messages.ajax.max_redirects';
        rej.message.i18n.data = {
          url: options.url
        };
        rej.log = error.toString();
        rej.job_resolution = 'fulfill'; // the error should go to the admin not our logs
      }else {
        // no code - stuff the error into the payload so we can debug this
        rej.payload.error = error.toString();
        logger.error('AJAX: Unexpected xhr error without a code on ' + options.method + ' to ' + options.url, rej);
      }
    }
  }
  return rej;
};

/**
 * In the event that the json fails to parse (i.e. sometimes we get html from some
 * AGS servers  instead of json) create a rejection
 */
api._createJsonParseRejection = function (options, response) {
  // create the default rejection
  var rejection = {
    log: 'Error parsing json on ' + options.method + ' to ' + options.url,
    type: 'error',
    i18n: {
      key: 'messages.ajax.bad_json_body',
      data: {
        url: options.url,
        method: options.method
      }
    },
    payload: {
      request: options,
      response: {statusCode: response.statusCode}
    }
  };

  rejection = api._ammendJsonRejectionBasedOnStatusCode(rejection, response.statusCode);

  return rejection;
};

api._createNon200ResonseRejection = function (options, response) {
  var rejection = {
    log: 'Got ' + response.statusCode + ' on ' + options.method + ' to ' + options.url,
    type: 'error',
    i18n: {
      key: 'messages.ajax.non_200',
      data: {
        url: options.url,
        method: options.method,
        status: response.statusCode
      }
    },
    payload: {
      request: options,
      response: {statusCode: response.statusCode}
    }
  };

  rejection = api._ammendJsonRejectionBasedOnStatusCode(rejection, response.statusCode);

  return rejection;
};

/**
 * Create a Rejection in the case that the json response contains
 * an error object. Unique feature of Esri APIs.
 */
api._createJsonErrorRejection = function (options, data) {

  // sometimes the useful info is in the details
  if (data.error.details && data.error.details.length) {
    // so append that into the message
    data.error.message += data.error.details.join(', ');
  }
  // setup the rejection
  var rejection = {
    log: data.error.message || 'No message in data error payload',
    type: 'error',
    i18n: {
      key: 'messages.ajax.non_200',
      data: {
        url: options.url,
        method: options.method,
        status: data.error.code
      }
    },
    payload: {
      request: options,
      response: {statusCode: data.error.code, body: data}
    }
  };

  rejection = api._ammendJsonRejectionBasedOnStatusCode(rejection, data.error.code);

  return rejection;
};

/**
 * Depending on the status code, we want to ammend the rejection.
 * Status code can come from the response or contained within the
 * json in the error node.
 */
api._ammendJsonRejectionBasedOnStatusCode = function (rejection, statusCode) {
  if (statusCode === 200) {
    rejection.message.log = 'Service may be token secured. ' + rejection.message.log;
    rejection.job_resolution = 'fulfill'; // we want the job to resolve correctly
    rejection.message.i18n.key = 'messages.ajax.token_secured';
  }
  if (statusCode >= 400 && statusCode < 500) {
    rejection.job_resolution = 'fulfill'; // we want the job to resolve correctly
  }
  if (statusCode === 499) {
    rejection.message.i18n.key = 'messages.ajax.token_secured';
  }
  if (statusCode >= 500) {
    rejection.job_resolution = 'fulfill'; // we want the job to resolve correctly
  }
  return rejection;
};

/**
 * Centralized xhr so we can
 * consistently handle issues,
 * including the ago 200-as-400 etc
 */
api.xhr = function (options) {
  var dfd = Q.defer();

  if (!options) {
    logger.warn('Ajax.xhr called without options!');
    throw new Error('ajax.xhr requires options passed in.');
  }
  if (!options.url) {
    logger.warn('Ajax.xhr called without options.url!');
    throw new Error('ajax.xhr requires options.url passed in.');
  }

  options = api._preprocessOptions(options);

  // make the request
  request(options, function (error, response, body) {
    // logger.info('XHR OPTIONS: ' + JSON.stringify(options))
    // logger.info('XHR RESPONSE: ' + JSON.stringify(response))
    if (error) {
      logger.error('ajax.xhr got error');
      var rej = api._createErrorResponseRejection(options, error, response);
      // reject the promise
      dfd.reject(rej);
    }else {
      // handle non-ok status codes
      if (response.statusCode !== 200 && response.statusCode !== 201 && response.statusCode !== 204) {
        // structured rejection so things higher up the stack can expect to handle this gracefully

        dfd.reject(api._createNon200ResonseRejection(options, response));
      }else {
        // status code is 200,201 or 204
        if (body) {
          if (options.json === true) {
            api._processJsonResponse(dfd, options, body, response);
          }else {
            // return the body
            dfd.resolve(body);
          }
        }else {
          // no body - this is ok for api's where you just get a 201 on create
          dfd.resolve();
        }
      }
    }
  });
  return dfd.promise;
};

api._processJsonResponse = function (dfd, options, body, response) {
  var data = {};
  // Unit test harness nock returns the response as json, and double parsing is BAD
  // so we check that it is a string before trying to parse it...
  if (typeof body === 'string') {
    try {
      console.log('BODY:' + body);
      data = JSON.parse(body);
    } catch(ex) {
      // if it fails to parse, reject
      dfd.reject(api._createJsonParseRejection(options, response));
    }
  }else {
    // just return the body b/c it's already json (or null)
    data = body;
  }

  // does the json contain error information?
  if (typeof data === 'object' && data.error) {
    // handle error in the json
    var errorRejection = api._createJsonErrorRejection(options, data, response);
    dfd.reject(errorRejection);
  }else {
    dfd.resolve(data);
  }
};

/**
 * Simple helper to attach f=json to requests
 * Callee needs to know if this is needed
 * this function simply adds it
 */
api.jsonify = function (url) {
  if (url.indexOf('f=json') === -1) {
    if (url.indexOf('?') === -1) {
      url = url + '?f=json';
    }else {
      url = url + '&f=json';
    }
  }
  return url;
};

api.sslifyHosted = function (url) {
  if (url.indexOf('arcgis.com') > -1) {
    if (url.indexOf('https://') === -1) {
      url = url.replace(/http:/i, 'https:');
    }
  }
  return url;
};
