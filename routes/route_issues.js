/* jshint esversion: 6 */
var express    = require('express'),
    session    = require('express-session'),
    bluebird   = require('bluebird'),
    api        = new require('github')({host: 'api.github.com', Promise : bluebird}),
    bodyparser = require('body-parser'),
    UserConfig = require('../config/db_model.js'),
    _          = require('underscore'),
    gmail      = require('email-via-gmail'),
    rtIssues   = express.Router();

rtIssues.use(bodyparser.json({limit:'70mb'}));
rtIssues.use(bodyparser.urlencoded({limit:'70mb', extended: true}));

//Displays the issues-view
rtIssues.get('/:projectname', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let repo = req.params.projectname;
  let reponame = repo.substring(0, repo.lastIndexOf('-')).trim();
  let repoowner = repo.substring(repo.lastIndexOf('-') + 1).trim();
  api.repos.getCommits({"owner" : repoowner, "repo" : reponame}, (err, json) => {
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
  let repo = req.params.projectname;
  let reponame = repo.substring(0, repo.lastIndexOf('-')).trim();
  let repoowner = repo.substring(repo.lastIndexOf('-') + 1).trim();
  let tree = { owner: repoowner, repo: reponame, sha: req.body.sha, recursive: true};
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

//Notify users
rtIssues.post('/:projectname/notify', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let users = req.body.users;
  let emails = [];

  Promise.all(users.map((user) => {
    return api.users.getForUser({username: user.trim()});
  }))
  .then((resolve) => {

    resolve.forEach((user, index) => { //filter only emails
      let target = {
        username : user.data.login,
        mail : user.data.email,
        issue : req.body.title,
        proyect: req.params.projectname.substring(0, repo.lastIndexOf('-')).trim()
      };
      emails.push(target);
    });

    //send email to every user
    emails.forEach((item) => {
      if(item.mail){
        let text = `Hola ${item.username}!\n Tienes una asignación en la incidencia '${item.issue}' del proyecto '${item.proyect}'.`;
        gmail.login('alu0100503623@gmail.com', '59DiqHTi');
        gmail.sendEmail("BCFManager - Colaborador", text, item.mail);
      }
    });
    res.status(200).end();
  })
  .catch((reject) => {
    res.status(404).end();
  });


});

//Download ifc
rtIssues.post('/:projectname/dlifc' , (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let repo = req.params.projectname;
  let reponame = repo.substring(0, repo.lastIndexOf('-')).trim();
  let repoowner = repo.substring(repo.lastIndexOf('-') + 1).trim();
  let tree = { owner: repoowner, repo: reponame, sha: req.body.treesha, recursive: true};
  let blobName = "";

  api.gitdata.getTree(tree) //Request tree recursively
  .then((resolve) => {
    let blobs = _.filter(resolve.data.tree, (item) => { return item.path.includes('.ifc'); });
    blobName = blobs[0].path;
    return api.gitdata.getBlob({owner: repoowner, repo: reponame, sha: blobs[0].sha});
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
  let repo = req.params.projectname;
  let reponame = repo.substring(0, repo.lastIndexOf('-')).trim();
  let repoowner = repo.substring(repo.lastIndexOf('-') + 1).trim();
  let tree = { owner: repoowner, repo: reponame, sha: req.body.treesha, recursive: true};
  let blobsOrderedByName = [];

  api.gitdata.getTree(tree) //Request tree recursively
  .then((resolve) => {
      let blobs = _.filter(resolve.data.tree, (item) => { return item.type == 'blob' && !item.path.includes('.ifc'); });
      let blobsContent = [];
      blobs.forEach((blob) => {
        blobsOrderedByName.push(blob.path);
        blobsContent.push(api.gitdata.getBlob({owner:repoowner, repo: reponame, sha: blob.sha}));
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
  let repo = req.params.projectname;
  let reponame = repo.substring(0, repo.lastIndexOf('-')).trim();
  let repoowner = repo.substring(repo.lastIndexOf('-') + 1).trim();
  let repository = { owner: repoowner, repo: reponame, sha:  req.body.data.sha };
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
  let repo = req.params.projectname;
  let reponame = repo.substring(0, repo.lastIndexOf('-')).trim();
  let repoowner = repo.substring(repo.lastIndexOf('-') + 1).trim();
  let commitInfo = {}; //Esta informacion es la que va a ir en el dropdownlist cuando se termine de crear el commit.
  let files = req.body.data,
      repox  = reponame,
      owner = repoowner,
      shas = req.body.shas; //Store sha.parentcommit & sha.basetree

  Promise.all(files.map((file) => {
      return api.gitdata.createBlob({
        owner: owner,
        repo: repox,
        content: file.content,
        encoding: 'utf-8'
      });
  })).then((blobs) => {
      return api.gitdata.createTree({
        owner: owner,
        repo: repox,
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
        repo: repox,
        message: req.body.message,
        tree: tree.data.sha,
        parents: [shas.parentcommit]
      });
  }).then((commit) => {
      commitInfo = commit;
      return api.gitdata.updateReference({
        owner: owner,
        repo: repox,
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
  let repo = req.params.projectname;
  let reponame = repo.substring(0, repo.lastIndexOf('-')).trim();
  let repoowner = repo.substring(repo.lastIndexOf('-') + 1).trim();
  let file = {
    owner: repoowner,
    repo: reponame,
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
  let repo = req.params.projectname;
  let reponame = repo.substring(0, repo.lastIndexOf('-')).trim();
  let repoowner = repo.substring(repo.lastIndexOf('-') + 1).trim();  let github_list, mlab_list;

  api.repos.getForUser({username:req.session.username})
  .then((resolve) => {
    github_list = _.map(resolve.data, (repo) => { return JSON.stringify({"name": repo.name, "id": repo.id, "owner": repo.owner.login});});
    return UserConfig.find({name: req.session.username}).exec();
  })
  .then((resolve) => {
    mlab_list = _.map(resolve[0].repos, (repo) => { return (repo.name == reponame) ? JSON.stringify(repo) : ''; });
    return api.repos.getCollaborators({owner: repoowner, repo: reponame});
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
  let repo = req.params.projectname;
  let reponame = repo.substring(0, repo.lastIndexOf('-')).trim();
  let repoowner = repo.substring(repo.lastIndexOf('-') + 1).trim();
  let repox = {owner: repoowner, repo: reponame, username : req.body.user};
  let useremail;

  api.users.getForUser({username: req.body.user})
  .then((response) => {
    useremail = response.data.email;
    return api.repos.addCollaborator(repox);
  })
  .then((response) => {
    if(useremail){
      let text = `Hola ${req.body.user}!\n Has sido añadido como colaborador en el proyecto ${reponame} de ${repoowner}.`;
      gmail.login('alu0100503623@gmail.com', '59DiqHTi');
      gmail.sendEmail("BCFManager - Colaborador", text, useremail);
      res.status(201).send({hasMail:true}).end();
    } else {
      res.status(206).send({hasMail:false}).end();
    }
  })
  .catch((err) => {
    res.status(404).end();
  });

});

//Remove Collaborator
rtIssues.post('/:projectname/removecollab', (req, res, next) => {
  api.authenticate({ type: "basic", username: req.session.username, password: req.session.password});
  let repo = req.params.projectname;
  let reponame = repo.substring(0, repo.lastIndexOf('-')).trim();
  let repoowner = repo.substring(repo.lastIndexOf('-') + 1).trim();
  let repox = {owner: repoowner, repo: reponame, username : req.body.user};

  api.repos.removeCollaborator(repox)
  .then((resolve) => {
    //Buscar el user borrado en mlab, y quitar este repo de sus favoritos.
    return UserConfig.find({name: req.body.user}).exec();
  })
  .then((resolve) => {
    if(resolve.length > 0){
      resolve[0].repos.forEach((repo, index) => { if(reponame == repo.name) resolve[0].repos.splice(index, 1); }); //Eliminar el repo FIXME si tienes un repo que se llame igual, no garantiza eliminar el adecuado
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
    res.status(204).end();
  })
  .catch((reject) => {
    console.log('err', reject);
    res.status(404).end();
  });
});

module.exports = rtIssues;
