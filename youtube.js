const fs = require("fs");

function getScreen(url, size) {
  if (url === null) {
    return "";
  }
  size = size === null ? "big" : size;
  var vid;
  var results;
  results = url.match("[\\?&]v=([^&#]*)");
  vid = results === null ? url : results[1];
  if (size == "small") {
    return "http://img.youtube.com/vi/" + vid + "/2.jpg";
  } else {
    return "http://img.youtube.com/vi/" + vid + "/0.jpg";
  }
}

var url = "http://www.youtube.com/watch?v=hQVTIJBZook";
var imgUrlbig = getScreen(url);
var imgUrlsmall = getScreen(url, "small");
// document.write('<img src="' + imgUrlbig + '" />');
// document.write('<img src="' + imgUrlsmall + '" />');
fs.writeFileSync("test.png", imgUrlbig, (err, data) => {
  console.log(err);
  console.log(data);
});
