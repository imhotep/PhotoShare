function(doc) {
  if(doc.type == "thumbnail") {
    emit(doc._id, doc);
  }
}
