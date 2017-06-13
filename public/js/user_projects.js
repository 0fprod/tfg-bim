(function (){
  $('document').ready( () => {

    $('.project').on('click', (evt) => {
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
    $('.delete-repo').on('click', (evt) =>{
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
              eliminar: () =>{
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
                  },
                  error: (err) => {
                    if(err.status == 403){
                      $.notify("Debes tener derechos de administrador para eliminar este proyecto", "warn");
                    } else {
                      $.notify("Este proyecto ya ha sido eliminado", "warn");
                      console.log('Error! ', err);
                    }
                  }
                })
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

    //Save active projects
    $('#savebtn').on('click', (evt) => {
      var list = $.map($(".sync"), (item) => {return {"owner" : $(item).attr('owner'), "name" : $(item).attr('name')}});
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

    $('#createbtn').on('click', (evt) => {
      createProject();
    });

    $(document).on('click', '#push', (evt) => {
      $('.overlay').css('display','block');
      $('#loading-icon').css('display','block');
      newrepo.title = parseProjectName($('input[type=text]').val().trim());
      newrepo.filename = parseFileName($('input[type=file]').val().trim());
      newrepo.visibility = $('input[type=radio]:checked').val()

      $.ajax({
        type: 'POST',
        data: JSON.stringify({"data" : newrepo}),
        title: newrepo.title,
        contentType: 'application/json',
        url: window.location + "/create",
        success: (data) => {
          $.notify("Proyecto creado", "sucess");
          $('.overlay').css('display','none');
          $('#loading-icon').css('display','none');
          //Append project to list
          let project = $(document.createElement('div')).addClass('project'),
              name    = $(document.createElement('div')).attr('owner', $('#username').text().trim()).attr('name', data),
              times   = $(document.createElement('i')).addClass('fa fa-times-circle fa-2x delete-repo');

          $(name).text(data);
          $(project).append(name, times);
          $($('.repo-container')[0]).append(project);
        },
        error: (err) => {
          console.log(err);
          if(newrepo.visibility === 'private'){
            $.notify("Los proyectos privados requieren un plan de pagos https://github.com/account/upgrade", "error");
          } else {
            $.notify("No se ha podido crear el proyecto", "error");
          }

        }
      });

      $('#cancel').click();
    });

  }); //End of ready

}).call(this);
