# Node Flickr Module

## Feature Set
I know there are several existing node flickr modules, but... I wanted one with the following feature set:

* Simple api wrapper
* Fully tested
* Oauth support
* Dependency free in production
* Example code (coming soon!!!)


### Quickstart (...quickish)
1 - Instantiate the flapi client:

    var flapiClient = new Flapi({
      oauth_consumer_key    : FLICKR_KEY,
      oauth_consumer_secret : FLICKR_SECRET
    });

2 - Listen for an http request from flickr and respond
    
    var server = http.createServer(function(req, res){
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end();
    });

3 - Authenticate your application

    flapiClient.authApp('http://localhost:3000/auth_callback');

4 - When application authentication is finished, prompt users to authenticate with your app by giving them the app auth url.

    var url = flapiClient.getUserAuthURL();

5 - Get the user's access token to make individual requests.

    var userAccessToken;
    flapiClient.getUserAccessToken(function(accessToken){
        userAccessToken = accessToken;
    });

6 - Make requests on the user's behalf

    flapiClient.api({
        method      : 'flickr.people.getPhotos',
        params      :  { user_id : this.accessToken.user_nsid },
        accessToken : userAccessToken,
        next        : function(data){
            console.log('User Photos: ', data)
        }
    });



## Making API requests
Once you've authorized your application and have permissions from a user, you should be able to make api requests on their behalf.

With the exception of photo uploading, all api methods match the [flickr documentation](http://www.flickr.com/services/api/). To get a [listing of photos](http://www.flickr.com/services/api/flickr.people.getPhotos.html) you'll need a `user_id` and the user's access token (the `api_key` is automatically sent via the access token). The request can be completed with the following:

    flapiClient.api({
        method      : 'flickr.people.getPhotos',
        params      :  { user_id : this.accessToken.user_nsid },
        accessToken : userAccessToken,
        next        : function(data){
            console.log('User Photos: ', data)
        }
    });

* `method` - The flickr API Method
* `params` - Any API options to send
* `accessToken` - A user's unique access token
* `next` - The callback used when the api call is complete


### Uploading Photos
This module does not currently support photo uploads. The feature has been particurlaly problematic because flickr requires multi-part form uploads. This is on the immediate to do list and will be the next major feature developed.


### Setting Application permissions
According to the [flickr documentation](http://www.flickr.com/services/api/), you should be able to set your application's permission set (`read`, `write`, or `delete`) from the edit screen of your app. I've never been able to find these settings. Instead, you can set it in the flickr module constructor with the `perms` option:

    var flapiClient = new Flapi({
      oauth_consumer_key    : FLICKR_KEY,
      oauth_consumer_secret : FLICKR_SECRET,
      perms                 : 'delete'
    });


### Unauthorized API Requests
Some of flickr's api methods don't require authorization (ex: `flickr.cameras.getBrandModels` and `flickr.interestingness.getList`). To use these without user authentication, simply omit the `accessToken` option from the api call:

    flapiClient.api({
      method : 'flickr.interestingness.getList',
      params : { brand : 'apple' },
      next   : function(data){
        console.log('TADA!', data)
      }
    });


### Handling Errors
API errors are passed directly to the next function. You can catch them by checking the stat property of the data returned.

    flapiClient.api({
      method : 'flickr.class.method',
      params : {},
      next   : function(data){
        if(data.stat == 'fail'){
          console.log(data.code);
        }
      }
    });



## Data Persistence 
To keep users from having to authenticate every time your node application restarts, you'll need to persist your applications `oauth_token` and `oauth_token_secret`, as well as each user's individual `access_token`.

To instantiate the client with a token and secret, simply pass those properties when creating the object.

    var flapiClient = new Flapi({
      oauth_consumer_key    : FLICKR_KEY,
      oauth_consumer_secret : FLICKR_SECRET,
      oauth_token           : FLICKR_OAUTH_TOKEN,
      oauth_token_secret    : FLICKR_OAUTH_TOKEN_SECRET
    });

You only need to authorize your application once. If you're passing the token and secret, you can skip steps 2 and 3 described in the quickstart above.



## Examples
Using this module within express or any other node server framework should be fairly straight forward. Nonetheless, I'd like to provide several examples and use cases to make implementation as easy as possible. These are not yet complete but are on the immediate todo list.



## Running the Tests
To run the tests please make sure you've installed the project's dev dependencies and have the following environment variables set:

* `FLICKR_KEY` - Your flickr application's key
* `FLICKR_SECRET` - Your flickr application's secret
* `FLICKR_USERNAME` - Your flickr username, used to simulate a yahoo and flickr app authentication flow
* `FLICKR_PASSWORD` - Your flickr password, used to simulate a yahoo and flickr app authentication flow

Calling `make test` from the root of the project will run all tests in the correct order.

On occasion, the numerous flickr redirects required to simulate authentication will fail. This causes every subsequent test to then fail. If you're running tests and experience this oddity, simply run again.