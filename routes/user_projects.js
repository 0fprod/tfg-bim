var express       = require('express'),
    api           = new require('github')({host: 'api.github.com'}),
    bodyparser    = require('body-parser'),
    session       = require('express-session'),
    mongoose      = require('mongoose'),
    UserConfig    = require('../config/db_model.js'),
    user_projects = express.Router(),
    userInfo      = {};

user_projects.use(bodyparser.json({limit:'70mb'}));

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

//Displays all the repositories where the user has contributed to.
user_projects.get('/', checkAuth, (req, res, next) => {
  api.repos.getAll({},  function(apierr, json) {
    UserConfig.find({name: userInfo.name}, function (errmg, data){
      let list = json.data.map((item) => { return {'name': item.name , 'owner': item.owner.login}}); //name&owner each repo in github
      if(data.length > 0 ){
        let sync = data[0].repos.map((item) => { return JSON.stringify(item); } ); //name&owner each repo in mongoose stringified to be compared in marked
        let marked = list.map((item) => {
          if(sync.includes(JSON.stringify(item))) return {'name': item.name , 'owner': item.owner, 'marked' : true};
          else                                    return {'name': item.name , 'owner': item.owner, 'marked' : false};
        });
        res.render('pages/user_projects.ejs', {user : userInfo, sync : marked});
      } else
        res.render('pages/user_projects.ejs', {user : userInfo, sync : list});
    });
  });

});

//Creates a repository on github
user_projects.post('/create', checkAuth, (req, res, next) => {
  let repo       = req.body.data,
      repository = {
                    name : repo.title,
                    private: (repo.visibility == 'private') ? true : false,
                    has_issues: false,
                    has_wiki: false,
                    has_projects:false,
                    has_downloads: true
                   };
  api.repos.create(repository, (err, data) => {
      if(err) console.log('Error', err);
      else{
        if(repo.content){
          api.repos.createFile({ owner: userInfo.name,
                                 repo: repo.title,
                                 path: repo.filename,
                                 message: 'Proyecto inicial',
                                 content: repo.content,
                                 committer: {'name': userInfo.name,'email': userInfo.email},
                                }, (error, json) => {
                                    if(error){
                                      console.log(error)
                                      res.sendStatus(409) //Conflict, if private user must updgrade gh account
                                    }
          });
        }
        res.sendStatus(200, repository.name); //Ok
      }
  });
});

//Deletes a project
user_projects.post('/delete', checkAuth, (req, res, next) => {

  let project = req.body.repo;
  api.repos.delete(project, (err, json) => {
    if(err){
      console.log(err);
      res.send(err.code, err.message); //Gone
    }
    else {
      res.sendStatus(200); //Ok
    }
  });
});

//Updates the list stored in mongo db
user_projects.post('/update', (req, res, next) => {
  let user = {'name': userInfo.name, 'repos' : req.body.data};
  UserConfig.findOneAndUpdate({'name' : userInfo.name}, {$set : user}, {upsert:true, overwrite:true}, (err, data) => {
    if(err){
      console.log(err);
      res.sendStatus(404); //User not found
    } else {
      res.sendStatus(200);
    }
  });

});

module.exports = user_projects;
