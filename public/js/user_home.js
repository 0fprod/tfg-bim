/* jshint esversion: 6*/
(() => {
  $('document').ready(() => {

    $('.edit-project').on('click', (evt) => {

      $.ajax({
        type: 'GET',
        url: '' + $(evt.currentTarget).attr('link'),
        success: () => {
          window.location = $(evt.currentTarget).attr('link');
        },
        error: (err) => {
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
