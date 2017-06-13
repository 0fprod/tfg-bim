//Globals
var bcfList = [];
var newrepo = {};

//Array that appends a parsed xml file to the html body
var BcfXML = function() {};
BcfXML.prototype = [];
BcfXML.prototype.push = function(item) {
  $('.repo-container').append(xmlParser(item, this.length));
  Array.prototype.push.call(this, item);
};

/*Parses date format YYYY-MM-DDTHH:MM:SSZ
  to DD-MM-YY
*/
var parseDate = function (str){
  if(str.includes('/'))
    return str;
  var d = str.substring(0, str.indexOf('T'));
  var date = d.split('-');
  return date[2] + '/' + date[1] + '/' + date[0];
}

function xmlParser(xml, index){
  var x2js    = new X2JS(),
      jsonbcf = x2js.xml_str2json(xml.content);

  //BCF title & status
  var title     = $(document.createElement('div')),
      sp_title  = $(document.createElement('span')).html(jsonbcf.Markup.Topic.Title),
      sp_status = $(document.createElement('span')).html(jsonbcf.Markup.Topic._TopicStatus),
      sp_edit   = $(document.createElement('i')).addClass('fa fa-pencil editIncidence').attr('index', index);
  $(title).append(sp_title, sp_status, sp_edit).toggleClass('bcf-title');


  //left_container
  var left_container = $(document.createElement('div')),
      author         = $(document.createElement('span')).html('Autor: ' + jsonbcf.Markup.Topic.CreationAuthor),
      date           = $(document.createElement('span')).html('Fecha: ' + parseDate(jsonbcf.Markup.Topic.CreationDate)),
      priority       = $(document.createElement('span')).html('Prioridad: ' + jsonbcf.Markup.Topic.Priority),
      modifauthor    = $(document.createElement('span')).html('Modificado por: ' + jsonbcf.Markup.Topic.ModifiedAuthor),
      modifdate      = $(document.createElement('span')).html('Modificado el: ' + parseDate(jsonbcf.Markup.Topic.ModifiedDate)),
      assigned       = $(document.createElement('span')).html('Asignado a: ' + jsonbcf.Markup.Topic.AssignedTo);
  $(left_container).append(author, date, priority, modifauthor, modifdate, assigned).toggleClass('bcf-left');

  //right_container
  var right_container = $(document.createElement('div')),
      img             = $(document.createElement('img'));
  $(img).attr('src','data:image/png;base64,' + xml.preview);
  $(right_container).append(img).toggleClass('bcf-right')

  //container
  var container = $(document.createElement('div'));
  $(container).append(left_container, right_container).toggleClass('bcf-container');

  //Create BCFBlock
  var bcfblock = $(document.createElement('div'));
  $(bcfblock).append(title, container).toggleClass('bcf-block');

  bcfList.push({owner: window.location.href.split('=')[1],
                 repo : $('.page-title').text().trim(),
                 path: 'markup.bcf',
                 message: '',
                 content: jsonbcf,
                 sha: xml.sha
               });

  return bcfblock;
}

function createModal(incidence){
  var jsonbcf           = incidence.content.Markup,
      close             = $(document.createElement('i')).addClass('fa fa-close modal-close').attr('title','Cerrar'),
      savecomment       = $(document.createElement('i')).addClass('fa fa-save fa-3x savecomment').attr('title', 'Guardar comentarios'),
      addcomment        = $(document.createElement('i')).addClass('fa fa-plus-square fa-3x addcomment').attr('title', 'Añadir comentario'),
      comment_container = $(document.createElement('div')).addClass('modal-comments'),
      buttons           = $(document.createElement('div')).addClass('modal-buttons');

  var comments = (jsonbcf.Comment.constructor === Array) ? jsonbcf.Comment : [jsonbcf.Comment];

  //Create comments
  comments.forEach(function(comment){
        $(comment_container).append(createComment(comment));
  });

  //Create buttons
  $(buttons).append(addcomment, savecomment);

  //Add to container
  var container = $('.modal-container')[0];
  $(container).append(close, comment_container, buttons);
  $(container).delay(500).css('top', '10%');

  //Events Handling
  $(addcomment).on('click', function (evt) {
    $(comment_container).append(createComment(null));
  });

  $(savecomment).on('click', function (evt) {
    var comments = $('.modal-comments').children();
    var commentlist = []; //jsonbcf.Comment = commentlist;
    for(var k = 0; k < comments.length; k++){
      var date = comments[k].children[0].innerHTML.split(',')[0].trim();
      var author = comments[k].children[0].innerHTML.split(',')[1].trim();
      var text = comments[k].children[1].innerHTML.trim();
      commentlist.push({'Date' : date, 'Author' : author, 'Comment' : text});
    }

    jsonbcf.Comment = commentlist;
    //TODO Modify in jsonbcf.Markup.Topic lastsModified aruthor,date and then push
    console.log(jsonbcf);
  });

  $(close).on('click', function (evt) {
    $(container).delay(500).css('top', '-100%');
    $(container).empty();
  });
}

