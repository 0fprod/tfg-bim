var express    = require('express'),
    mongoose   = require('mongoose'),
    UserConfig = require('../config/db_model.js'),
    rtProjects = require('./route_projects.js'),
    rtIssues   = require('./route_issues.js'),
    rtHome     = express.Router();

mongoose.connect('mongodb://admin:admin@ds151070.mlab.com:51070/tfgbim');
rtHome.use('/:username/projects', rtProjects);
rtHome.use('/:username/projects/p', rtIssues);

//Displays active repositories from an user
rtHome.get('/:username', (req, res, next) => {
  UserConfig.find({name: req.session.userInfo.name}, function(mongoerr, data){
    if(mongoerr || data.length == 0) res.render('pages/user_home.ejs', {user : userInfo, sync : []});
    else                             res.render('pages/view_home.ejs', {user : req.session.userInfo, sync : data[0].repos});

  });
});

//Destroys session
rtHome.post('/logout', (req, res, next) => {
  mongoose.connection.close();
  req.session.destroy();
  res.sendStatus(200);
});


module.exports = rtHome;
