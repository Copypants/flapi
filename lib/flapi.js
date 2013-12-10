var http          = require('http');
var fs            = require('fs');
var restler       = require('restler');
var flickrApi     = require('./flickrApi');
var encode        = require('./encode');
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

  if(!authCallbackURL || typeof(authCallbackURL) !== 'string') {
    throw new Error('Please define a an auth callback url. ' + message);
  }

  var request = {
    method      : 'GET',
    host        : apiHost,
    path        : '/services/oauth/request_token',
    queryParams : addDefaultParams(this.settings, {
      oauth_callback : authCallbackURL
    })
  };

  request.queryParams.oauth_signature = encode.sign(request, this.settings.oauth_consumer_secret);

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
    queryParams : addDefaultParams(this.settings, {
      oauth_verifier : oauth_verifier
    })
  };

  request.queryParams.oauth_signature = encode.sign(request,
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

  var queryParams = addDefaultParams(this.settings, {
    method          : opts.method,
    format          : 'json',
    nojsoncallback  : 1
  });

  // Any url params which are passed in should be added
  // to the query params object, ignore the photo
  opts.params = opts.params || {};
  for(var key in opts.params){
    if(key !== 'photo'){
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
  if(opts.method === 'upload'){
    request.host = 'up.flickr.com';
    request.path = '/services/upload/';
  }

  // Attach the oath_token if passed
  if(opts.accessToken){
    request.queryParams.oauth_token     = opts.accessToken.oauth_token;
    request.queryParams.oauth_signature = encode.sign(request,
      this.settings.oauth_consumer_secret,
      opts.accessToken.oauth_token_secret
    );
  }

  makeRequest(request, function(body, res){
    if(opts.next){
      var json = body;
      if(typeof body !== 'object'){
        if(body[0] === '{' || body[0] === '['){
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

        if(photoNode){ body.photoid = photoNode[1]; }
        if(msgNode)  { body.message = msgNode[1];   }

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
var addDefaultParams = function(original, additional){
  var obj = {
    oauth_nonce         : Math.floor(Math.random()*100) + new Date().getTime(),
    oauth_timestamp     : Math.floor(new Date()/1000),
    oauth_version       : '1.0'
  };

  // Make a copy of the original object
  for(var oKey in original){
    if(original.hasOwnProperty(oKey)){
      obj[oKey] = original[oKey];
    }
  }

  // If an object to add is passed, add it
  if(additional){
    for(var aKey in additional){
      if(additional.hasOwnProperty(aKey)){
        obj[aKey] = additional[aKey];
      }
    }
  }

  // Delete the banned params
  var bannedParams = ['consumer_secret', 'photo', 'perms', 'oauth_callback_confirmed'];
  bannedParams.forEach(function(banned){
    delete obj[banned];
  });

  return obj;
};


module.exports = flapi;