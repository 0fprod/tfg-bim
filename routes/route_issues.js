var express    = require('express'),
    session    = require('express-session'),
    bluebird   = require('bluebird'),
    api        = new require('github')({host: 'api.github.com', Promise : bluebird}),
    bodyparser = require('body-parser'),
    rtIssues   = express.Router();

rtIssues.use(bodyparser.json({limit:'70mb'}));
rtIssues.use(bodyparser.urlencoded({limit:'70mb', extended: true}));

rtIssues.get('/:projectname', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let repo = req.params.projectname.split('-'); //[0] projectname - [1] project owner
  //TODO what if multiple owners has repo with the same name
  //TODO if the repository does not exist,somehow delete it from mongoDB
  api.repos.getCommits({"owner" : repo[1], "repo" : repo[0]}, (err, json) => {
    if(err)  console.log(err);
    else
      res.render('pages/view_issues.ejs', {user : req.session.userInfo, project : repo, commits : json.data});
  });
});

//Download ifc/bcf as zip
rtIssues.post('/:projectname/dl', (req, res, next) => {
  console.log('Post download');
});

//Upload ifc
rtIssues.post('/:projectname/ulifc', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');
  let repository = { owner: project[1], repo: project[0], sha:  req.body.data.sha };
  //Check repo on last commit
  api.repos.getCommit(repository)
  .then((resolve) => {
    let targetFile; //File to be updated
    for(let i = 0; i < resolve.data.files.length; i++)
      if(resolve.data.files[i].filename.includes('.ifc')){
        targetFile = resolve.data.files[i];
        break;
      }

    let file = {
      owner: repository.owner,
      repo: repository.repo,
      path: targetFile.filename,
      message: req.body.data.message,
      content: req.body.data.content,
      sha: targetFile.sha
    }

    return api.repos.updateFile(file);
  }).then((resolve) => {
    res.status(200).send(resolve);
  }).catch((err) => {
    console.log('err', err);
    res.end();
  })

});

//Upload bcf
rtIssues.post('/:projectname/ulbcf', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');

  let files = req.body.data,
      repo  = project[0],
      owner = project[1],
      shas = req.body.shas; //Store sha.parentcommit & sha.basetree

  Promise.all(files.map((file) => {
      console.log('Create blob');
      return api.gitdata.createBlob({
        owner: owner,
        repo: repo,
        content: file.content,
        encoding: 'utf-8'
      });
  })).then((blobs) => {
      console.log('Create tree');
      return api.gitdata.createTree({
        owner: owner,
        repo: repo,
        tree: blobs.map((blob, index) => {
          return {
            path: 'incidencias/' + files[index].name,
            mode: '100644',
            type: 'blob',
            sha: blob.data.sha
          };
        }),
        base_tree : shas.basetree
    });
  }).then((tree) => {
      console.log('Create commit');
      return api.gitdata.createCommit({
        owner:owner,
        repo: repo,
        message: req.body.message,
        tree: tree.data.sha,
        parents: [shas.parentcommit]
      });
  }).then((commit) => {
      console.log('Updated ref');
      return api.gitdata.updateReference({
        owner: owner,
        repo: repo,
        ref: 'heads/master',
        sha: commit.data.sha,
        force: false
      });
  }).then((resp) => {
    console.log(resp);
    res.status(200).send(resp);
  }).catch((err) => {
    console.log('Err', err);
    res.sendStatus(409);
  })

});

module.exports = rtIssues;
