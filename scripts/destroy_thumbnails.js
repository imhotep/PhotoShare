var nano = require('nano')('http://localhost:8080'); // TODO change this to real server
var photoshare = nano.use('photoshare')

photoshare.list({include_docs: true}, function(_,_,all_docs) {
  for(var i = 0, j = all_docs.total_rows ; i < j ; i++) {
    var d = all_docs.rows[i];
    console.log(d);
    if(d.doc.type == "thumbnail") {
      console.log(d);
      photoshare.destroy(d.id, d.value.rev, function(_,_,des) {
        console.log('Destroyed ', des);
      });
    }

    if(d.doc.thumbnail_id) {
      delete d.doc.thumbnail_id;
      delete d.doc.comments;
      photoshare.insert(d.doc, d.id, function(e,h,r) {
        console.log("Response", r);
      });
    }
  }
});
