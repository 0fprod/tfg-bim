/* jshint esversion: 6*/
(() => {
  $('document').ready(() => {

    $('#edit').on('click', (evt) => {

      $.ajax({
        type: 'GET',
        url: '' + $('#edit').attr('link'),
        success: () => {
          window.location = $('#edit').attr('link');
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

    $('#edit').on('click', (evt) => {

    });

  });
}).call(this);
