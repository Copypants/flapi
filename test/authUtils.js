var http    = require('http');
var request = require('request').defaults({ jar : true, followAllRedirects : true });
var jsdom   = require('jsdom');
var qs      = require('querystring');
var url     = require('url');
var port    = 3001;


// Follow login redirect(s), enter username and password,
// 'click' the "OK I'll authorize button"... which then
// in turn triggers the http request from flickr
exports.simulateUserApproval = function(authURL){
  // Bounce around until we find the login page
  var findLogin = function(earl){
    console.log('\nfinding the login page...');

    request(earl, function(err, res, body){
      var redirectUrl = this.redirects[this.redirects.length-1].redirectUri;
      login(body, redirectUrl);
    });
  }(authURL);

  // Fetch form data from DOM and login via the redirected
  // web page from flickr
  var login = function(body, earl){
    console.log('attempting to login...');

    getFormDataFromLogin(body, function(formData){

      formData.login  = process.env.FLICKR_USERNAME;
      formData.passwd = process.env.FLICKR_PASSWORD;

      request.post(earl, { form : formData }, function(err, res, body){
        getClientRedirectURL(body, loadAppApprovalPage)
      });
    });
  };

  // Load the app authorization page, get the form data from
  // the DOM and move to approval
  var loadAppApprovalPage = function(earl){
    console.log('loading the app approval page...');

    request(earl, function(err, res, body){
      getFormDataFromAppApproval(body, approveApplication);
    });
  };

  // Attempt to approve the application with
  var approveApplication = function(formAction, formData){
    console.log('attempting to approve the app...');

    var earl = 'http://www.flickr.com' + formAction;
    request.post(earl, { form : formData });
  };

  // The yahoo login page is FILLED with hidden input fields.
  // collect all inputs, then pass them back to next
  var getFormDataFromLogin = function(webpage, next){
    jsdom.env(webpage, ['http://code.jquery.com/jquery.js'], function(errors, window) {
      var $     = window.$;
      var form  = {};

      $('#fsLogin input').each(function(){
        form[$(this).attr('name')] = $(this).val()
      });

      next(form);
    });
  };

  // After a succesful login, yahoo redirects to a webpage with
  // a client side redirect. Find the redirect and follow
  var getClientRedirectURL = function(webpage, next){
    jsdom.env(webpage, ['http://code.jquery.com/jquery.js'], function(errors, window) {
      var $     = window.$;
      var href  = $('a').attr('href');
      next(href);
    });
  };

  // Find all input fields and return them along
  // with the form action
  var getFormDataFromAppApproval = function(webpage, next){
    jsdom.env(webpage, ['http://code.jquery.com/jquery.js'], function(errors, window) {
      var $       = window.$;
      var action  = $('.authPerms form').attr('action');
      var form    = {};

      $('.authPerms input').each(function(){
        var name = $(this).attr('name');
        if(name) form[name] = $(this).val()
      });

      next(action, form);
    });
  };
};


// Create a simple http server to listen for the 
exports.createRouteListener = function(route, isMatched){
  var server = http.createServer(function(req, res){

    var parsedEarl  = url.parse(req.url);
    var queryParams = qs.parse(parsedEarl.query);

    if(parsedEarl.pathname == route){
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end();
      isMatched(queryParams);
    }
  }).listen(port);
};