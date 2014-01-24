var open = require('open');
var http = require('http');
var url = require('url');
var Flapi = require('flapi');
var flapiClient;

var options = {
	oauth_consumer_key: "[your api key]",
	oauth_consumer_secret: "[your app secret]",
  	// oauth_token: '...', // <-- fill this to prevent the browser opening
  	// oauth_token_secret: '...', // <-- fill this to prevent the browser opening
	perms: 'write'
};

var runServer = function(callback) {
	http.createServer(function (req, res) {
		res.writeHead(200, {'Content-Type': 'text/html'});
		var urlParts = url.parse(req.url, true);
		var query = urlParts.query;
		if(query.oauth_token) {
			flapiClient.getUserAccessToken(query.oauth_verifier, function(result) {
				options.oauth_token = result.oauth_token;
				options.oauth_token_secret = result.oauth_token_secret;
				var message = '';
				for(var prop in result) {
					message += prop + ' = ' + result[prop] + '<br />';
				}
				res.end(message);
				uploadPhotos();
			});
		} else {
			res.end('Missing oauth_token parameter.');
		}
	}).listen(3000, '127.0.0.1');
	console.log('Server running at http://127.0.0.1:3000/');
	callback();
}

var uploadPhotos = function() {
	var file = __dirname + "/images/nodejs.png";
	console.log("Uploading " + file);
	flapiClient.api({
		method: 'upload',
		params:  { photo : file },
		accessToken : { 
			oauth_token: options.oauth_token,
			oauth_token_secret: options.oauth_token_secret
		},
		next: function(data){
	  		console.log('New Photo: ', data);
		}
	});
}

var createFlapiClient = function(options){
	flapiClient = new Flapi(options);
	if(!options.oauth_token) {
		flapiClient.authApp('http://127.0.0.1:3000', function(oauthResults){
			runServer(function() {
				open(flapiClient.getUserAuthURL());
			})
		});
	} else {
		uploadPhotos();
	}
};

createFlapiClient(options);