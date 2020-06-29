// Debug - local auth variables
// const { twitterConfig } = require("./twitter-config");
// const { firebaseConfig } = require("./firebase-auth");
// const { userConfig } = require("./user-auth");
// const { serverConfig } = require("./server-config.js");

// Deploy - environment auth variables
const { twitterConfig } = require("./twitter-dummy");
const { firebaseConfig } = require("./firebase-dummy");
const { userConfig } = require("./user-dummy");
const { serverConfig } = require("./server-dummy.js");

const twitterEnv = {
  consumer_key: process.env.TWITTER_CONSUMER_KEY || twitterConfig.consumer_key,
  consumer_secret:
    process.env.TWITTER_CONSUMER_SECRET || twitterConfig.consumer_secret,
  access_token: process.env.TWITTER_ACCESS_TOKEN || twitterConfig.access_token,
  access_token_secret:
    process.env.TWITTER_ACCESS_TOKEN_SECRET ||
    twitterConfig.access_token_secret,
};

const firebaseEnv = {
  apiKey: process.env.FB_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.FB_AUTH_DOMAIN || firebaseConfig.authDomain,
  databaseURL: process.env.FB_DATABASE_URL || firebaseConfig.databaseURL,
  projectId: process.env.FB_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: process.env.FB_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId:
    process.env.FB_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: process.env.FB_APP_ID || firebaseConfig.appId,
};

const userEnv = {
  userEmail: process.env.FB_USER_EMAIL || userConfig.userEmail,
  userPassword: process.env.FB_USER_PASSWORD || userConfig.userPassword,
};

const serverEnv = {
  serverKey: process.env.SERVER_KEY || serverConfig.server_key,
};

module.exports = { twitterEnv, firebaseEnv, userEnv, serverEnv };
