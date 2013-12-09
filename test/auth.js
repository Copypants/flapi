var should      = require('should');
var authUtils   = require('./authUtils');
var cli         = require('./cli');
var flapiClient = require('./client').client;
var port        = 3001;
var userToken   = {};


if(cli.useAuth){

  describe('authorization', function(){
    this.timeout(30000);

    it('should throw an error if no auth callback is defined', function(){
      flapiClient.authApp.should.throw()
    });


    it('should reach out to flickr and receive an oauth_token and an oauth_token_secret', function(done){
      var callbackURL = 'http://localhost:' + port + '/auth_callback';

      flapiClient.authApp(callbackURL, function(settings){
        settings.should.have.properties('oauth_callback_confirmed', 'oauth_token', 'oauth_token_secret');
        settings.oauth_callback_confirmed.should.equal('true');

        done();
      });
    });


    it('should return a user authorization URL when prompted', function(){
      var url   = flapiClient.getUserAuthURL();
      var query = url.split('?')[1];
      var token = query.split('=')[1];
      token.should.not.equal('undefined');
      token.length.should.be.above(10);

      // Make the auth url available so we can later verify it works
      this.authURL = url;
    });


    it('should be able to fetch a user access token', function(done){
      var matched = function(queryParams){
        flapiClient.getUserAccessToken(queryParams.oauth_verifier, function(accessToken){
          accessToken.should.have.properties('oauth_token', 'oauth_token_secret', 'user_nsid', 'username');
          accessToken.oauth_token_secret.should.not.equal('undefined');
          accessToken.oauth_token_secret.should.not.equal('');
          userToken = accessToken;
          done();
        });
      };

      authUtils.createRouteListener('/auth_callback', matched);
      authUtils.simulateUserApproval(flapiClient.getUserAuthURL());
    });

  });
}


exports.getUserAccessToken = function(){
  if(cli.useAuth) return userToken
  else return {
    fullname            : 'First Last',
    oauth_token         : process.env.FLICKR_OAUTH_USER_TOKEN,
    oauth_token_secret  : process.env.FLICKR_OAUTH_USER_SECRET,
    user_nsid           : process.env.FLICKR_NSID,
    username            : process.env.FLICKR_USERNAME
  }
};