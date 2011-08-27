function(doc, req) {
  if(doc.type == "thumbnail") {
    return true;
  } else {
    return false;
  }
}
