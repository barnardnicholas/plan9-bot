const express = require("express");
const server = express();
const { masterTaskRunner } = require("./bot.js");

// Auth variables
const { serverEnv } = require("./auth/auth");

// Include JSON
server.use(express.json());

server.get("/", (req, res) => {
  if (req.body.server_key === serverEnv.serverKey) {
    masterTaskRunner();
    return res.send("Success");
  } else {
    return res.send("Error - invalid key");
  }
});

const { PORT = 9090 } = process.env;

server.listen(PORT, () => console.log(`Listening on ${PORT}...`));
