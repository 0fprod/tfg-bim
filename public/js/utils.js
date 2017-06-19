//Globals
var bcfList = [];
var newrepo = {};
var file;

///////////////////
//////  TextFormat
///////////////////
//StringDate format YYYY-MM-DDTHH:MM:SSZ to DD-MM-YY
var parseDate = function (str){
  if(str.includes('/'))
    return str;
  var d = str.substring(0, str.indexOf('T'));
  var date = d.split('-');
  return date[2] + '/' + date[1] + '/' + date[0];
}
//String to lowercase, convert spaces to dashes
var parseFileName = (name) => {
  return name.substr(name.lastIndexOf('\\') + 1).replace(/[_\s]+/g, '-').toLowerCase();
}
//String to lowercase, convert spaces to dashes
var parseProjectName = (name) => {
  return name.replace(/[_\s]+/g, '-').toLowerCase();
}

//Array that appends a parsed xml file to the html body
var BcfXML = () => {};
BcfXML.prototype = [];
BcfXML.prototype.push = (item) => {
  $('.repo-container').append(xmlParser(item, this.length));
  Array.prototype.push.call(this, item);
};


///////////////////
//////  Components
///////////////////

var xmlParser = (xml, index) => {
  let x2js        = new X2JS(),
      jsonbcf     = x2js.xml_str2json(xml.content),
      issue_block = $(document.createElement('div')).addClass('issue-block'),
      issue_prev  = $(document.createElement('img')).addClass('issue-prev').attr('src', 'data:image/png;base64,' + xml.preview),
      issue_desc  = $(document.createElement('ol')).addClass('issue-desc'),
      author      = $(document.createElement('li')).addClass('issue-item').text('Autor: ' + jsonbcf.Markup.Topic.CreationAuthor),
      date        = $(document.createElement('li')).addClass('issue-item').text('Fecha: ' + parseDate(jsonbcf.Markup.Topic.CreationDate)),
      assign      = $(document.createElement('li')).addClass('issue-item').text('Asignado a: ' + jsonbcf.Markup.Topic.AssignedTo),
      modifd      = $(document.createElement('li')).addClass('issue-item').text('Ult. Modif.: ' + parseDate(jsonbcf.Markup.Topic.ModifiedDate)),
      modifby     = $(document.createElement('li')).addClass('issue-item').text('Modif. por: ' + jsonbcf.Markup.Topic.ModifiedAuthor),
      status      = $(document.createElement('li')).addClass('issue-status').text(jsonbcf.Markup.Topic._TopicStatus),
      title       = $(document.createElement('div')).addClass('issue-title').text(jsonbcf.Markup.Topic.Title);

  $(issue_desc).append(author, date, assign, modifd, modifby, status);
  $(issue_block).append(issue_prev, issue_desc, title);

  bcfList.push({
                 owner: window.location.href.split('=')[1],
                 repo : $('.page-title').text().trim(),
                 path: 'markup.bcf',
                 message: '',
                 content: jsonbcf,
                 sha: xml.sha
               });

  return issue_block;
}

//Create a modal component to add comments for issues
var createModal = (issue) => {
  let jsonbcf           = issue.content.Markup,
      close             = $(document.createElement('i')).addClass('fa fa-close modal-close').attr('title','Cerrar'),
      savecomment       = $(document.createElement('i')).addClass('fa fa-save fa-3x savecomment').attr('title', 'Guardar comentarios'),
      addcomment        = $(document.createElement('i')).addClass('fa fa-plus-square fa-3x addcomment').attr('title', 'Añadir comentario'),
      comment_container = $(document.createElement('div')).addClass('modal-comments'),
      buttons           = $(document.createElement('div')).addClass('modal-buttons'),
      comments          = (jsonbcf.Comment.constructor === Array) ? jsonbcf.Comment : [jsonbcf.Comment];

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

//Appends a comment to createModal
var createComment = (comment) => {
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
