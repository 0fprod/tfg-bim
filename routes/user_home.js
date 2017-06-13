var express      = require('express'),
    userprojects = require('./user_projects.js'),
    userrepo     = require('./user_repo.js'),
    mongoose     = require('mongoose'),
    api          = new require('github')({host: 'api.github.com'}),
    UserConfig   = require('../config/db_model.js'),
    user_home    = express.Router(),
    userInfo     = {};

mongoose.connect('mongodb://admin:admin@ds151070.mlab.com:51070/tfgbim');
user_home.use('/:username/projects', userprojects);
user_home.use('/:username/projects/p', userrepo);

//checkAuth
var checkAuth = (req, res, next) => {
  if(req.session.username && req.session.password){
    api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
    api.users.get({}, (err, json) => {
      if(err){
        console.log('Errror', err);
        res.redirect('/?badLogin=true');
      }
      else{
        userInfo = {name : json.data.login, avatar : json.data.avatar_url, email : json.data.email};
        next();
      }
    });
  } else {
    res.redirect('/?badLogin=true');
  }
}

//Displays active repositories from an user
user_home.get('/:username', checkAuth, (req, res, next) => {

  UserConfig.find({name: userInfo.name}, function(mongoerr, data){
    if(mongoerr || data.length == 0) res.render('pages/user_home.ejs', {user : userInfo, sync : []});
    else         res.render('pages/user_home.ejs', {user : userInfo, sync : data[0].repos});
  });

});

//Destroys session
user_home.post('/logout', (req, res, next) => {
  mongoose.connection.close();
  req.session.destroy();
  res.sendStatus(200);
});


module.exports = user_home;
