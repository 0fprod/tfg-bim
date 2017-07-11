var express    = require('express'),
    path       = require('path'),
    app        = express(),
    rtIndex    = require('./routes/route_index.js');

app.listen(process.env.PORT || 8080);
app.set('viewengine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', rtIndex);

console.log("Running at localhost:8080");
