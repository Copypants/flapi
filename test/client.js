var should      = require('should');
var Flapi       = require('../index');
var cli         = require('./cli');
var flapiClient = new Flapi({
  oauth_consumer_key    : process.env.FLICKR_KEY,
  oauth_consumer_secret : process.env.FLICKR_SECRET,
  perms                 : 'delete'
});

if(!cli.useAuth){
  flapiClient.settings = {
    oauth_consumer_key    : process.env.FLICKR_KEY,
    oauth_consumer_secret : process.env.FLICKR_SECRET,
    oauth_token           : process.env.FLICKR_OAUTH_TOKEN,
    oauth_token_secret    : process.env.FLICKR_OAUTH_SECRET,
    perms                 : 'delete'
  };
}


describe('initialization', function(){

  it('should return all settings defined', function(){
    flapiClient.settings.should.have.property('oauth_consumer_key');
    flapiClient.settings.oauth_consumer_key.should.equal(process.env.FLICKR_KEY);
  });

});

exports.client = flapiClient;