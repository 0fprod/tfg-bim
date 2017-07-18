/* jshint esversion:6 */
(() => {
  $('document').ready(() => {
    var issuesList = [];
    var currentIssue = {};

    //Input[File] event
    $('#uploadfile').on('change', (evt) => {
      $('.filename').text(evt.target.files[0].name.trim());
    });

    //Displays all the issues in the selected commit
    $('#display-issues').on('click', (evt) => {
      issuesList = [];
      $('.repo-container').empty();
      $('.overlay').css('display','block');
      $('#loading-icon').css('display','block');
      $.ajax({
        type: 'POST',
        url: window.location + '/getissues',
        data : {"sha" : $('select :selected').attr('sha')}
      }).then((issuesOrderedByName) => {
        issuesOrderedByName.forEach((issue) => {
          appendIssueBox(issue);
        });
        $('.overlay').css('display','none');
        $('#loading-icon').css('display','none');
      }).catch((err) => {
        console.log('Err', err);
      });
    });//End onClick event

    //Upload a file
    $('#uploadbtn').on('click', (evt) => {
      let commit_msg = '<input style="width:80%;margin:1%" id="commitmsg" type="text" placeHolder="Mensaje identificador (obligatorio)" required/>';
      $.alert({
        useBootstrap: false,
        closeIcon: true,
        boxWidth: '30%',
        type: 'blue',
        title: 'Subir',
        content: '<p class="dl-link ul"> Examinar ...</p> \n <span> Archivo: <span class="filename"> </span></span> <br> ' + commit_msg,
        onClose: () => {
          if($('#uploadfile').val() != ''){
            let commit = {  filename: $('#uploadfile')[0].files[0].name,
                            message: $('#commitmsg').val(),
                            content: $('#uploadfile')[0].files[0],
                            sha: ($('select :selected').attr('sha')) ? $('select :selected').attr('sha') : ''
                          };
            if(commit.content.name.includes('.ifc'))  uploadIFC(commit);
            else                                      uploadBCF(commit);
          }
        }
      });
    });

    //Displays an alert to choose download IFC or BCF
    $('#downloadbtn').on('click', (evt) => {
        downloadDialog();
    });

    //Resets #uploadfile and invokes #uploadfile.click
    $(document).on('click', '.ul', (evt) => {
      $('#uploadfile').val('');
      $('#uploadfile').click();
    });

    //Displays chat window
    $('.repo-container').on('click', '.issue-block', (evt) => {
      let issue = issuesList[$(evt.currentTarget).index()];
      currentIssue = issue;
      closeModal();
      setTimeout(() => {
        $('.modal-container').append(createChat(issue)).css('top','5%').css('background-color','#EFEFEF').css('border-color','#a702ab');
      }, '400');
    });

    //AdminCollaborators
    $('#collabs').on('click', (evt) => {
      $('.overlay').css('display','block');
      $('#loading-icon').css('display','block');
      $.post({url: window.location + '/collabs'})
      .then((resolve) => {
        $('.overlay').css('display','none');
        $('#loading-icon').css('display','none');
        displayCollabs(resolve);
      })
      .catch((err) => {
        $('.overlay').css('display','none');
        $('#loading-icon').css('display','none');
        $.notify('Debes pertenecer al proyecto para poder ver los colaboradores', 'error');
      });
    });

    //Unzip the file, and pushes to github all the issues inside that file.
    let uploadBCF = (commit) => {
      $('.overlay').css('display','block');
      $('#loading-icon').css('display','block');
      let filesInArray = []; //Unzipped files
      let filesToSend  = [];  //Files to send to the server

      JSZip.loadAsync(commit.content).then((zip) => {
        for(let prop in zip.files)
         filesInArray.push(zip.files[prop]);
      }).then(() => {
        Promise.all(filesInArray.map((file) => {
          if(file.name.lastIndexOf('/') != file.name.length - 1){
            if(file.name.substring(file.name.length - 3) === 'png')   return file.async('base64').then((resp) => {filesToSend.push({name:file.name, content: resp});});
            else                                                      return file.async('string').then((resp) => {filesToSend.push({name:file.name, content: resp});});
          }
        })).then(() => {
          let shas = {parentcommit : $($('.options').toArray()[0]).attr('sha'), basetree : $($('.options').toArray()[0]).attr('btree')};
          $.ajax({
            type:'POST',
            url: window.location + '/ulbcf',
            data: {"data": filesToSend, "shas" : shas, "message": commit.message},
            success: (json) => {
              let opt = $(document.createElement('option')).attr({sha: json.data.sha, btree: json.data.tree.sha, title: json.data.message})
              .text(new Date().toLocaleDateString() + ' - ' + $('#username').text().trim()  + ' - ' + json.data.message);
              $('select').prepend(opt).effect('bounce', 'slow');
              $('.overlay').css('display','none');
              $('#loading-icon').css('display','none');
            },
            error: (err) => {
              console.log(err);
              $('.overlay').css('display','none');
              $('#loading-icon').css('display','none');
            }
          });
        });
      });
    };

    //Pushes the IFC file to github.
    let uploadIFC = (commit) => {
      let filereader = new FileReader();
      filereader.onloadstart = () => { $('#loading-icon').css('display','block').css('top','20%');};
      filereader.onload = () => {
        commit.content = btoa(filereader.result); //Encode to b64
        //Send to server
        $('#loading-icon').css('display','none');
        $.ajax({
          type:'POST',
          url: window.location + '/ulifc',
          data: {"data" : commit},
          beforeSend: () => {
            $('#loading-icon').css('display','block').css('top','20%');
          },
          success: (json) => {
            let opt = $(document.createElement('option')).attr({sha: json.data.commit.sha, btree: json.data.commit.tree.sha, title: json.data.commit.message})
            .text(new Date().toLocaleDateString() + ' - ' + $('#username').text().trim()  + ' - ' + json.data.commit.message);
            $('select').prepend(opt).effect('bounce', 'slow');
            $('#loading-icon').css('display','none');
          },
          error: (err) => {
            console.log('err', err);
            $('#loading-icon').css('display','none');
          }
        });
      };
      filereader.readAsText(commit.content);
    };

    //Appends a box to .repo-container
    let appendIssueBox = (issue) => {
      let preview = (issue.snapshot) ? 'data:image/png;base64, ' + atob(issue.snapshot) : '/img/nofoto.jpg';
      let x2js        = new X2JS(),
          jsonbcf     = x2js.xml_str2json(atob(issue.markup)),
          issue_block = $(document.createElement('div')).addClass('issue-block'),
          issue_prev  = $(document.createElement('img')).addClass('issue-prev').attr('src', preview),
          issue_desc  = $(document.createElement('ol')).addClass('issue-desc'),
          author      = $(document.createElement('li')).addClass('issue-item').text((jsonbcf.Markup.Topic.CreationAuthor == undefined) ? 'Autor: -'  : 'Autor: ' +jsonbcf.Markup.Topic.CreationAuthor ),
          date        = $(document.createElement('li')).addClass('issue-item').text('Fecha: ' + new Date(jsonbcf.Markup.Header.File.Date).toLocaleDateString()),
          assign      = $(document.createElement('li')).addClass('issue-item').text((jsonbcf.Markup.Topic.AssignedTo == undefined) ? 'Asignado a: -' : 'Asignado a: ' + jsonbcf.Markup.Topic.AssignedTo),
          title       = $(document.createElement('div')).addClass('issue-title').text(jsonbcf.Markup.Topic.Title),
          modifd      = $(document.createElement('li')).addClass('issue-item'),
          modifby     = $(document.createElement('li')).addClass('issue-item'),
          istatus     = $(document.createElement('li')).addClass('issue-status');

      if(jsonbcf.Markup.Comment) {
        if(jsonbcf.Markup.Comment.constructor === Array){
          let index = jsonbcf.Markup.Comment.length - 1;
          $(modifd).text('Ult. Modif.: ' + new Date(jsonbcf.Markup.Comment[index].Date).toLocaleDateString());
          $(modifby).text('Modif. por: ' + jsonbcf.Markup.Comment[index].Author);
          $(istatus).text(jsonbcf.Markup.Comment[index].Status);
        } else {
          $(modifd).text('Ult. Modif.: ' + new Date(jsonbcf.Markup.Comment.Date).toLocaleDateString());
          $(modifby).text('Modif. por: ' + jsonbcf.Markup.Comment.Author);
          $(istatus).text(jsonbcf.Markup.Comment.Status);
        }
      } else {
        $(modifd).text('Ult. Modif.: ' + new Date(jsonbcf.Markup.Header.File.Date).toLocaleDateString());
        $(modifby).text('Modif. por: ');
        $(istatus).text('');
      }

      $(issue_desc).append(author, date, assign, modifd, modifby, istatus);
      $(issue_block).attr('title', (jsonbcf.Markup.Topic.Description == undefined) ? 'Sin descripción' : jsonbcf.Markup.Topic.Description);
      $(issue_block).append(issue_prev, issue_desc, title);
      $('.repo-container').append(issue_block);
      issuesList.push({path: issue.name, content: jsonbcf.Markup, blobsha: issue.blobsha});
    };

    //Creates a chat window for the issue
    let createChat = (issue) => {
      let msgBlock  = $(document.createElement('div')).addClass('msg-block'),
          topBar    = $(document.createElement('div')).addClass('top-bar'),
          closeIcon = $(document.createElement('i')).addClass('fa fa-close'),
          chatArea  = $(document.createElement('div')).addClass('chat-area'),
          writeArea = $(document.createElement('div')).addClass('write-area'),
          statusLbl = $(document.createElement('label')).attr('for','status-list'),
          statusList= $(document.createElement('select')).attr('id', 'status-list'),
          optOpen   = $(document.createElement('option')).attr('value', 'Abierto').text('Abierto'),
          optClose  = $(document.createElement('option')).attr('value', 'Cerrado').text('Cerrado'),
          optProg   = $(document.createElement('option')).attr('value', 'En progreso').text('En progreso'),
          txtArea   = $(document.createElement('textarea')).attr('id','msg').attr('placeHolder','Mensaje'),
          sendbtn   = $(document.createElement('button')).attr('id','send-btn').text('Enviar');

      $(topBar).append(closeIcon);

      if(issue.content.Comment && issue.content.Comment.constructor === Array) {
        issue.content.Comment.forEach((msg) => {
          chatArea.append($(document.createElement('div')).addClass('msg-sent').append(`<span class="msg-head">[${new Date(msg.Date).toLocaleString()}] <b>${msg.Author}</b>:</span> ${msg.Comment}`));
        });
      } else {
        let msg = issue.content.Comment;
        if(msg){
          chatArea.append($(document.createElement('div')).addClass('msg-sent').append(`<span class="msg-head">[${new Date(msg.Date).toLocaleString()}] <b>${msg.Author}</b>:</span> ${msg.Comment}`));
        } else {
            chatArea.append($(document.createElement('div')).addClass('msg-sent'));
        }
      }

      $(statusList).append(optOpen, optClose, optProg);
      $(writeArea).append(statusLbl, statusList, txtArea, sendbtn);
      $(msgBlock).append(topBar, chatArea, writeArea);

      //Attatch Events
      $(closeIcon).on('click', closeModal);
      $(sendbtn).on('click', sendText);

      return msgBlock;
    };

    //Dismisses modal-container
    let closeModal = () =>{
      $('.modal-container').css('background-color','white').css('top','-100%').delay(400).empty();
    };

    //Writes the message, updates the currentIssue, parses it an then sends it to the server.
    let sendText = () => {
      let commentToPush = {
                            Author: $('#username').text().trim(),
                            Comment: $('#msg').val().trim(),
                            Date: new Date().toISOString(),
                            Status: $('#status-list option:selected').val(),
                            Topic: { "_Guid" : currentIssue.content.Topic._Guid}
                         };
       if(currentIssue.content.Comment && currentIssue.content.Comment.constructor === Array) {
         currentIssue.content.Comment.push(commentToPush); //Añadir comentario
       } else {
         if(currentIssue.content.Comment){ //Si solo hay uno, convertirlo en array y añadir otro
           currentIssue.content.Comment = [currentIssue.content.Comment];
           currentIssue.content.Comment.push(commentToPush);
         } else { //Si no hay ninguno.
            currentIssue.content.Comment = commentToPush;
         }
       }

       //Escribirlo en el chatArea
       $('.chat-area').append($(document.createElement('div')).addClass('msg').append(`[${new Date(commentToPush.Date).toLocaleString()}] <b>${commentToPush.Author}</b>: ${commentToPush.Comment}`));
       //Limpiar caja de texto
       $('#msg').val("");
       //Parsear a xml
       let json2xml = {Markup: currentIssue.content, "_xmlns:xsd" :"http://www.w3.org/2001/XMLSchema", "_xmlns:xsi" : "http://www.w3.org/2001/XMLSchema-instance"};
       let parser = new X2JS();
       let xml = parser.json2xml_str(json2xml);
       let updateBCF = {
                        path: currentIssue.path + '/markup.bcf',
                        message: 'Nuevo mensaje en ' + currentIssue.content.Topic.Title,
                        content: btoa(xml), //parse b64
                        sha: currentIssue.blobsha
                      };
      $.ajax({
        type:'POST',
        url: window.location + '/updatemarkup',
        data: {markup: updateBCF},
        success: () =>{
          closeModal();
          window.location.reload();
        },
        error: (err) =>{
          console.log('Error', err);
        }
      });
    };

    //Displays collaborators ediable or not depending if logged user is the project's owner
    let displayCollabs = (data) => {
      //console.log(data);
      closeModal();
      let users = data.collabs.map((collab) => {return collab.login;});
        //Display .modal-container
        let textfield = $(document.createElement('input')).attr({'type': 'text', 'placeholder': 'Nombre de usuario'}).addClass('txt-search-collab'),
            addbtn    = $(document.createElement('button')).text('Add').addClass('btn-search-collab'),
            closeIcon = $(document.createElement('i')).addClass('fa fa-close'),
            collabsBox = $(document.createElement('div')).addClass('collabs-box'),
            top = $(document.createElement('div')).addClass('collabs-top'),
            collabList = $(document.createElement('div')).addClass('collabs-list');

        $(top).append(textfield, addbtn, closeIcon);
        users.forEach((user) => {
          let deleteBtn = $(document.createElement('i')).addClass('remove-collab fa fa-minus-circle').attr('value', user),
              username  = $(document.createElement('span')).text(user);
          $(collabList).append($(document.createElement('div')).addClass('collaborator').append(deleteBtn, username));
        });

        $(collabsBox).append(top, collabList);
        $('.modal-container').append(collabsBox).css({'top':'5%', 'background-color': '#EFEFEF', 'border': 'none'});

        if(!data.owner){
          $(textfield).prop('readonly', true).css({'caret-color':'transparent', 'background-color': '#a9a9a9', 'cursor':'default'});
          $(addbtn).prop('disabled', true).css({'cursor':'default', 'background-color':'#a9a9a9'});
          $('.remove-collab').css({'cursor':'default', 'color': '#a9a9a9'});
        } else {
          //Attatch events
          $(addbtn).on('click', addCollab);
          $('.remove-collab').on('click', removeCollab);
        }
        //Attatch close event
        $(closeIcon).on('click', closeModal);
    };

    //Request to add collaborator
    let addCollab = (evt) =>{
      $.post({url: window.location + '/addcollab', data: {user : $('.txt-search-collab').val()}})
      .then((res) => {
        $.notify(`El usuario ${$('.txt-search-collab').val()} ha sido agregado como colaborador`,'success');
        let deleteBtn = $(document.createElement('i')).addClass('remove-collab fa fa-minus-circle').attr('value', $('.txt-search-collab').val()),
            username  = $(document.createElement('span')).text($('.txt-search-collab').val());
        $('.collabs-list').append($(document.createElement('div')).addClass('collaborator').append(deleteBtn, username));
        $('.txt-search-collab').val("");
        $(deleteBtn).on('click', removeCollab);
      })
      .catch((err) => {
        $.notify(`No se pudo agregar el usuario ${$('.txt-search-collab').val()}, quizas el nombre de usuario no es correcto`,'error');
        console.log('err', err);
      });
    };

    //Request to remove collaborator
    let removeCollab = (evt) =>{
      $.post({url: window.location + '/removecollab', data: {user : $(evt.target).attr('value')}})
      .then((res) => {
        $.notify('Colaborador eliminado','success');
        $(evt.target).siblings().remove();
        $(evt.target).remove();
      })
      .catch((err) => {
        $.notify('No se pudo eliminar al colaborador, quizas el nombre de usuario no es correcto','error');
      });
    };

    //Displays download dialog
    let downloadDialog = () => {
      closeModal();
      let top = $(document.createElement('div')).addClass('download-top'),
          closeIcon = $(document.createElement('i')).addClass('fa fa-close'),
          buttons = $(document.createElement('div')).addClass('download-buttons'),
          text    = $(document.createElement('span')).text('Seleccionar descarga:'),
          bcfBtn = $(document.createElement('button')).text('BCF').addClass('btn-search-collab'),
          ifcBtn = $(document.createElement('button')).text('IFC').addClass('btn-search-collab'),
          dialog = $(document.createElement('div')).addClass('download-dialog');

        $(top).append(closeIcon);
        $(buttons).append(text, bcfBtn, ifcBtn);
        $(dialog).append(top, buttons);
        $('.modal-container').append(dialog).css({'top':'5%', 'background-color': '#EFEFEF', 'border': 'none'});
        //Events
        $(closeIcon).on('click', closeModal);
        $(bcfBtn).on('click', downloadBCF);
        $(ifcBtn).on('click', downloadIFC);
    };

    //Download issues BCFZip
    let downloadBCF = () => {
      $('.overlay').css('display','block');
      $('#loading-icon').css('display','block');
      $.ajax({
        type:'POST',
        url: window.location + '/dlbcf',
        data: {"treesha": $('select :selected').attr('btree').trim()},
        success: (response) => {
          if(response.length > 0){
            let zip = new JSZip();
            let basename;
            response.forEach((item) => {
              basename     = item.name.substring(0, item.name.indexOf('/'));
              let filePath = item.name.substring(basename.length + 1);
              if(filePath.includes('/')){
                let folderName = filePath.substring(0, filePath.lastIndexOf('/'));
                let fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
                if(filePath.includes('.png'))
                  zip.folder(folderName).file(fileName, atob(item.content), {base64:true});
                else
                  zip.folder(folderName).file(fileName, atob(item.content));
              } else {
                zip.file(filePath, atob(item.content));

              }
            });

            zip.generateAsync({type:'blob'}).then((info) => {
              $('.overlay').css('display','none');
              $('#loading-icon').css('display','none');
              saveAs(info, basename + ".bcfzip");
            });
          } else {
            $('.overlay').css('display','none');
            $('#loading-icon').css('display','none');
            $.notify('No hay incidencias para la version elegida del proyecto','warn');
          }


        },
        error: (err) => {
          console.log('err', err);
        }
      });
    };

    //Download IFC file
    let downloadIFC = (file) => {
      $('.overlay').css('display','block');
      $('#loading-icon').css('display','block');
      $.ajax({
        type:'POST',
        url: window.location + '/dlifc',
        data: {"treesha": $('select :selected').attr('btree').trim()},
        success: (response) => {
          let zip = new JSZip();
          zip.file(response.name, atob(response.content))
          .generateAsync({type:'blob'})
          .then((info) => {
            $('.overlay').css('display','none');
            $('#loading-icon').css('display','none');
            saveAs(info, "Proyecto.zip");
          });

        },
        error: (err) => {
          console.log('err', err);
        }
      });
    };

  }); //End document ready
}).call(this);
