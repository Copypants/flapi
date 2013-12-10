var http          = require('http');
var fs            = require('fs');
var restler       = require('restler');
var flickrApi     = require('./flickrApi');
var url           = require('url');
var queryString   = require('querystring');
var apiHost       = 'api.flickr.com';

// Any options passed in are defined as settings
var flapi = function(opts){
  this.settings = {};
  for(var key in opts){
    this.settings[key] = opts[key];
  }
};


// Automatically called when the app starts. Authorizes your app and returns
// a request token and signature you'll use to auth users
flapi.prototype.authApp = function(authCallbackURL, next){
  var self = this;
  var message = 'Please visit the flickr documentation http://www.flickr.com/services/api/, or retrieve your app creds here http://www.flickr.com/services/apps, or create an app here http://www.flickr.com/services/apps/create/ \n';

  if(!this.settings.oauth_consumer_key){
    throw new Error('An oauth_consumer_key (app key) is required. ' + message);
  }

  if(!this.settings.oauth_consumer_secret){
    throw new Error('An oauth_consumer_secret (app secret) is required. ' + message);
  }

  if(!authCallbackURL || typeof(authCallbackURL) != 'string') {
    throw new Error('Please define a an auth callback url. ' + message);
  }

  var request = {
    method      : 'GET',
    host        : apiHost,
    path        : '/services/oauth/request_token',
    queryParams : prepareParams(this.settings, {
      oauth_callback : authCallbackURL
    })
  };

  request.queryParams.oauth_signature = buildSignature(request, this.settings.oauth_consumer_secret);

  makeRequest(request, function(body, res){
    var returnObj = queryString.parse(body);
    for(var key in returnObj){
      self.settings[key] = returnObj[key];
    }

    if(next){ next(self.settings); }
  });
};


// Return a URL with the oauth token
flapi.prototype.getUserAuthURL = function(){
  var perms = (this.settings.perms) ? '&perms=' + this.settings.perms : '';
  return 'http://' + apiHost + '/services/oauth/authorize?oauth_token=' + this.settings.oauth_token + perms;
};


// The "token" is really an object with an oauth_token and an
// oauth_token_secret unique to this individual
flapi.prototype.getUserAccessToken = function(oauth_verifier, next){
  var request = {
    method      : 'GET',
    path        : '/services/oauth/access_token',
    host        : apiHost,
    queryParams : prepareParams(this.settings, {
      oauth_verifier : oauth_verifier
    })
  };

  request.queryParams.oauth_signature = buildSignature(request,
    this.settings.oauth_consumer_secret,
    this.settings.oauth_token_secret
  );

  makeRequest(request, function(body, res){
    next(queryString.parse(body));
  });
};


// General method for handling all api calls
flapi.prototype.api = function(opts){

  if(!opts.method){
    throw new Error('Please pass an api method option as "method". You can find all available flickr methods within the flickr documentation at http://www.flickr.com/services/api/');
  }

  var queryParams = prepareParams(this.settings, {
    method          : opts.method,
    format          : 'json',
    nojsoncallback  : 1
  });

  // Any url params which are passed in should be added
  // to the query params object, ignore the photo
  opts.params = opts.params || {};
  for(var key in opts.params){
    if(key != 'photo'){
      queryParams[key] = opts.params[key];
    }
  }

  var request = {
    method      : flickrApi.getHttpMethod(opts.method),
    path        : '/services/rest/',
    host        : apiHost,
    queryParams : queryParams
  };

  // If the method is a photo upload, make a few changes
  if(opts.method == 'upload'){
    request.host = 'up.flickr.com';
    request.path = '/services/upload/';
  }

  // Attach the oath_token if passed
  if(opts.accessToken){
    request.queryParams.oauth_token     = opts.accessToken.oauth_token;
    request.queryParams.oauth_signature = buildSignature(request,
      this.settings.oauth_consumer_secret,
      opts.accessToken.oauth_token_secret
    );
  }

  makeRequest(request, function(body, res){
    if(opts.next){
      var json = body;
      if(typeof body != 'object'){
        if(body[0] == '{' || body[0] == '['){
          json = JSON.parse(body);
        } else {
          json = { stat : 'fail', message : body };
        }
      }
      opts.next(json);
    }
  }, opts.params.photo);
};


// Make HTTP requests to flickr
var makeRequest = function(request, next, photo){
  var query    = (request.queryParams) ? '?' + queryString.stringify(request.queryParams) : '';
  var reqOpts  = {
    host    : request.host || apiHost,
    path    : request.path + query,
    method  : request.method
  };

  // When posting, we need to pass all data in the body instead of the query
  // this is used only for image creation
  if(photo){
    var earl = 'http://' + reqOpts.host + reqOpts.path;
    var form = {};
    for(var key in request.queryParams){
      form[key] = request.queryParams[key];
    }

    fs.stat(photo, function (err, stats){
      form.photo = restler.file(photo, null, stats.size, null);
      makeRequest();
    });

    var makeRequest = function(){
      restler.post(earl, {
        multipart : true,
        data      : form
      }).on('complete', function(xml, res) {
        var photoNode = xml.match('<photoid>(.*)</photoid>');
        var msgNode   = xml.match('<message>(.*)</message>');
        var body      = {
          stat : photoNode ? 'ok' : 'fail'
        };

        if(photoNode){ body['photoid'] = photoNode[1]; }
        if(msgNode)  { body['message'] = msgNode[1]; }

        next(body, res);
      });
    };
  } else {
    var data    = [];
    var httpReq = http.request(reqOpts, function(res){
      res.on('data',function(chunk){
        data.push(chunk);
      });

      res.on('end',function(){
        next(data.join(''), res);
      });
    });

    httpReq.end();
  }
};


