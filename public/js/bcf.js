(function (){
  $('document').ready(function(){

    $('#update').on('click', function(evt){
      $('.repo-container').empty();
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

    $('.repo-container').on('click', '.editIncidence', function (evt){
      var incidence = bcfList[parseInt($(this).attr('index'))];
      var modal = createModal(incidence);
    });


  }); //End document ready

}).call(this);
