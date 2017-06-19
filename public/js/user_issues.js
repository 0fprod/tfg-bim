(function (){
  $('document').ready(function(){

    //Displays all the existing issues in the selected commit
    $('#update').on('click', function(evt){
      $('.repo-container').empty();
      $('.overlay').css('display','block');
      $('#loading-icon').css('display','block');
      var commitList = $('select')[0];
      var index = commitList.selectedIndex;
      var url = $(commitList[index]).attr('sha');
      var bcflist = new BcfXML();

      $.get(url).then(function(data){
        //Array with urls that are type.tree
        var urls = _.pluck(_.filter(data.tree, function(item){ return item.type == 'tree'}), 'url');
        urls.forEach(function(item){
          $.get(item).then(function(data){
              $.when($.get(data.tree[0].url), $.get(data.tree[1].url)).done(function(file, prev){
                $('.overlay').css('display','none');
                $('#loading-icon').css('display','none');
                var cp = {} //Content + preview decoded
                cp.content = atob(file[0].content);
                cp.preview = prev[0].content;
                cp.sha = file[0].sha;
                bcflist.push(cp);
              });
            });
        });
      });

    });//End onClick event

    //Edit issue
    $('.repo-container').on('click', '.editIncidence', function (evt){
      var incidence = bcfList[parseInt($(this).attr('index'))];
      var modal = createModal(incidence);
    });

    //Upload .bcfzip file
    $('#uploadbtn').on('click', (evt) => {
      $('#uploadfile').on('change', (evt) => {
         fileHandler(evt.target.files[0]);
      });

      $('#uploadfile').click();
    });

    //Unzip the file, and pushes to github all the issues insie that file.
    let fileHandler = (file) => {
      let filesInArray = []; //Unzipped files
      let filesToSend = [];  //Files to send to the server

      JSZip.loadAsync(file).then((zip) => {
        for(let prop in zip.files) filesInArray.push(zip.files[prop]);
      }).then(() => {
        Promise.all(filesInArray.map((file) => {
          if(file.name.substring(file.name.length - 3) === 'png'){
            return file.async('base64').then((resp) => {filesToSend.push({name:file.name, content: resp})});
          } else{
            return file.async('string').then((resp) => {filesToSend.push({name:file.name, content: resp})});
          }
        })).then(() => {
          let shas = {parentcommit : $($('.options').toArray()[0]).attr('sha'), basetree : $($('.options').toArray()[0]).attr('btree')}
          $.ajax({
            type:'POST',
            url: window.location.toString() + '&uploadzip=true',
            data: {"data":filesToSend, "shas" : shas},
            success: (resp) => {
              console.log('success on post');
            },
            error: (err) => {
              console.log(err);
            }
          });
        })
      });
    };


  }); //End document ready

}).call(this);
