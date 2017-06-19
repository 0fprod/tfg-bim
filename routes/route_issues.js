var express    = require('express'),
    session    = require('express-session'),
    bluebird   = require('bluebird'),
    api        = new require('github')({host: 'api.github.com', Promise : bluebird}),
    bodyparser = require('body-parser'),
    userInfo   = {},
    rtIssues   = express.Router();

rtIssues.use(bodyparser.json({limit:'70mb'}));
rtIssues.use(bodyparser.urlencoded({limit:'70mb', extended: true}));

//check session
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

rtIssues.get('/:projectname', checkAuth, (req, res, next) => {

  api.repos.getCommits({"owner" : req.query.owner, "repo" : req.params.projectname}, (err, json) => {
    if(err){
      console.log(err);
    }
    else {
      //console.log(JSON.stringify(json, null));
      let parseDate = function (str){
        let date = str.substring(0, str.indexOf('T')).split('-');
        return date[2] + '/' + date[1] + '/' + date[0];
      }
      res.render('pages/view_issues.ejs', {user : userInfo, title : req.params.projectname, commits : json.data, parseDate : parseDate});
    }

  });
});

rtIssues.post('/:projectname', (req, res, next) => {
  if(req.query.uploadzip === 'true'){
    let files = req.body.data,
        repo  = req.params.projectname,
        owner = req.query.owner,
        shas = req.body.shas; //Store sha.parentcommit & sha.basetree

    Promise.all(files.map((file) => {
      return api.gitdata.createBlob({                                            // it 'resets' to normal when the page is refreshed
        owner: owner,
        repo: repo,
        content: file.content,
        encoding: 'utf-8'
      });
    })).then((blobs) => {
      return api.gitdata.createTree({
        owner: owner,
        repo: repo,
        tree: blobs.map((blob, index) => {
          return {
            path: files[index].name.replace('/','@'),
            mode: '100644',
            type: 'blob',
            sha: blob.data.sha
          };
        }),
        base_tree : shas.basetree
      })
    }).then((tree) => {
      return api.gitdata.createCommit({
        owner:owner,
        repo: repo,
        message: "Primera carga del BCF",
        tree: tree.data.sha,
        parents: [shas.parentcommit]
      });
    }).then((commit) => {
      return api.gitdata.updateReference({
        owner: owner,
        repo: repo,
        ref: 'heads/master',
        sha: commit.data.sha,
        force: false
      });
    });
  }
  res.sendStatus(200);
});

module.exports = rtIssues;
