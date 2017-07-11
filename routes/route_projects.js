/* jshint esversion: 6 */
var express       = require('express'),
    bodyparser    = require('body-parser'),
    session       = require('express-session'),
    api           = new require('github')({host: 'api.github.com'}),
    UserConfig    = require('../config/db_model.js'),
    rtProjects    = express.Router();

rtProjects.use(bodyparser.json({limit:'70mb'}));

//Displays all the repositories where the user has contributed to.
rtProjects.get('/', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});

  api.repos.getAll({},  function(apierr, json) {
    UserConfig.find({name: req.session.userInfo.name}, function (errmg, data){
      let list = json.data.map((item) => { return {'name': item.name , 'owner': item.owner.login};}); //name&owner each repo in github
      if(data.length > 0 ){
        let sync = data[0].repos.map((item) => { return JSON.stringify(item); } ); //name&owner each repo in mongoose stringified to be compared in marked
        let marked = list.map((item) => {
          if(sync.includes(JSON.stringify(item))) return {'name': item.name , 'owner': item.owner, 'marked' : true};
          else                                    return {'name': item.name , 'owner': item.owner, 'marked' : false};
        });
        res.render('pages/view_projects.ejs', {user : req.session.userInfo, sync : marked});
      } else
        res.render('pages/view_projects.ejs', {user : req.session.userInfo, sync : list});
    });
  });

});

//Creates a repository on github
rtProjects.post('/create', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project    = req.body.data,
      repository = {  name : project.name,
                      private: (project.type == 'private') ? true : false,
                      has_issues: false,
                      has_wiki: false,
                      has_projects:false,
                      has_downloads: true
                    },
      file       = {  owner: req.session.userInfo.name,
                      repo: project.name,
                      path: project.path,
                      message: "Proyecto inicial(IFC)",
                      content: project.content
                    };

  api.repos.create(repository, (err, data) => {
      if(err)
        res.status(400).send(err);
      else{
        if(project.content){
          api.repos.createFile(file, (err, json) => {
            if(err) res.status(400).send(err);   //Bad request
            else    res.status(200).send(json); //OK
          });
        } else{
          res.status(200).send(data);
        }
      }
  });
});

//Deletes a project
rtProjects.post('/delete', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  //FIXME api.repos.removeCollaborator({owner: 'alehdezp', repo:'ejemplo-fran', username : 'franjpr'}, (err,json) => {});

  let project = req.body.repo;

  api.repos.delete(project, (err, json) => {
    if(err)   res.status(err.code).send(err.message);
    else      res.status(200).send( json);
  });
});

//Updates the list stored in mongo db
rtProjects.post('/update', (req, res, next) => {
  let user = {'name': req.session.userInfo.name, 'repos' : req.body.data};
  UserConfig.findOneAndUpdate({'name' : req.session.userInfo.name}, {$set : user}, {upsert:true, overwrite:true}, (err, data) => {
    if(err){
      res.sendStatus(404); //User not found
    } else {
      res.sendStatus(200);
    }
  });

});

module.exports = rtProjects;
