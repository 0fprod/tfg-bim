var express    = require('express'),
    path       = require('path'),
    app        = express(),    
    index      = require('./routes/index.js');

app.listen(process.env.PORT || 8080);
app.set('viewengine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
//app.use(bodyparser.json({limit:'50mb'}));
app.use('/', index);


console.log("Running at localhost:8080");
