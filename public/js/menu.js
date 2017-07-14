(function (){
  $('document').ready(function(){
    //Show/Hide menu
    $('#menubars').on('click', function (){
      $('#menu').toggleClass('show');
    });

    //Go to all projects
    $('#user').on('click', function (){
      goTo('/u/' + $('#username').html().trim() + '/projects');
    });

    //Go to my active projects
    $('#myrepos').on('click', function (){
      goTo('/u/' + $('#username').html().trim());
    });

    $('#logout').on('click', function (){
      $.ajax({
        type: 'POST',
        url: '/u/logout',
        success: function (res){
          $.notify("Cerrando sesión", "info");
          setTimeout(function(){ goTo(); }, 1500);
        }
      });
    });
  }); //End of ready

  /*Go to route*/
  function goTo(route){
    var url = window.location.href.split('/');
    if(route){
      window.location.href = 'http://' + url[2] + route;
    } else { //go home
      window.location.href = 'http://' + url[2];
    }
  }
}).call(this);
