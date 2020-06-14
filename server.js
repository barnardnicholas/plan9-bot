const express = require("express");
const server = express();

const { twitterRouter } = require("./router/routers.js");

server.use(express.json());

server.use("/api/twitter", twitterRouter);

server.use((err, request, response, next) => {
  console.log(err);
  response.status(500).send({ msg: "Internal Server Error" });
});

module.exports = server;
