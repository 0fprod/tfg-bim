var express    = require('express'),
    mongoose   = require('mongoose'),
    api        = new require('github')({host: 'api.github.com'}),
    userInfo   = {},
    UserConfig = require('../config/db_model.js'),
    rtProjects = require('./route_projects.js'),
    rtIssues   = require('./route_issues.js'),
    rtHome     = express.Router();

mongoose.connect('mongodb://admin:admin@ds151070.mlab.com:51070/tfgbim');
rtHome.use('/:username/projects', rtProjects);
rtHome.use('/:username/projects/p', rtIssues);

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
rtHome.get('/:username', checkAuth, (req, res, next) => {

  UserConfig.find({name: userInfo.name}, function(mongoerr, data){
    if(mongoerr || data.length == 0) res.render('pages/user_home.ejs', {user : userInfo, sync : []});
    else         res.render('pages/view_home.ejs', {user : userInfo, sync : data[0].repos});
  });

});

//Destroys session
rtHome.post('/logout', (req, res, next) => {
  mongoose.connection.close();
  req.session.destroy();
  res.sendStatus(200);
});


module.exports = rtHome;
