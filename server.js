/* jshint esversion: 6*/
var express    = require('express'),
    path       = require('path'),
    app        = express(),
    rtIndex    = require('./routes/route_index.js'),
    https      = require('https'),
    fs         = require('fs'),
    helmet     = require('helmet'),
    options    = {
     key  : fs.readFileSync('./certs/server.key'),
     cert : fs.readFileSync('./certs/server.crt')
    };

//app.listen(process.env.PORT || 8080);
app.set('viewengine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', rtIndex);
app.use(helmet());

//console.log("Running at localhost:8080");


https.createServer(options, app).listen(8080, () => {
  console.log("Running at localhost:8080");
});
