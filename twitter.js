const fs = require("fs");
const path = require("path");
const Twit = require("twit");
// const { twitterConfig } = require("../auth/twitter-config.js");
const {
  parse,
  stringify,
  stringifyVtt,
  resync,
  toMS,
  toSrtTime,
  toVttTime,
} = require("subtitle");

const twitterInstance = new Twit(twitterConfig);
console.log(twitterConfig);

export const postTestTweet = (status = "Look, I am tweeting!") => {
  twitterInstance.post(
    "statuses/update",
    { status: status },
    (err, data, response) => {
      if (err) {
        console.log(`ERROR: Failed to post "${status}"`);
        console.dir(err);
        console.log(data);
      } else {
        console.log(`Successfully posted "${status}"`);
        console.log("RESPONSE: ", response);
        console.log(data);
      }
    }
  );
};

export const postTestImage = (images) => {
  console.log("Opening an image...");
  console.log(images);
  const image_path = path.join(__dirname, "/output-media/" + images[0]);
  const b64content = fs.readFileSync(image_path, { encoding: "base64" });

  console.log("Uploading an image...");

  twitterInstance.post(
    "media/upload",
    { media_data: b64content },
    (err, data, response) => {
      if (err) {
        console.log("ERROR:");
        console.log(err);
      } else {
        console.log("Image uploaded!");
        console.log("Now tweeting it...");

        twitterInstance.post(
          "statuses/update",
          {
            media_ids: new Array(data.media_id_string),
            status: "Look, an image!",
          },
          (err, data, response) => {
            if (err) {
              console.log("ERROR:");
              console.log(err);
            } else {
              console.log("Posted an image!");
              console.dir(data);
              console.log("Deleting Image...");
              fs.unlink(image_path, (err) => {
                if (err) {
                  console.log("ERROR: unable to delete image " + image_path);
                } else {
                  console.log("image " + image_path + " was deleted");
                }
              });
            }
          }
        );
      }
    }
  );
};
