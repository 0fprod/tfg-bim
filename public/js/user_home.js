/* jshint esversion: 6*/
(() => {
  $('document').ready(() => {

    $('.edit-project').on('click', (evt) => {
      $('.overlay').css('display','block');
      $('#loading-icon').css('display','block');
      $.ajax({
        type: 'GET',
        url: '' + $(evt.currentTarget).attr('link'),
        success: () => {
          $('.overlay').css('display','none');
          $('#loading-icon').css('display','none');
          window.location = $(evt.currentTarget).attr('link');
        },
        error: (err) => {
          $('.overlay').css('display','none');
          $('#loading-icon').css('display','none');
          $.alert({
            useBootstrap: false,
            boxWidth: '30%',
            type: 'orange',
            title: 'Error!',
            closeIcon: true,
            content: 'El proyecto no existe, debes actualizar tu lista de proyectos activos.'
          });
        }
      });

    });


  });
}).call(this);
