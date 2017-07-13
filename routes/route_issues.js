/* jshint esversion: 6 */
var express    = require('express'),
    session    = require('express-session'),
    bluebird   = require('bluebird'),
    api        = new require('github')({host: 'api.github.com', Promise : bluebird}),
    bodyparser = require('body-parser'),
    UserConfig    = require('../config/db_model.js'),
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

//Download ifc
rtIssues.post('/:projectname/dlifc' , (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');
  let tree = { owner: project[1], repo: project[0], sha: req.body.treesha, recursive: true};
  let blobName = "";

  api.gitdata.getTree(tree) //Request tree recursively
  .then((resolve) => {
    let blobs = _.filter(resolve.data.tree, (item) => { return item.path.includes('.ifc'); });
    blobName = blobs[0].path;
    return api.gitdata.getBlob({owner: project[1], repo: project[0], sha: blobs[0].sha});
  })
  .then((resolve) => {
    let finalBlob = {name: blobName, content: resolve.data.content};
    res.status(200).send(finalBlob);
  })
  .catch((reject) => {
    console.log('Err', reject);
  });
});

//Download bcf
rtIssues.post('/:projectname/dlbcf', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');
  let tree = { owner: project[1], repo: project[0], sha: req.body.treesha, recursive: true};
  let blobsOrderedByName = [];

  api.gitdata.getTree(tree) //Request tree recursively
  .then((resolve) => {
      let blobs = _.filter(resolve.data.tree, (item) => { return item.type == 'blob' && !item.path.includes('.ifc'); });
      let blobsContent = [];
      blobs.forEach((blob) => {
        blobsOrderedByName.push(blob.path);
        blobsContent.push(api.gitdata.getBlob({owner: project[1], repo: project[0], sha: blob.sha}));
      });
    return Promise.all(blobsContent);
    })
  .then((resolve) => {
    let finalBlobs = [];
    blobsOrderedByName.forEach((item, index) => {
      finalBlobs.push({name: item, content: resolve[index].data.content});
    });
    res.status(200).send(finalBlobs);
  })
  .catch((reject) => {
    console.log('Err', reject);
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

//Updates the issues content
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

//AdminCollaborators
rtIssues.post('/:projectname/collabs', (req, res, next) => {
  api.authenticate({type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');
  let github_list, mlab_list;

  api.repos.getForUser({username:req.session.username})
  .then((resolve) => {
    github_list = _.map(resolve.data, (repo) => { return JSON.stringify({"name": repo.name, "id": repo.id, "owner": repo.owner.login});});
    return UserConfig.find({name: req.session.username}).exec();
  })
  .then((resolve) => {
    mlab_list = _.map(resolve[0].repos, (repo) => { return (repo.name == project[0]) ? JSON.stringify(repo) : ''; });
    return api.repos.getCollaborators({owner: project[1], repo: project[0]});
  })
  .then((resolve) => {
    let inter = _.intersection(github_list, mlab_list);
    let owner = (inter.length > 0) ? true : false;
    res.send({collabs: resolve.data, owner: owner});
  })
  .catch((err) =>{
    console.log('err', err);
    res.status(403).end();
  });

});

//Add Collaborator
rtIssues.post('/:projectname/addcollab', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');
  let repo = {owner: project[1], repo: project[0], username : req.body.user};

  api.repos.addCollaborator(repo)
  .then((resolve) => {
    res.status(201).end();
  })
  .catch((reject) => {
    res.status(404).end();
  });
});

//Remove Collaborator
rtIssues.post('/:projectname/removecollab', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let project = req.params.projectname.split('-');
  let repo = {owner: project[1], repo: project[0], username : req.body.user};
  console.log(repo);
  api.repos.removeCollaborator(repo)
  .then((resolve) => {
    console.log('Eliminado de github', resolve);
    //Buscar el user borrado en mlab, y quitar este repo de sus favoritos.
    return UserConfig.find({name: req.body.user}).exec();
  })
  .then((resolve) => {
    console.log('Encontrado en mlabl ', resolve);
    if(resolve.length > 0){
      resolve[0].repos.forEach((repo, index) => { if(item.name == repo.name) resolve[0].repos.splice(index, 1); }); //Eliminar el repo FIXME si tienes un repo que se llame igual, no garantiza eliminar el adecuado
      let user = {
                  name: resolve[0].name,
                  repos : resolve[0].repos
                };
      return UserConfig.findOneAndUpdate({'name' : req.body.user}, {$set : user}, {upsert:true, overwrite:true}).exec();
    } else {
      res.status(204).end();
    }
  })
  .then((resolve) => {
    console.log('Eliminado supuestamente de mlab');
    res.status(204).end();
  })
  .catch((reject) => {
    console.log('err', reject);
    res.status(404).end();
  });
});

module.exports = rtIssues;
