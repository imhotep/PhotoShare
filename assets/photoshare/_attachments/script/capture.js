// Use PhoneGap polling because of cross-origin&speed problem when loading from couchDB
PhoneGap.UsePolling = true;

var selectedPictureId = null;

// prompt = console.log

// Helper Methods

function addThumbnail(thumbnailId, originalId) {
    var newImg = $("<img></img>")
                 .addClass('thumbnail')
                 .css('float', 'left')
                 .css('padding', '2px')
                 .error(function() {
                   $(this).hide();
                 })
                 .attr({id: originalId,
                        src: '/photoshare/'+thumbnailId+'/thumbnail.jpg'
                       });
    newImg.click(onImageClick);
    $('#pictures').prepend(newImg);
}

function addComment(commentDoc) {
  $('#comments').prepend('<span>'+commentDoc.comment+'</span><br/>')
                .prepend('<span class="author">'+commentDoc.author+' wrote:</span> ');
}

function clearPhotoView() {
  $('#comments').html('');
  $('#photoview-image').attr('src', '');
}

function toggleButton() {
  var capture = $('#capturePhoto');
  if(capture.attr('disabled')) {
    capture.removeAttr('disabled');
  } else {
    capture.attr('disabled', true);
  }
}

function setMessage(message) {
  $('#message').html(message);
}

// Syncpoint

function setupSync() {
    var syncpoint = "http://couchbase.ic.ht/photoshare";
    $.ajax({
      type: 'POST',
      url: '/_replicate',
      data: JSON.stringify({
          source : syncpoint,
          target : "photoshare",
          filter : "photoshare/thumbnail"
      }),
      dataType: 'json',
      contentType: 'application/json'
    });
    $.ajax({
      type: 'POST',
      url: '/_replicate',
      data: JSON.stringify({
          target : syncpoint,
          source : "photoshare"
      }),
      dataType: 'json',
      contentType: 'application/json'
    });
}

// Capture

function onCaptureSuccess(imageData) {
  console.log("onCaptureSuccess");
  var onSaveSuccess = function(imageDoc) {
    setMessage('');
  };
  var onSaveFailure = function(xhr, type) {
    alert("onSaveFailure "+type + ' ' + xhr.responseText);
  };
  setMessage('Saving image...');
  var imageDoc = {
    type: "photo",
    created_at: new Date(),
    _attachments: {
      "original.jpg": {
        content_type: "image/jpeg",
        data: imageData
      }
  }};
  $.ajax({
    type: 'POST',
    url: '/photoshare',
    data: JSON.stringify(imageDoc),
    dataType: 'json',
    contentType: 'application/json',
    success: onSaveSuccess,
    error: onSaveFailure
  });
}

function onCaptureFailure(message) {
  alert('onCaptureFailure ' + message);
}

function capturePhoto() {
  console.log("capturePhoto");
  navigator.camera.getPicture(onCaptureSuccess, onCaptureFailure, { quality: 10 });
}



var since = 0;
function changesCallback(opts) {
  since = opts.last_seq || since;
  onDBChange(opts);
  $.ajax({
    type: 'GET',
    url: '/photoshare/_changes?include_docs=true&feed=longpoll&since='+since,
    dataType: 'json',
    success: changesCallback,
    error: function() {
      setTimeout(function() {
        console.log("error changes");
        console.log(opts);
        changesCallback({last_seq : since});
      }, 250)
    }
  });
}


function setupChanges() {
  changesCallback({last_seq : 0});
}

function onDBChange(opts) {
  // append new pictures to the view without disturbing old ones
  listPictures(opts);
}

function listPictures(data) {
  if (data.results) {
    for (var i = 0; i < data.results.length; i++) {
      if(!data.results[i].deleted && data.results[i].doc.original_id) {
        addThumbnail(data.results[i].id, data.results[i].doc.original_id);
      }
    }
  }
}

function sendComment() {
    var commentDoc = {
      "type": "comment",
      "photo": selectedPictureId,
      "created_at" : new Date(),
      "author": $('#comment-author').val(),
      "comment": $('#comment-text').val()
    };

    var onCommentSuccess = function(response) {
      addComment(commentDoc);
    };

    var onCommentFailure = function(xhr, type) {
      alert(type + ' ' + xhr.responseText);
    };

    CouchDbPlugin.save(commentDoc, onCommentSuccess, onCommentFailure);
}

function onImageClick() {
  // FIXME: maybe use a hidden field instead?
  var selectedPictureId = this.id.replace('-thumbnail', '');
  var tmpImgSrc = this.src;
  $('#photoview-image').attr('src', tmpImgSrc).css('width', '100%');
  $('#photoview').css("-webkit-transform","translate(0,0)");
  
  function showBigPhoto() {
      console.log("showBigPhoto");
      $('#photoview-image').attr('src', '/photoshare/'+selectedPictureId+'/original.jpg');
  }
  
  // switch to the hi res if we have it
  $.ajax({
   type: 'GET',
   url:'/photoshare/'+selectedPictureId,
   dataType: 'json',
   contentType: 'application/json',
   success: showBigPhoto,
   error: function() {
       // trigger replication, on success, update photo
       console.log("no big photo")
       $.ajax({
         type: 'POST',
         url: '/_replicate',
         data: JSON.stringify({
             source : "http://couchbase.ic.ht/photoshare",
             target : "photoshare",
             doc_ids : [""+selectedPictureId]
         }),
         dataType: 'json',
         contentType: 'application/json',
         success: showBigPhoto
       });       
   }
   });
   
  var renderComments = function(response) {
    // console.log(JSON.stringify(response));
    for(var i = 0 , j = response.rows.length ; i < j ; i++) {
      addComment(response.rows[i].value);
    }
    $('#photoview').show();
    $('#main').hide();
    $('#send-comment').click(sendComment);
    document.addEventListener('backbutton', backKeyDown, true);
  };

  var onFetchFailure = function(xhr, type) {
    console.log(type + ' ' + xhr.responseText);
  }
  $.ajax({
   type: 'GET',
   url: '/photoshare/_design/photoshare/_view/comments?startkey=["'+selectedPictureId+'"]&endkey=["'+selectedPictureId+'",{}]',
   dataType: 'json',
   contentType: 'application/json',
   success: renderComments,
   error: onFetchFailure
  });
}

function backKeyDown() {
  document.removeEventListener('backbutton', backKeyDown, true);
  $('#send-comment').unbind('click');
  $('#photoview').css("-webkit-transform","translate(100%,0)");
  $('#photoview').hide();
  clearPhotoView();
  $('#main').show();
}

function startCamera() {
  var capture = $('#capturePhoto');
  capture.removeAttr('disabled');
}


function start() {
    // setup listing of pictures and auto refresh
    setupChanges();
    setupSync();
}

var started = false;
function startApp() {
    if (started) return;
    started = true;
    start();
};

document.addEventListener("deviceready", startCamera, true);
$('body').ready(startApp);
