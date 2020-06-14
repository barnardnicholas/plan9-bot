const fs = require("fs");
const path = require("path");
const download = require("image-downloader");
const Twit = require("twit");
const { twitterConfig } = require("./auth/twitter-config");

const twitterInstance = new Twit(twitterConfig);
console.log(twitterConfig);

const options = {
  url: "https://vignette.wikia.nocookie.net/simpsons/images/f/fc/T-McClure.png",
  dest: "./troy.png",
};

const postTestImage = (options) => {
  console.log("Starting postTestImage...");
  console.log(`Downloading image from ${options.url}`);
  download
    .image(options)
    .then(({ filename }) => {
      console.log("Saved image to", filename);
      const b64content = fs.readFileSync(options.dest, {
        encoding: "base64",
      });
      console.log(`Encoded ${filename} to base64`);
      console.log("Starting Twitter upload...");
      twitterInstance.post(
        "media/upload",
        { media_data: b64content },
        (err, data, response) => {
          if (err) {
            console.log("ERROR:");
            console.log(err);
          } else {
            console.log("Image uploaded");
            console.log("Starting Twitter post...");

            twitterInstance.post(
              "statuses/update",
              {
                media_ids: new Array(data.media_id_string),
                status: "Test Troy",
              },
              (err, data, response) => {
                if (err) {
                  console.log("ERROR:");
                  console.log(err);
                } else {
                  console.log("Image posted successfully");
                  // console.dir(data);
                  console.log("Deleting Image...");
                  fs.unlink(options.dest, (err) => {
                    if (err) {
                      console.log(
                        "ERROR: unable to delete image " + options.dest
                      );
                    } else {
                      console.log("image " + options.dest + " was deleted");
                    }
                  });
                }
              }
            );
          }
        }
      );
    })
    .catch((err) => console.error(err));
  console.log("End of postTestImage");
};

postTestImage(options);
