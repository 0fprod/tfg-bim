/* jshint esversion: 6 */
var express    = require('express'),
    session    = require('express-session'),
    bluebird   = require('bluebird'),
    api        = new require('github')({host: 'api.github.com', Promise : bluebird}),
    bodyparser = require('body-parser'),
    _          = require('underscore'),
    rtIssues   = express.Router();

rtIssues.use(bodyparser.json({limit:'70mb'}));
rtIssues.use(bodyparser.urlencoded({limit:'70mb', extended: true}));

rtIssues.get('/:projectname', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let repo = req.params.projectname.split('-'); //[0] projectname - [1] project owner

  api.repos.getCommits({"owner" : repo[1], "repo" : repo[0]}, (err, json) => {
    if(err){
      res.status('404').end();
    } else{
      res.render('pages/view_issues.ejs', {user : req.session.userInfo, project : repo, commits : json.data});
    }
  });
});

//Display issues
rtIssues.post('/:projectname/getissues', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');
  let tree = { owner: project[1], repo: project[0], sha: req.body.sha, recursive: true};
  let issuesOrderedByContent = [];
  api.gitdata.getTree(tree).then((res) => {
    let markupsAndSnapshotsOnly = _.filter(res.data.tree, (item) => {return (item.path.includes('markup') || item.path.includes('snapshot')); });
    let blobsByFolder = _.groupBy(markupsAndSnapshotsOnly, (item) => {return item.path.substring(0, item.path.lastIndexOf('/')); });
    let blobsContent = [];

    Object.keys(blobsByFolder).forEach((blob) => {
      blobsByFolder[blob].forEach((file) => {
        issuesOrderedByContent.push({[file.path.substring(0, file.path.indexOf('.'))]: '', blobsha: file.sha});
        blobsContent.push(api.gitdata.getBlob({owner: tree.owner, repo: tree.repo, sha: file.sha}));
      });
    });
    return Promise.all(blobsContent);
  }).then((issues) => {
    //Assign content to the respective issue
     issuesOrderedByContent.forEach((item, index) => {
       item[Object.keys(item)[0]] = issues[index].data.content;
     });

     let issuesOrderedByName = []; // final items content = {name:'foldername', markup: b64, snapshot: b64}
     issuesOrderedByContent.forEach((item) => {
       let folderName = Object.keys(item)[0].substring(0, Object.keys(item)[0].lastIndexOf('/'));
       let propertyName = Object.keys(item)[0].substring(Object.keys(item)[0].lastIndexOf('/') + 1);
       let content = item[Object.keys(item)[0]];
       let issue = {};
       if (propertyName == 'markup'){
         issue = { name : folderName, [propertyName] : content , blobsha : item.blobsha};
       } else {
         issue = { name : folderName, [propertyName] : content};
       }


       if ((issuesOrderedByName.length > 0) && (_.last(issuesOrderedByName).name == folderName))
         Object.assign(_.last(issuesOrderedByName), issue);
       else
         issuesOrderedByName.push(issue);

     });

    res.status(200).send(issuesOrderedByName);
  }).catch((err) => {
    console.log('Err', err);
    res.status(409).send(err);
  });

});

//Download ifc/bcf as zip
rtIssues.post('/:projectname/download', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');
  let file = {owner: project[1], repo: project[0], archive_format: 'zipball', ref: req.body.ref};
  api.repos.getArchiveLink(file).then((resp) => {
    //FIXME how to send files to client
  }).catch((err) => {
    console.log(err);
  });
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
    };

    return api.repos.updateFile(file);
  }).then((resolve) => {
    res.status(200).send(resolve);
  }).catch((err) => {
    console.log('err', err);
    res.end();
  });

});

//Upload bcf
rtIssues.post('/:projectname/ulbcf', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');
  let commitInfo = {}; //Esta informacion es la que va a ir en el dropdownlist cuando se termine de crear el commit.
  let files = req.body.data,
      repo  = project[0],
      owner = project[1],
      shas = req.body.shas; //Store sha.parentcommit & sha.basetree

  Promise.all(files.map((file) => {
      return api.gitdata.createBlob({
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
            path: 'incidencias/' + files[index].name,
            mode: '100644',
            type: 'blob',
            sha: blob.data.sha
          };
        }),
        base_tree : shas.basetree
    });
  }).then((tree) => {
      return api.gitdata.createCommit({
        owner:owner,
        repo: repo,
        message: req.body.message,
        tree: tree.data.sha,
        parents: [shas.parentcommit]
      });
  }).then((commit) => {
      commitInfo = commit;
      return api.gitdata.updateReference({
        owner: owner,
        repo: repo,
        ref: 'heads/master',
        sha: commit.data.sha,
        force: false
      });
  }).then((resp) => {
    res.status(200).send(commitInfo);
  }).catch((err) => {
    console.log('Err', err);
    res.sendStatus(409);
  });

});

rtIssues.post('/:projectname/updatemarkup', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');
  let file = {
    owner: project[1],
    repo: project[0],
    path: req.body.markup.path,
    message: req.body.markup.message,
    content: req.body.markup.content,
    sha: req.body.markup.sha
  };

  api.repos.updateFile(file)
  .then((resp) => {
    res.status(200).end();
  })
  .catch((err) => {
    console.log('err', err);
    res.status(409).end();
  });

});
module.exports = rtIssues;
