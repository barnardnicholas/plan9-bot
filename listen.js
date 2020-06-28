const express = require("express");
const server = express();

const { PORT = 9090 } = process.env;

const listener = () => {
  server.listen(PORT, () => console.log(`Listening on ${PORT}...`));
};

module.exports = listener;
