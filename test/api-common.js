var should      = require('should');
var flapiClient = require('./client').client;

describe('common api', function(){
  this.timeout(30000);

  it('should be able to fetch a list of camera brand models', function(done){
    flapiClient.api({
      method : 'flickr.cameras.getBrandModels',
      params : { brand : 'apple' },
    }, function(err, data) {
      should.not.exist(err);
      data.stat.should.equal('ok');
      data.should.have.properties('cameras', 'stat');
      data.cameras.should.have.property('camera');
      done();
    });
  });


  it('should be able to fetch a list of interesting photos', function(done){
    flapiClient.api({
      method : 'flickr.interestingness.getList',
    }, function(err, data) {
      should.not.exist(err);
      data.stat.should.equal('ok');
      data.should.have.properties('photos', 'stat');
      data.photos.should.have.property('photo');
      done();
    });
  });

});