var assert  = require('assert');
var should  = require('should');
var flickr  = require('../index');

describe('authorization', function(){

  before(function(){
    this.flickrClient = new flickr({
      consumerKey     : process.env.FLICKR_KEY,
      consumerSecret  : process.env.FLICKR_SECRET
    });
  });


  it('should throw an error if no auth callback is defined', function(){
    this.flickrClient.authApp.should.throw()
  });


  it('should reach out to flickr and receive an oauth_token and an oauth_token_secret', function(done){
    var self = this;

    this.flickrClient.authApp('http://localhost:3000', function(settings){
      settings.should.have.properties('oauth_callback_confirmed', 'oauth_token', 'oauth_token_secret');
      settings.oauth_callback_confirmed.should.equal('true');

      done();
    });
  });


  it('should return a user authorization URL when prompted', function(){
    var url   = this.flickrClient.getUserAuthURL();
    var query = url.split('?')[1];
    var token = query.split('=')[1];

    token.should.not.equal('undefined');
    token.length.should.be.above(10);
  });

});