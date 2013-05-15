
/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
// app.use(express.favicon());
app.use(express.logger('short'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var server = http.createServer(app);
var io = require('socket.io').listen(server);
var streamable = exports.streamable = require('streamable').streamable(io);

require('./routes')(app);
if ('development' == app.get('env')) {
  console.log(app.routes);
}

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