function createComment(comment){
  if(comment){
    return $(document.createElement('div')).addClass('modal-comment').append(
            $(document.createElement('div')).addClass('modal-title').text(parseDate(comment.Date) + ', ' + comment.Author),
            $(document.createElement('div')).addClass('modal-text').text(comment.Comment)
            );
  } else {
    var check   = $(document.createElement('i')).addClass('fa fa-check-circle-o fa-2x check-comment'),
        times   = $(document.createElement('i')).addClass('fa fa-times-circle-o fa-2x times-comment'),
        textbox = $(document.createElement('div')).addClass('modal-comment').append(
                    $(document.createElement('div')).addClass('modal-title').text(new Date().toLocaleDateString() + ', ' + $('#username').text().trim()),
                    $(document.createElement('textarea')).addClass('modal-text-editable'),
                    $(document.createElement('div')).append(check,times)
                  );

        $(check).on('click', function(evt){
            var txtBoxTitle = $($(textbox).children()[0]).text().split(',');
            var txt = $($(textbox).children()[1]).val();
            var comment = {'Date': txtBoxTitle[0].trim(), 'Author': txtBoxTitle[1].trim(), 'Comment' : txt};
            $('.modal-comments').append(createComment(comment));
            $(textbox).remove();
        });

        $(times).on('click', function(evt){
            $(textbox).remove();
        });

    return textbox;
  }
}

function createProject(){
  //HtmlElements
  let title = $(document.createElement('input')).attr({type:'text', placeholder:'Titulo'}),
      pri   = $(document.createElement('input')).attr({type:'radio', name:'vis', value:'private'}),
      prtxt = $(document.createElement('span')).text('Privado'),
      pub   = $(document.createElement('input')).attr({type:'radio', name:'vis', value:'public', checked:'checked'}),
      putxt = $(document.createElement('span')).text('Público'),
      ifc   = $(document.createElement('label')).text(' IFC').attr('for','upload').toggleClass('upload'),
      ok    = $(document.createElement('button')).attr('id','push').toggleClass('check'),
      cancl = $(document.createElement('button')).attr('id','cancel').toggleClass('times'),
      ifcup = $(document.createElement('input')).attr('type','file').attr('id','upload').css('display','none');

  //Icons
  let upload = $(document.createElement('i')).toggleClass('fa fa-upload'),
      times  = $(document.createElement('i')).toggleClass('fa fa-times-circle fa-4x'),
      check  = $(document.createElement('i')).toggleClass('fa fa-check-circle fa-4x');

  //Containers
  let radios   = $(document.createElement('div')).toggleClass('repo-radio'),
      optional = $(document.createElement('div')).toggleClass('repo-opt'),
      buttons  = $(document.createElement('div')).toggleClass('repo-okcancl'),
      pack     = $(document.createElement('div')).toggleClass('create-repo'),
      container = $('.modal-container')[0];


  $(ifc).prepend(upload);
  $(ok).append(check);
  $(cancl).append(times);
  $(radios).append(pub, putxt, pri, prtxt);
  $(optional).append(ifc);
  $(buttons).append(cancl, ok);
  $(pack).append(title, radios, ifcup, optional, buttons);
  $(container).append(pack);
  $(container).delay(500).css('top', '25%').css('height','40%');

  //Events
  $(ifcup).on('change', (evt) => {
    let fr = new FileReader();

    fr.onloadstart = () =>{
      $('#loading-icon').css('display','block');
    }

    fr.onload = () => {
      newrepo.content = btoa(fr.result);
      $('#loading-icon').css('display','none');
    }

    fr.readAsText(evt.currentTarget.files[0]);

  });

  $(cancl).on('click', (evt) => {
    //Close modal
    $(container).delay(500).css('top', '-100%');
    $(container).empty();
    newrepo = {};
  });

}

var parseFileName = (name) => {
  return name.substr(name.lastIndexOf('\\') + 1).replace(/[_\s]+/g, '-').toLowerCase();
}
var parseProjectName = (name) => {
  return name.replace(/[_\s]+/g, '-').toLowerCase();
}
