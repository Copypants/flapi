var should        = require('should');
var flickr        = require('../index');
var flickrClient  = new flickr({
  oauth_consumer_key     : process.env.FLICKR_KEY,
  oauth_consumer_secret  : process.env.FLICKR_SECRET
});


describe('initialization', function(){


  it('should return all settings defined', function(){
    flickrClient.settings.should.have.property('oauth_consumer_key');
    flickrClient.settings.oauth_consumer_key.should.equal(process.env.FLICKR_KEY);
  });

});

exports.client = flickrClient;