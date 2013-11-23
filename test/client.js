var assert  = require('assert');
var should  = require('should');
var flickr  = require('../index');

describe('initialization', function(){

  var flickrClient = new flickr({
    consumerKey     : process.env.FLICKR_KEY,
    consumerSecret  : process.env.FLICKR_SECRET,
  }, function(settings){

    it('should return all settings defined', function(){
      settings.should.have.property('consumerKey');
      settings.consumerKey.should.equal(process.env.FLICKR_KEY);
    });

  });
});