// Convenience for adding nonce, time stamp, and version
// ...also adds two objects together
// ...also strips out banned parameters
var prepareParams = function(originalObj, objToAdd){
  var obj      = {};
  var defaults = {
    oauth_nonce         : Math.floor(Math.random()*100) + new Date().getTime(),
    oauth_timestamp     : Math.floor(new Date()/1000),
    oauth_version       : '1.0'
  };

  // Add all the default params
  for(var defultsKey in defaults){
    obj[defultsKey] = defaults[defultsKey];
  }

  // Make a copy of the original object
  for(var originalsKey in originalObj){
    obj[originalsKey] = originalObj[originalsKey];
  }

  // If an object to add is passed, add it
  if(objToAdd){
    for(var key in objToAdd){
      obj[key] = objToAdd[key];
    }
  }

  // Delete the banned params
  var bannedParams = ['consumer_secret', 'photo', 'perms', 'oauth_callback_confirmed'];
  bannedParams.forEach(function(banned){
    delete obj[banned];
  });

  return obj;
};


// Flickr requires a signature to be built for auth requests
// There is a lot of encodeURIComponents here, but they're all needed...
// at least i think so
var buildSignature = function(req, consumerSecret, tokenSecret){
  if(!req.queryParams) req.queryParams    = {};
  if(!req.method) req.method              = 'GET';
  if(!tokenSecret) tokenSecret            = '';

  req.queryParams.oauth_signature_method  = 'HMAC-SHA1';

  // Sort parameters and encode key value pairs
  // ignore banned parameters
  var paramKeys = Object.keys(req.queryParams).sort();
  var urlParams = [];
  paramKeys.forEach(function(key){
    var keyValuePair = encodeURIComponent(key + '=' + encodeURIComponent(req.queryParams[key]));
    urlParams.push(keyValuePair);
  });

  var url       = 'http://' + req.host + req.path;
  var urlString = req.method + '&' + encodeURIComponent(url) + '&' +  urlParams.join(encodeURIComponent('&'));
  var encodeKey = consumerSecret + '&' + tokenSecret;

  return HMAC_SHA1(encodeKey, urlString);
};


// Borrowed from https://github.com/jrconlin/oauthsimple/blob/master/js/OAuthSimple.js
// I have no idea how the below works or what it's really doing... it just works i guess
var HMAC_SHA1 = function(k,d,_p,_z) {
  //_p = b64pad, _z = character size; not used here but I left them available just in case
  if (!_p) {_p = '=';}if (!_z) {_z = 8;}function _f(t,b,c,d) {if (t < 20) {return (b & c) | ((~b) & d);}if (t < 40) {return b^c^d;}if (t < 60) {return (b & c) | (b & d) | (c & d);}return b^c^d;}function _k(t) {return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;}function _s(x,y) {var l = (x & 0xFFFF) + (y & 0xFFFF), m = (x >> 16) + (y >> 16) + (l >> 16);return (m << 16) | (l & 0xFFFF);}function _r(n,c) {return (n << c) | (n >>> (32 - c));}function _c(x,l) {x[l >> 5] |= 0x80 << (24 - l % 32);x[((l + 64 >> 9) << 4) + 15] = l;var w = [80], a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776;for (var i = 0; i < x.length; i += 16) {var o = a, p = b, q = c, r = d, s = e;for (var j = 0; j < 80; j++) {if (j < 16) {w[j] = x[i + j];}else {w[j] = _r(w[j - 3]^w[j - 8]^w[j - 14]^w[j - 16], 1);}var t = _s(_s(_r(a, 5), _f(j, b, c, d)), _s(_s(e, w[j]), _k(j)));e = d;d = c;c = _r(b, 30);b = a;a = t;}a = _s(a, o);b = _s(b, p);c = _s(c, q);d = _s(d, r);e = _s(e, s);}return [a, b, c, d, e];}function _b(s) {var b = [], m = (1 << _z) - 1;for (var i = 0; i < s.length * _z; i += _z) {b[i >> 5] |= (s.charCodeAt(i / 8) & m) << (32 - _z - i % 32);}return b;}function _h(k,d) {var b = _b(k);if (b.length > 16) {b = _c(b, k.length * _z);}var p = [16], o = [16];for (var i = 0; i < 16; i++) {p[i] = b[i]^0x36363636;o[i] = b[i]^0x5C5C5C5C;}var h = _c(p.concat(_b(d)), 512 + d.length * _z);return _c(o.concat(h), 512 + 160);}function _n(b) {var t = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', s = '';for (var i = 0; i < b.length * 4; i += 3) {var r = (((b[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((b[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((b[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);for (var j = 0; j < 4; j++) {if (i * 8 + j * 6 > b.length * 32) {s += _p;}else {s += t.charAt((r >> 6 * (3 - j)) & 0x3F);}}}return s;}function _x(k,d) {return _n(_h(k, d));}return _x(k, d);
};


module.exports = flapi;