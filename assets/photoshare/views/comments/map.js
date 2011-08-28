function(doc) {
    if(doc.type == 'comment') {
        emit([doc.photo, doc.created_at], doc);        
    }
};
