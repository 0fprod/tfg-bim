(function (){
  $('document').ready(function(){
    //Login animation
    $('#login').toggleClass('stop');

    if(window.location.search.length > 0){
      $.alert({
        title:'Error!',
        content:'No has iniciado sesión.',
        useBootstrap: false,
        boxWidth: '30%',
        icon: 'fa fa-times',
        type: 'red'
      });
    }

    $('#loginbtn').on('click', (evt) => {
      let params = encode({'username' : $('#uname').val(), 'password': $('#passw').val()});
      $('.overlay').css('display','block');
      $('#loading-icon').css('display','block');
      $.ajax({
        type:'POST',
        contentType: 'application/x-www-form-urlencoded',
        data: params,
        url: '/login',
        success: (data) => {
          $('.overlay').css('display','none');
          $('#loading-icon').css('display','none');
          $.alert({
            title:'Login correcto!',
            content:'Redirigiendo...',
            useBootstrap: false,
            boxWidth: '30%',
            icon: 'fa fa-check',
            type: 'green'
          });
          window.location += 'u/' + $('#uname').val();
        },
        error: (err) => {
          $.alert({
            title:'Error!',
            content:'Usuario o contraseña incorrectos',
            useBootstrap: false,
            boxWidth: '30%',
            icon: 'fa fa-times',
            type: 'red'
          });
        }
      })
    });

    let encode = (obj) => {
      let str = [];
      for(p in obj)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]))
      return str.join('&');
    }

  });
}).call(this);
