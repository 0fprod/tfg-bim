/* jshint esversion: 6*/
var express    = require('express'),
    session    = require('express-session'),
    api        = new require('github')({host: 'api.github.com'}),
    bodyparser = require('body-parser'),
    rtHome     = require('./route_home.js'),
    rtIndex    = express.Router();

rtIndex.use(bodyparser.urlencoded({limit:'70mb', extended:true}));
rtIndex.use(session({
    secret: 'tfg-secret',
    resave: true,
    saveUninitialized : true,
    cookie: {
            httpOnly: true,
            expires: new Date( Date.now() + 60 * 60 * 1000 ) // 1 hour
          }
}));

var checkSession = (req, res, next) => {
  if(req.session.username && req.session.password)
    next();
  else
    res.redirect('/?badLogin=true');
};

rtIndex.use('/u', checkSession, rtHome);

rtIndex.get('/', function(req, res, next){
  res.render('pages/view_index.ejs', {});
});

//Creates session
rtIndex.post('/login', function (req, res, next){
  api.authenticate({ type: "basic", username: req.body.username, password: req.body.password});
  api.users.get({}, (err, json) => {
    if(err){
      res.status(401).end();
    } else {
      req.session.username = req.body.username;
      req.session.password = req.body.password;
      req.session.userInfo = {name : json.data.login, avatar : json.data.avatar_url, email : json.data.email};
      res.send({redirectTo : 'u/' + req.body.username});
    }
  });
});

module.exports = rtIndex;
