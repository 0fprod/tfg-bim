/* jshint esversion: 6*/
var express    = require('express'),
    path       = require('path'),
    app        = express(),
    rtIndex    = require('./routes/route_index.js'),
    favicon    = require('serve-favicon'),
    helmet     = require('helmet');

app.listen(process.env.PORT || 8080);
app.set('viewengine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico')));
app.use('/', rtIndex);
app.use(helmet());

console.log("Running at localhost:8080");
