var express    = require('express'),
    api        = new require('github')({host: 'api.github.com'}),
    bodyparser = require('body-parser'),
    session    = require('express-session'),
    rtHome     = require('./route_home.js'),
    rtIndex    = express.Router();

rtIndex.use(bodyparser.urlencoded({limit:'70mb', extended:true}));
rtIndex.use(session({
                    name: 'sessionID',
                    secret:'secrettfg',
                    resave: false,
                    saveUninitialized: false,
                    cookie : {
                            maxAge: 18000000
                    }
                  }));
rtIndex.use('/u', rtHome);

rtIndex.get('/', function(req, res, next){
  res.render('pages/view_index.ejs', {});
});

rtIndex.post('/login', function (req, res, next){
  api.authenticate({ type: "basic", username: req.body.username, password: req.body.password});
  api.users.get({}, (err, json) => {
    if(err){
      res.sendStatus(401);
    } else {
      req.session.username = req.body.username;
      req.session.password = req.body.password;
      res.sendStatus(200);
    }
  });
});

module.exports = rtIndex;
