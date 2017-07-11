/* jshint esversion: 6 */
(function (){
  $('document').ready( () => {
    var ifcEncoded;  //Updated when #upload-ifc change

    //Toggle sync class on the clicked project
    $(document).on('click', '.project', (evt) => {
      let self = evt.target;
      if($(self).find('.synced').length > 0){
        $(self).find('div').removeClass('sync');
        $(self).find('.synced').remove();
      } else {
        $(self).find('div').addClass('sync');
        $(self).find('div').append($(document.createElement('i')).addClass('fa fa-check-circle synced'));
      }
    });

    //Delete project
    $(document).on('click', '.delete-repo', (evt) =>{
        let self = evt.target;
        let project = {owner: $(self).siblings().attr('owner'), repo: $(self).siblings().attr('name')};
        $.confirm({
            title:'Cuidado!',
            content:'Esta acción no se puede deshacer.\n¿Estás seguro que quieres eliminar este proyecto?',
            useBootstrap: false,
            icon: 'fa fa-warning',
            type: 'orange',
            boxWidth: '30%',
            buttons:{
              eliminar: () => {
                $('.overlay').css('display','block');
                $('#loading-icon').css('display','block');
                $.ajax({
                  type: 'POST',
                  data: JSON.stringify({"repo" : project}),
                  contentType: 'application/json',
                  url: window.location + "/delete",
                  success: (data) => {
                    $('.overlay').css('display','none');
                    $('#loading-icon').css('display','none');
                    $.alert({
                            title:'',
                            useBootstrap: false,
                            content:'Proyecto eliminado!',
                            boxWidth:'30%'
                           });
                   $(self).parent().remove();
                   $('#save-projects').click();
                  },
                  error: (err) => {
                    $('.overlay').css('display','none');
                    $('#loading-icon').css('display','none');
                    if(err.status == 403){
                      $.notify("Debes tener derechos de administrador para eliminar este proyecto", "warn");
                    } else {
                      $.notify("Este proyecto ya ha sido eliminado", "warn");
                      console.log('Error! ', err);
                    }
                  }
                });
              },
              cancelar: () =>{
                $.alert({
                        title:'',
                        content:'Acción cancelada.',
                        useBootstrap: false,
                        boxWidth:'30%'
                       });
              }
            }
        });
    });

    //Save projects
    $('#save-projects').on('click', (evt) => {
      var list = $.map($(".sync"), (item) => {return {"owner" : $(item).attr('owner'), "name" : $(item).attr('name')};});
      //Display syncing icon spinner next to this.
      let syncin = $(document.createElement('i')).attr('id','refresh').addClass('fa fa-refresh fa-spin fa-3x fa-fw');
      $('#button-container').append(syncin);
      $.ajax({
        type: 'POST',
        data: JSON.stringify({"data" : list}),
        contentType: "application/json",
        url: window.location + "/update",
        success: (data) => {
          $.notify("Cambios guardados", "success");
          $('#refresh').remove();
        },
        error: (err) => {
          $.notify("Oops! Algo ha ido mal", "warn");
          console.log('Error! ', err);
        }
      });
    });

    //Displays .modal-container to add a new project
    $('#add-project').on('click', (evt) => {
      $('.modal-container').delay(500).css('top','40%');
      $('input[type="text"]').val('');
      $('#upload-ifc').val('');
    });

    //Dismisses .modal-container
    $('#cancel').on('click', (evt) => {
      $('.modal-container').delay(500).css('top','-100%');
    });

    //Creates the project at github
    $('#push').on('click', (evt) => {
      if($('input[type=file]').val() == ''){
        $.alert({
          title: 'Error',
          content: 'Debe subir un fichero .ifc para poder crear el proyecto.',
          useBootstrap: false,
          boxWidth: '30%',
          type:'red',
          icon: 'fa fa-warning'
        });
      } else {
        $('.overlay').css('display','block');
        $('#loading-icon').css('display','block');
        let project = {
          name: parseProjectName($('input[type=text]').val().trim()),
          path: parseFileName($('#upload-ifc').val().trim()),
          type: $('input[type=radio]:checked').val(),
          content: ifcEncoded
        };

        $.ajax({
          type:'POST',
          data: JSON.stringify({"data" : project}),
          contentType: 'application/json',
          url: window.location + "/create",
          success: (res) => {
            //console.log(res);
            $('.overlay').css('display','none');
            $('#loading-icon').css('display','none');
            addProjectComponent($('#username').text().trim(), project.name);
            $('#cancel').click();
          },
          error: (err) => {
            //console.log(err);
            $('.overlay').css('display','none');
            $('#loading-icon').css('display','none');
            if(err.responseJSON.code === 422){ //Upgrade ghAccount
              let link = '<a href="https://github.com/pricing"> GitHub</a>';
              $.alert({
                title:'Error!',
                content:'No se ha podido crear el repositorio. Para repositorios privados debe mejorar su cuenta en ' + link + '.',
                useBootstrap: false,
                boxWidth: '30%',
                type:'red'
              });
            } else {
              $.alert({
                title:'Error!',
                content:'No se ha podido crear el repositorio.',
                useBootstrap: false,
                boxWidth: '30%',
                type:'red'
              });
            }
          }
        });
      }

    });

    //Encodes the file to b64
    $('#upload-ifc').on('change', (evt) => {
      let file       = evt.target.files[0],
          filereader = new FileReader();
      filereader.onloadstart = () =>{ $('#loading-icon').css('display','block');};
      filereader.onload = () => {
        if(file.name.includes('.ifc'))  ifcEncoded = btoa(filereader.result);             //Encode to b64
        else                            $.alert('Error, Archivo desconocido.');
        $('#loading-icon').css('display','none');
      };
      filereader.readAsText(file);
    });

    //Append .project div to .repo-container
    var addProjectComponent = (projectOwner, projectName) => {
      let box   = $(document.createElement('div')).addClass('project'),
          text  = $(document.createElement('div')).attr({owner: projectOwner, name: projectName}).text(projectName),
          close = $(document.createElement('i')).addClass('fa fa-times-circle fa-2x delete-repo');
      $(box).append(text, close);
      $('.repo-container').append(box);
    };

    //String to lowercase, convert spaces to dashes
    var parseFileName = (name) => {
      return name.substr(name.lastIndexOf('\\') + 1).replace(/[_\s]+/g, '-').toLowerCase();
    };

    //String to lowercase, convert spaces to dashes
    var parseProjectName = (name) => {
      return name.replace(/[_\s]+/g, '-').toLowerCase();
    };

  }); //End of docReady
}).call(this);
