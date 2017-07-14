/* jshint esversion: 6*/
var express    = require('express'),
    path       = require('path'),
    app        = express(),
    https      = require('https'),
    fs         = require('fs'),
    rtIndex    = require('./routes/route_index.js'),
    helmet     = require('helmet'),
    options    = {
      key  : fs.readFileSync('./certs/server.key'),
      cert : fs.readFileSync('./certs/server.crt')
    };

app.set('viewengine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());
app.use('/', rtIndex);

https.createServer(options, app).listen(8080, () => {
  console.log("Running at localhost:8080");
});
