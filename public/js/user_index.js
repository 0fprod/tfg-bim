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
        type: 'red',
        buttons : {
          ok : () => {
            window.location = goHome(window.location);
          }
        }
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
          $('.overlay').css('display','none');
          $('#loading-icon').css('display','none');
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

    //Encode to x-www-form-urlencoded
    let encode = (obj) => {
      let str = [];
      for(p in obj)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]))
      return str.join('&');
    }

    //Removes query & paths from str
    let goHome = (str) => {
      let url = str.toString(),
          index = 0,
          re = /\//g,
          c = 0;

      while(c < 3){
        index = re.exec(url).index;
        c++;
      }
      return url.substring(0, index);
    }

  });
}).call(this);
