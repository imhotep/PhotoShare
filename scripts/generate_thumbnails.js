var follow = require('./follow');
var nano = require('nano')('http://localhost:8080'); // TODO change this to real server
var photoshare = nano.use('photoshare')
var fs = require('fs');
var spawn = require('child_process').spawn;

follow("http://localhost:8080/photoshare", function(error, change) {
  if(error) { throw e; }
  if(!change.deleted) {
    console.log("Got change number " + change.seq + ": " + change.id);
    photoshare.get(change.id, {}, function(_,_,doc) {
      if(doc._attachments
         && doc._attachments['original.jpg']
         && !doc.thumbnail_id
        ) {
        var original = change.id+'.jpg'; // original filename
        var original_st = fs.createWriteStream(original, {encoding:'binary'}); // original stream
        // creating thumbnail document
        photoshare.insert({type: 'thumbnail', original_id: change.id}, function(e,h,tdoc) {
          if(e) { throw e; }
          console.log('New thumbnail document created!', tdoc.rev);

          original_st.on("close", function() {
            console.log("Converting "+original);
            // resizing the image
            var convert = spawn('convert',  [original, '-resize', '100x50', '-']);
            convert.stdout.pipe(photoshare.attachment.insert(tdoc.id, 'thumbnail.jpg', {}, "image/jpeg", {rev: tdoc.rev}));
            //convert.stdout.pipe(fs.createWriteStream("thumb_"+original));
            convert.stdout.on("end", function() {
              // updating original doc with thumbnail doc id
              fs.unlink(original);
              doc.thumbnail_id = tdoc.id;
              doc.type = "photo";
              photoshare.insert(doc, change.id, function(e,h,r) {
                if(e) { throw e; }
                //console.log("Original response update:",r);
              });
            });
          });
          photoshare.attachment.get(change.id, 'original.jpg').pipe(original_st);
        });
      }
    });
  }
});
