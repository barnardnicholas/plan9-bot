const express = require("express");
const basicAuth = require("express-basic-auth");
const server = express();
const { masterTaskRunner } = require("./bot.js");

// Auth variables
const { serverEnv } = require("./auth/auth");

// Include Auth
server.use(basicAuth({ authorizer: myAuthorizer }));

function myAuthorizer(username, password) {
  const userMatches = basicAuth.safeCompare(username, serverEnv.username);
  const passwordMatches = basicAuth.safeCompare(password, serverEnv.password);

  return userMatches & passwordMatches;
}

server.get("/", (req, res) => {
  console.log("Authorized:");
  console.log(req.headers);
  masterTaskRunner();
  return res.send("Success");
});

const { PORT = 9090 } = process.env;

server.listen(PORT, () => console.log(`Listening on ${PORT}...`));
