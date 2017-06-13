var express    = require('express'),
    session    = require('express-session'),
    api        = new require('github')({host: 'api.github.com'}),
    reponame   = express.Router(),
    bodyparser = require('body-parser'),
    userInfo   = {};

reponame.use(bodyparser.urlencoded({limit:'70mb', extended: true}));

var checkAuth = (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  api.users.get({}, (err, json) => {
    if(err)
      res.sendStatus(401);
    else{
      userInfo = {name : json.data.login, avatar : json.data.avatar_url, email : json.data.email};
      next();
    }
  });
}

reponame.get('/:projectname', checkAuth, (req, res, next) => {

  api.repos.getCommits({"owner" : req.query.owner, "repo" : req.params.projectname}, (err, json) => {
    if(err){
      console.log(err);
    }
    else {
      let parseDate = function (str){
        let date = str.substring(0, str.indexOf('T')).split('-');
        return date[2] + '/' + date[1] + '/' + date[0];
      }
      res.render('pages/user_bcf.ejs', {user : userInfo, title : req.params.projectname, commits : json.data, parseDate : parseDate});
    }
  });
});


module.exports = reponame;
