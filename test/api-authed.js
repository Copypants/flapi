var should        = require('should');
var flickrClient  = require('./client').client;
var accessToken   = '';
var sharedData    = {};

describe('api', function(){
  this.timeout(10000);


  it('should be able to fetch a list of the user\'s photos', function(done){
    accessToken   = require('./auth').getUserAccessToken();
    var urlParams = { user_id : accessToken.user_nsid };

    flickrClient.api('flickr.people.getPhotos', urlParams, accessToken, function(data){
      data.should.have.properties('photos', 'stat');
      data.stat.should.equal('ok');
      data.photos.should.have.property('photo');

      var photoArray = data.photos.photo;
      sharedData.randomPhotoId = photoArray[Math.floor(Math.random(0, photoArray.length) + 1)].id

      done();
    });
  });


  it('should be able to fetch a single photo', function(done){

  });


  it('should be able to create a photo', function(done){

  });


  it('should be able to add tags to a photo', function(done){

  });


  it('should be able to create a set', function(done){

  });


  it('should be able to put a photo into a set', function(done){

  });


  it('should be able to remove tags from a photo', function(done){

  });


  it('should be able to remove a photo from a set', function(done){

  });


  it('should be able to delete a photo', function(done){

  });


  it('should be able to delete a set', function(done){

  });
});