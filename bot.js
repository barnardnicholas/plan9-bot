const repeatPost = () => {
  fs.readdir(__dirname + "/output-media", (err, files) => {
    if (err) {
      console.log(err);
    } else {
      if (files.length > 0) {
        var images = [];
        files.forEach((img) => {
          images.push(img);
        });
        setInterval(() => {
          postTestImage(images);
        }, 10000);
      }
    }
  });
};

const readDirTest = () => {
  fs.readdir(__dirname + "/output-media", (err, files) => {
    if (err) {
      console.log(err);
    } else {
      if (files.length > 0) {
        const images = [];
        images.push(files[0]);
        postTestImage(images);
      }
    }
  });
};

// postTestTweet();
// postTestImage();
repeatPost();
// readDirTest();
