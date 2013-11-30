var fs            = require('fs');
var should        = require('should');
var flickrClient  = require('./client').client;
var photoData     = {};

describe('authorized api', function(){
  this.timeout(10000);

  beforeEach(function(){
    this.accessToken = require('./auth').getUserAccessToken();
  });


  it('should throw an error when no api method is submitted', function(){
    flickrClient.api.should.throw();
  });


  it('should be able to fetch a list of the user\'s photos', function(done){
    var urlParams = { user_id : this.accessToken.user_nsid };

    flickrClient.api({
      method      : 'flickr.people.getPhotos',
      params      : urlParams,
      accessToken : this.accessToken,
      next        : function(data){
        data.should.have.properties('photos', 'stat');
        data.stat.should.equal('ok');
        data.photos.should.have.property('photo');

        var photoArray = data.photos.photo;
        photoData.randomPhotoId = photoArray[Math.floor(Math.random(0, photoArray.length) + 1)].id

        done();
      }
    });
  });


  it('should be able to fetch a single photo', function(done){
    var urlParams = { photo_id : photoData.randomPhotoId };

    flickrClient.api({
      method      : 'flickr.photos.getInfo',
      params      : urlParams,
      accessToken : this.accessToken,
      next        : function(data){
        data.should.have.properties('photo', 'stat');
        data.stat.should.equal('ok');
        done();
      }
    });
  });


  it.skip('should be able to create a photo', function(done){
    this.timeout(30000);
    var binaryImage = fs.readFileSync('test/image.jpg', 'binary');

    flickrClient.api({
      method      : 'upload',
      params      : { photo : binaryImage },
      accessToken : this.accessToken,
      next        : function(data){
        data.should.have.properties('stat');
        data.stat.should.equal('ok');
        done();
      }
    });
  });


  it('should be able to add tags to a photo', function(done){
    var params = {
      photo_id  : photoData.randomPhotoId,
      tags      : 'oscar, meyer, weiner'
    };

    flickrClient.api({
      method      : 'flickr.photos.addTags',
      params      : params,
      accessToken : this.accessToken,
      next        : function(data){
        data.should.have.properties('tags', 'stat');
        data.stat.should.equal('ok');
        done();
      }
    });
  });


  it.skip('should be able to create a set', function(done){

  });


  it.skip('should be able to put a photo into a set', function(done){

  });


  it.skip('should be able to remove tags from a photo', function(done){

  });


  it.skip('should be able to remove a photo from a set', function(done){

  });


  it.skip('should be able to delete a photo', function(done){

  });


  it.skip('should be able to delete a set', function(done){

  });
});