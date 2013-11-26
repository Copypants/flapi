var assert  = require('assert');
var should  = require('should');
var flickr  = require('../index');

describe('initialization', function(){

  var flickrClient = new flickr({
    oauth_consumer_key     : process.env.FLICKR_KEY,
    oauth_consumer_secret  : process.env.FLICKR_SECRET
  }, function(settings){

    it('should return all settings defined', function(){
      settings.should.have.property('oauth_consumer_key');
      settings.oauth_consumer_key.should.equal(process.env.FLICKR_KEY);
    });

  });
});