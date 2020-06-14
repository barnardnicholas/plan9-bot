const twitterRouter = require("express").Router();
const {
  postTweet,
  postImage,
  testFireFS,
} = require("../controllers/controllers.js");

// Owner Endpoints
twitterRouter.post("/", postTweet);
twitterRouter.post("/image", postImage);
twitterRouter.post("/testfs", testFireFS);

module.exports = { twitterRouter };
