function(doc) {
  if(doc.type == "photo" || doc._attachments && doc._attachments['original.jpg'])
    emit(doc._id, doc);
}
