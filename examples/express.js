// Below is a sample express app using flapi.
// Make sure to install the express and dirty db dependencies.

// Notice how data persistence works in relation to the creation
// of the flapi client. It's important to reuse the same `oauth_token`
// and `oauth_token_secret` so your user's do not have to 
// reauthenticate every time your node application restarts.


var express   = require('express');
var http      = require('http');
var dirty     = require('dirty');
var Flapi     = require('../index');
var users     = dirty('users.db');
var settings  = dirty('settings.db');
var app       = express();
var flapiClient;


var createFlapiClient = function(opts){
  flapiClient = new Flapi(opts);

  if(!opts.oauth_token){
    flapiClient.authApp('http://localhost:3000/auth_callback', function(oauthResults){
      settings.set('oauth', oauthResults);
    });
  }
};


// See if there's already an oauth object saved that we can reuse.
// Not doing it this way will cause users to be forced to reauth
// everytime your app gets restarted
settings.on('load', function(){
  var opts = {
    oauth_consumer_key    : process.env.FLICKR_KEY,
    oauth_consumer_secret : process.env.FLICKR_SECRET,
    perms                 : 'delete'
  };

  var oauthOpts = settings.get('oauth');
  if(oauthOpts){
    opts.oauth_token        = oauthOpts.oauth_token;
    opts.oauth_token_secret = oauthOpts.oauth_token_secret;
  }

  createFlapiClient(opts);
});


// Redirect to the authorize page
app.get('/', function(req, res){
  res.redirect('/user/authorize');
});


// Forward to flickr's authorize page
app.get('/user/authorize', function(req, res){
  res.redirect(flapiClient.getUserAuthURL());
});


// If there's an oauth_token, we know this is a user auth.
// otherwise, it's just the app trying to auth, let it pass
app.get('/auth_callback', function(req, res){
  if(req.query.oauth_token){
    flapiClient.getUserAccessToken(req.query.oauth_verifier, function(accessToken){
      users.set(accessToken.user_nsid, accessToken);

      var message = ['Succesfully Authorized. Visit,',
'http://localhost:3000/user/' + accessToken.user_nsid + '/photos to see',
'a full listing of your photos'].join('');
      res.send(message);
    });
  } else {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end();
  }
});


// Show a users photos
app.get('/user/:id/photos', function(req, res){
  var accessToken = users.get(req.params.id);
  flapiClient.api({
      method      : 'flickr.people.getPhotos',
      params      : { user_id : req.params.id },
      accessToken : accessToken,
      next        : function(data){
        res.send(data);
      }
    });
});


// Create a new server
http.createServer(app).listen(3000, function(){
  console.log('Express server listening on port 3000');
});