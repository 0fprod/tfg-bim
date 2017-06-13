var express    = require('express'),
    api        = new require('github')({host: 'api.github.com'}),
    bodyparser = require('body-parser'),
    session    = require('express-session'),
    user_home  = require('./user_home.js'),
    index = express.Router();

index.use(bodyparser.urlencoded({limit:'70mb', extended:true}));
index.use(session({
                    name: 'sessionID',
                    secret:'secrettfg',
                    resave: false,
                    saveUninitialized: false,
                    cookie : {
                            maxAge: 18000000
                    }
                  }));
index.use('/u', user_home);

index.get('/', function(req, res, next){
  res.render('pages/index.ejs', {});
});

index.post('/login', function (req, res, next){
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

module.exports = index;
