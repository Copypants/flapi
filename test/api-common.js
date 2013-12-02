var should        = require('should');
var flickrClient  = require('./client').client;

describe('authorized api', function(){
  this.timeout(10000);

  it('should be able to fetch a list of camera brand models', function(done){
    flickrClient.api({
      method : 'flickr.cameras.getBrandModels',
      params : { brand : 'apple' },
      next   : function(data){
        data.should.have.properties('cameras', 'stat');
        data.stat.should.equal('ok');
        data.cameras.should.have.property('camera');
        done();
      }
    });
  });


  it('should be able to fetch a list of interesting photos', function(done){
    flickrClient.api({
      method : 'flickr.interestingness.getList',
      next   : function(data){
        data.should.have.properties('photos', 'stat');
        data.stat.should.equal('ok');
        data.photos.should.have.property('photo');
        done();
      }
    });
  });

});