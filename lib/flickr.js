var http          = require('http');
var url           = require('url');
var queryString   = require('querystring');


// Any options passed in are defined as settings
var flickr = function(opts, next){
  this.settings = {};
  for(var key in opts){
    this.settings[key] = opts[key]
  }

  if(next) next(this.settings)
}


// Automatically called when the app starts. Authorizes your app and returns
// a request token and signature you'll use to auth users
flickr.prototype.authApp = function(authCallbackURL, next){
  var self = this;
  var message = 'Please visit the flickr documentation http://www.flickr.com/services/api/, \n\n or retrieve your app creds here http://www.flickr.com/services/apps, \n\n or create an app here http://www.flickr.com/services/apps/create/ \n\n\n';
  if(!this.settings.consumerKey)     throw new Error('A consumerKey (app key) is required. ' + message);
  if(!this.settings.consumerSecret)  throw new Error('A consumerSecret (app secret) is required. ' + message);

  if(!authCallbackURL || typeof(authCallbackURL) != 'string') {
    throw new Error('Please define a an auth callback url. ' + message);
  }

  var request = {
    method      : 'GET',
    path        : '/services/oauth/request_token',
    queryParams : {
      oauth_callback : authCallbackURL
    }
  };

  request.queryParams.oauth_signature = buildSignature(this.settings, request);
  request.queryParams = addDefaultParams(this.settings, request.queryParams);

  makeRequest(request, function(data){

    var returnObj = queryString.parse(data);
    for(var key in returnObj){
      self.settings[key] = returnObj[key];
    }

    next(self.settings);
  });
};


// Return a URL with the oauth token
flickr.prototype.getUserAuthURL = function(opts){
  var url = 'http://www.flickr.com/services/oauth/authorize?oauth_token='
  if(opts.oauth_token) url = url + oauth_token
  else url = url + this.settings.oauth_token

  return url
};


// Make HTTP requests to flickr
var makeRequest = function(request, next){
  var reqOpts  = {
    host    : 'www.flickr.com',
    path    : request.path + '?' + queryString.stringify(request.queryParams),
    method  : request.method
  };

  var httpReq = http.request(reqOpts, function(res){
    res.setEncoding('utf8');

    var data = [];
    res.on('data',function(chunk) {
      data.push(chunk);
    });

    res.on('end',function() {
      next(data.join(''));
    });
  });

  httpReq.on('error', function(e) {
    logger(e);
  });

  httpReq.end();
};


// Convenience for adding nonce, timestamp, and other mandatory fields
var addDefaultParams = function(settings, obj){
  var defaults = {
    oauth_nonce         : Math.floor(Math.random()*100) + new Date().getTime(),
    oauth_timestamp     : Math.floor(new Date()/1000),
    oauth_version       : '1.0',
    oauth_consumer_key  : settings.consumerKey
  };

  for(var key in defaults){
    if(!obj[key]) obj[key] = defaults[key];
  };

  return obj;
};


// Flickr requires a signature to be built for auth requests
// There is a lot of encodeURIComponents here, but they're all needed...
// at least i think so
var buildSignature = function(settings, opts){
  if(!opts.queryParams) opts.queryParams  = {};
  if(!opts.method) opts.method            = 'GET';
  if(!opts.secrest) opts.secret           = ''

  opts.queryParams = addDefaultParams(settings, opts.queryParams);
  opts.queryParams.oauth_signature_method = 'HMAC-SHA1';

  // Sort paramaters and encode key value pairs
  var paramKeys = Object.keys(opts.queryParams).sort();
  var urlParams = [];
  paramKeys.forEach(function(key){
    var keyValuePair = encodeURIComponent(key + '=' + encodeURIComponent(opts.queryParams[key]));
    urlParams.push(keyValuePair);
  });

  var url       = 'http://www.flickr.com' + opts.path;
  var urlString = opts.method + '&' + encodeURIComponent(url) + '&' +  urlParams.join(encodeURIComponent('&'));
  var encodeKey = settings.consumerSecret + '&' + opts.secret;

  return HMAC_SHA1(encodeKey, urlString)
};


// Borrowed from https://github.com/jrconlin/oauthsimple/blob/master/js/OAuthSimple.js
// I have no idea how the below works or what it's really doing... it just works i guess
var HMAC_SHA1 = function(k,d,_p,_z) {
  //_p = b64pad, _z = character size; not used here but I left them available just in case
  if (!_p) {_p = '=';}if (!_z) {_z = 8;}function _f(t,b,c,d) {if (t < 20) {return (b & c) | ((~b) & d);}if (t < 40) {return b^c^d;}if (t < 60) {return (b & c) | (b & d) | (c & d);}return b^c^d;}function _k(t) {return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;}function _s(x,y) {var l = (x & 0xFFFF) + (y & 0xFFFF), m = (x >> 16) + (y >> 16) + (l >> 16);return (m << 16) | (l & 0xFFFF);}function _r(n,c) {return (n << c) | (n >>> (32 - c));}function _c(x,l) {x[l >> 5] |= 0x80 << (24 - l % 32);x[((l + 64 >> 9) << 4) + 15] = l;var w = [80], a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776;for (var i = 0; i < x.length; i += 16) {var o = a, p = b, q = c, r = d, s = e;for (var j = 0; j < 80; j++) {if (j < 16) {w[j] = x[i + j];}else {w[j] = _r(w[j - 3]^w[j - 8]^w[j - 14]^w[j - 16], 1);}var t = _s(_s(_r(a, 5), _f(j, b, c, d)), _s(_s(e, w[j]), _k(j)));e = d;d = c;c = _r(b, 30);b = a;a = t;}a = _s(a, o);b = _s(b, p);c = _s(c, q);d = _s(d, r);e = _s(e, s);}return [a, b, c, d, e];}function _b(s) {var b = [], m = (1 << _z) - 1;for (var i = 0; i < s.length * _z; i += _z) {b[i >> 5] |= (s.charCodeAt(i / 8) & m) << (32 - _z - i % 32);}return b;}function _h(k,d) {var b = _b(k);if (b.length > 16) {b = _c(b, k.length * _z);}var p = [16], o = [16];for (var i = 0; i < 16; i++) {p[i] = b[i]^0x36363636;o[i] = b[i]^0x5C5C5C5C;}var h = _c(p.concat(_b(d)), 512 + d.length * _z);return _c(o.concat(h), 512 + 160);}function _n(b) {var t = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', s = '';for (var i = 0; i < b.length * 4; i += 3) {var r = (((b[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((b[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((b[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);for (var j = 0; j < 4; j++) {if (i * 8 + j * 6 > b.length * 32) {s += _p;}else {s += t.charAt((r >> 6 * (3 - j)) & 0x3F);}}}return s;}function _x(k,d) {return _n(_h(k, d));}return _x(k, d);
};


// Use logger instead of console.log so we can easily turn it
// on and off
flickr.prototype.logger = function(msg){
  if(this.settings.logging) console.log(msg)
}


module.exports = flickr;