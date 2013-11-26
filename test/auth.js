var should        = require('should');
var flickr        = require('../index');
var authUtils     = require('./authUtils');
var flickrClient  = require('./client').client;
var port          = 3001;


describe('authorization', function(){


  it('should throw an error if no auth callback is defined', function(){
    flickrClient.authApp.should.throw()
  });


  it('should reach out to flickr and receive an oauth_token and an oauth_token_secret', function(done){
    var callbackURL = 'http://localhost:' + port + '/auth_callback';

    flickrClient.authApp(callbackURL, function(settings){
      settings.should.have.properties('oauth_callback_confirmed', 'oauth_token', 'oauth_token_secret');
      settings.oauth_callback_confirmed.should.equal('true');

      done();
    });
  });


  it('should return a user authorization URL when prompted', function(){
    this.timeout(5000);

    var url   = flickrClient.getUserAuthURL();
    var query = url.split('?')[1];
    var token = query.split('=')[1];
    token.should.not.equal('undefined');
    token.length.should.be.above(10);

    // Make the auth url available so we can later verify it works
    this.authURL = url;
  });


  it('should be able to fetch a user access token', function(done){
    this.timeout(30000);

    var matched = function(queryParams){
      flickrClient.getUserAccessToken(queryParams.oauth_verifier, function(accessToken){
        accessToken.should.have.properties('oauth_token', 'oauth_token_secret', 'user_nsid', 'username');
        accessToken.oauth_token_secret.should.not.equal('undefined');
        accessToken.oauth_token_secret.should.not.equal('');
        done();
      });
    };

    authUtils.createRouteListener('/auth_callback', matched);
    authUtils.simulateUserApproval(flickrClient.getUserAuthURL());
  });

});