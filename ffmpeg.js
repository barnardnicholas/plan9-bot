const extractFrames = require("ffmpeg-extract-frames");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");

// Set FFMPEG path
ffmpeg.setFfmpegPath(ffmpegPath);

const getFrame = (offset = 0) => {
  extractFrames({
    input: "input-media/plan9.mp4",
    output: `./output-media/plan9_${offset}.jpg`,
    offsets: [offset],
  })
    .then((data) => {
      console.log(`Successfully wrote file: ${data}`);
    })
    .catch((err) => {
      console.log("ERROR:");
      console.log(err);
    });
};

getFrame(100000);
