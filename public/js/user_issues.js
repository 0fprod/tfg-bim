(() => {
  $('document').ready(() => {
    var issues = [];

    //Input[File] event
    $('#uploadfile').on('change', (evt) => {
      $('.filename').text(evt.target.files[0].name.trim())
    });

    //Displays all the existing issues in the selected commit
    $('#display-issues').on('click', function(evt){
      //TODO

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
      })
    });

    //Displays an alert to choose download IFC or BCF
    $('#downloadbtn').on('click', (evt) => {
        $.alert({
          useBootstrap: false,
          boxWidth: '30%',
          type: 'blue',
          title: 'Descargas',
          content: '<p class="dl-link dlifc"> Proyecto IFC </p> \n <p class="dl-link dlbcf"> Incidencias BCF </p>'
        })
    })

    //Resets #uploadfile and invokes #uploadfile.click
    $(document).on('click', '.ul', (evt) => {
      $('#uploadfile').val('');
      $('#uploadfile').click();
    });

    //Only download IFC from github as zip
    $(document).on('click', '.dlifc', (evt) => {

      $.get({url: window.location + '/dlbcf'})
      .then((reject) => {
        console.log('err',reject);
      },
      (resolve) => {
        console.log('resolve', resolve);
      })

         ///repos/:owner/:repo/contents/:path get content

    })

    //Zip issues and then download it
    $(document).on('click', '.dlbcf', (evt) => {
      console.log('dl ifc');
    })

    //Unzip the file, and pushes to github all the issues insie that file.
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
          if(file.name.substring(file.name.length - 3) === 'png')   return file.async('base64').then((resp) => {filesToSend.push({name:file.name, content: resp})});
          else                                                      return file.async('string').then((resp) => {filesToSend.push({name:file.name, content: resp})});
        })).then(() => {
          let shas = {parentcommit : $($('.options').toArray()[0]).attr('sha'), basetree : $($('.options').toArray()[0]).attr('btree')}
          $.ajax({
            type:'POST',
            url: window.location + '/ulbcf',
            data: {"data": filesToSend, "shas" : shas, "message": commit.message},
            success: (resp) => {
              // let owner = location.search.substr(location.search.indexOf('=') + 1),
              //     repo  = $('.page-title').text().trim(),
              //     sha   = resp.data.object.sha;
              console.log(resp);
              $('.overlay').css('display','none');
              $('#loading-icon').css('display','none');
            },
            error: (err) => {
              console.log(err);
              $('.overlay').css('display','none');
              $('#loading-icon').css('display','none');
            }
          });
        })
      });
    };

    let uploadIFC = (commit) => {
      let filereader = new FileReader();
      filereader.onloadstart = () => { $('#loading-icon').css('display','block').css('top','20%');}
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
        })
      }
      filereader.readAsText(commit.content);
    }

    //Appends a box to .repo-container
    let appendIssueBox = (issue) => {
      let x2js        = new X2JS(),
          jsonbcf     = x2js.xml_str2json(atob(issue.markup));
          issue_block = $(document.createElement('div')).addClass('issue-block'),
          issue_prev  = $(document.createElement('img')).addClass('issue-prev').attr('src', 'data:image/png;base64,' + atob(issue.snapshot)),
          issue_desc  = $(document.createElement('ol')).addClass('issue-desc'),
          author      = $(document.createElement('li')).addClass('issue-item').text('Autor: ' ),
          date        = $(document.createElement('li')).addClass('issue-item').text('Fecha: ' + new Date(jsonbcf.Markup.Header.File.Date).toLocaleDateString()),
          assign      = $(document.createElement('li')).addClass('issue-item').text('Asignado a: ' ),
          title       = $(document.createElement('div')).addClass('issue-title').text(jsonbcf.Markup.Topic.Title),
          modifd      = $(document.createElement('li')).addClass('issue-item'),
          modifby     = $(document.createElement('li')).addClass('issue-item'),
          istatus     = $(document.createElement('li')).addClass('issue-status');

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

      $(issue_desc).append(author, date, assign, modifd, modifby, istatus);
      $(issue_block).append(issue_prev, issue_desc, title);
      $('.repo-container').append(issue_block);
    }

    //Returns 31HEX number from issue folder name
    let parseIssueFolderName = (str) => {
      return str.substring(0, str.indexOf('@'));
    }

  }); //End document ready
}).call(this);
