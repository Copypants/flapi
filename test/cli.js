// Parse cli arguments to determine whether or not
// we need to build the client with a pre determined
// secret
var args        = process.argv;
var index       = args.indexOf('auth');
var authArg     = index != -1 ? args[index + 1] : 'true';
exports.useAuth = authArg == 'false' ? false : true;