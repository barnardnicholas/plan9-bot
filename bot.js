const fs = require("fs");
const path = require("path");
const Twit = require("twit");
const download = require("image-downloader");
const timestamp = require("timestamp");
const cron = require("node-cron");
const Subtitle = require("subtitle");
const imageData = require("./image-data");

// Import Firebase
const firebase = require("firebase");

// Auth variables
const { twitterEnv, firebaseEnv, userEnv } = require("./auth/auth");

// Initialize Firebase
firebase.initializeApp(firebaseEnv);

// Database Reference
const database = firebase.database();

// Initialize Twitter
const twitterInstance = new Twit(twitterEnv);

// Assemble Subtitles
const srtString = fs.readFileSync(__dirname + "/input-media/plan9.srt", {
  encoding: "utf-8",
});
const subtitles = Subtitle.parse(srtString);

// Declare local data
const cronSchedules = {
  every3Hours: "0 */3 * * *",
  everyMinute: "* * * * *",
  every6Hours: "0 */6 * * *",
  betweenTheseHours: "0 9-17 * * *",
};

const hashtags = [
  "#plan9framebyframe",
  "#plan9fromouterspace",
  "#plan9",
  "#edwood",
  "#bmovie",
  "#moviescreening",
  "#slowscreening",
];

// Declare Log output
let logOutput = [];

// STATE - Local Storage for data
let state = {
  lastPost: {
    frame_timestamp: 0,
    image_number: 0,
    filename: "",
    frame_number: 0,
    subtitle: null,
    log_timestamp: null,
    log_status: "",
    comment: "",
    log_date: "",
    log_id: 0,
    status: "",
    log_output: [],
  },
  nextPost: {
    frame_timestamp: 0,
    image_number: 0,
    filename: "",
    frame_number: 0,
    subtitle: null,
    log_timestamp: null,
    log_status: "",
    comment: "",
    log_date: "",
    log_id: 0,
    status: "",
    log_output: [],
  },
  isPlaying: false,
};

// ---------------------------------- FUNCTIONS ----------------------------------

// Sign into Firebase
const userSignIn = (email, password) => {
  appendLog(`Signing in as ${email}...`);
  return firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      appendLog(`Successfully logged in as ${email}`);
      return Promise.resolve();
    })
    .catch(() => {
      return Promise.reject();
    });
};

// Get play state from database & store locally
const getPlayState = () => {
  return database
    .ref("/state/is_playing")
    .once("value")
    .then((snapshot) => {
      return new Promise((resolve, reject) => {
        if (snapshot.val() === true) {
          state.isPlaying = true;
          resolve(true);
        } else {
          state.isPlaying = false;
          reject(new Error("Play state check failed"));
        }
      });
    });
};

// Get last post & store locally
const fetchLastPost = () => {
  appendLog("Fetching last post from database");
  return new Promise((resolve, reject) => {
    database
      .ref("/state/last_post")
      .once("value")
      .then((snapshot) => {
        if (snapshot.val()) {
          appendLog(`Succeeded getting post ${snapshot.val().log_id}`);
          state.lastPost = snapshot.val();
          resolve();
        } else {
          reject(new Error("Failed to fetch last post"));
        }
      });
  });
};

// TODO - Assemble Tweet Status from frame number
const writeStatus = (frameNumber) => {
  let result = `'Plan 9 from Outer Space' (1959)`;
  const filteredImageData = imageData.filter((image) => {
    return image.frameNumber === frameNumber;
  });
  if (filteredImageData.length) {
    if (
      filteredImageData[0].hasOwnProperty("frameNumber") &&
      filteredImageData[0].frameNumber
    ) {
      result += ` - Frame no. ${frameNumber}`;
    }
    // Add movie timestamp - Scrapped due to inaccurate timestamp data
    // if (
    //   filteredImageData[0].hasOwnProperty("frameTimeStamp") &&
    //   filteredImageData[0].frameTimeStamp
    // ) {
    //   const formattedDate = new Date(filteredImageData[0].frameTimeStamp);

    //   result += `, ${("00" + (formattedDate.getHours() - 1)).slice(-2)}:${(
    //     "00" + formattedDate.getMinutes()
    //   ).slice(-2)}:${("00" + formattedDate.getSeconds()).slice(-2)}`;
    // }
  }
  result +=
    ", \n Part of 'Plan 9 Frame-by-Frame', a slow movie screening curated by @nickbarnardinc MMXX-MMXXI \n ";
  result += hashtags.join(" ");
  return result;
};

// Find next picture to post and store details locally
const getNextPicture = () => {
  appendLog(`Last recorded image posted was ${state.lastPost.filename}.`);
  appendLog(`Fetching next image from local data...`);

  return new Promise((resolve, reject) => {
    const filteredImageData = imageData.filter((image) => {
      return image.imageNumber === state.lastPost.image_number + 1;
    });
    appendLog(`Found ${filteredImageData.length} matches.`);
    appendLog(`Updating local storage...`);
    if (filteredImageData.length) {
      const newNextPost = {
        frame_timestamp: filteredImageData[0].frameTimeStamp,
        image_number: filteredImageData[0].imageNumber,
        filename: filteredImageData[0].fileName,
        frame_number: filteredImageData[0].frameNumber,
        subtitle: filteredImageData[0].subtitle,
        status: writeStatus(filteredImageData[0].frameNumber),
      };
      state.nextPost = newNextPost;
      appendLog(`${state.nextPost.filename} successfully added to post queue`);
      resolve();
    } else {
      appendLog(`No results found. Aborting...`);
      reject(new Error(`No results found. Aborting...`));
    }
  });
};

// Tweet some text
const postTweet = (status) => {
  return new Promise((resolve, reject) => {
    twitterInstance.post(
      "statuses/update",
      { status: status },
      (err, data, response) => {
        if (err) {
          console.log(`ERROR: Failed to post "${status}"`);
          console.dir(err);
          reject(err);
        } else {
          console.log(`Successfully posted "${status}"`);
          // console.log("RESPONSE: ", response);
          // console.log(data);
          resolve(data);
        }
      }
    );
  });
};

// Post picture to twitter
const postPictureToTwitter = () => {
  appendLog(`Reading ${state.nextPost.filename} from images...`);
  return new Promise((resolve, reject) => {
    const b64content = fs.readFileSync(
      __dirname + `/input-media/plan9_img/${state.nextPost.filename}`,
      {
        encoding: "base64",
      }
    );
    console.log(`Encoded ${state.nextPost.filename} to base64`);
    console.log("Uploading image to Twitter...");
    return twitterInstance.post(
      "media/upload",
      { media_data: b64content },
      (err, data) => {
        if (err) {
          appendLog(err);
        } else {
          appendLog("Image uploaded successfully.");
          appendLog("Starting Twitter post...");
          twitterInstance.post(
            "statuses/update",
            {
              media_ids: new Array(data.media_id_string),
              status: state.nextPost.status,
            },
            (err, data, response) => {
              if (err) {
                appendLog(err);
                reject(new Error(err));
              } else {
                appendLog("Image posted successfully");
                resolve(data);
              }
            }
          );
        }
      }
    );
  });
};

// Upload log to database
const sendLog = (data) => {
  appendLog(`Sending Log entry...`);
  return new Promise((resolve, reject) => {
    const time = timestamp();
    const formattedDate = new Date(time).toLocaleString();
    const newData = {
      frame_timestamp: state.nextPost.frame_timestamp || null,
      image_number: state.nextPost.image_number || null,
      filename: state.nextPost.filename || null,
      frame_number: state.nextPost.frame_number || null,
      subtitle: state.nextPost.subtitle || null,
      log_timestamp: time || null,
      log_status: state.nextPost.log_status || null,
      comment: state.nextPost.comment || null,
      log_date: formattedDate || null,
      log_id: state.nextPost.log_id || null,
      status: state.nextPost.status || null,
      log_output: logOutput || null,
      ...data,
    };
    database
      .ref(`/posts/${time}`)
      .set(newData)
      .then(() => {
        console.log("Successfully posted log entry.");
        updateLastPost(newData).then(() => {
          console.log("Last post information updated successfully.");
          resolve();
        });
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

// Update last post in database
const updateLastPost = (data) => {
  console.log("Updating last post information...");
  return new Promise((resolve, reject) => {
    database
      .ref(`/state/last_post`)
      .set(data)
      .then(() => {
        console.log("Success!");
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

// Reset last post in database
const _resetLastPost = () => {
  const time = timestamp();
  const initialLastPost = {
    frame_timestamp: 7500,
    image_number: 4,
    filename: "img_004.jpg",
    frame_number: 180,
    subtitle: null,
    log_timestamp: time,
    log_status: "",
    comment: "Manual Reset",
    log_date: new Date(time).toLocaleString(),
    log_id: time,
    status: "",
    log_output: [],
  };
  console.log("Performing Manual Reset of last post information...");
  return new Promise((resolve, reject) => {
    database
      .ref(`/state/last_post`)
      .set(initialLastPost)
      .then(() => {
        console.log("Success!");
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

// Reset local storage
const resetState = () => {
  console.log("Resetting local storage...");
  state.lastPost = {
    frame_timeStamp: 0,
    image_number: 0,
    filename: "",
    frame_number: 0,
    subtitle: null,
    log_timestamp: null,
    log_status: "",
    comment: "",
    log_date: "",
    log_id: 0,
    status: "",
    log_output: [],
  };
  state.nextPost = { ...state.lastPost };
  logOutput = [];
  console.log("Finished!");
};

// Add entry to log and log to console
const appendLog = (logData) => {
  console.log(logData);
  logOutput.push(logData);
};

// Erase all posts in database
const _eraseAllPosts = () => {
  return new Promise((resolve, reject) => {
    const time = timestamp();
    const formattedDate = new Date(time).toLocaleString();
    const newData = {
      date_last_erased: time,
    };
    database.ref(`/posts`).set(newData);
    const newPostRef = database.ref(`/posts`);
    newPostRef.on("value", (snapshot) => {
      console.log(snapshot.val());
      resolve(snapshot.val());
    });
  });
};

// Find frame number from Image number
const getImageFrame = (imageNumber) => {
  return imageNumber * 45;
};

// Find timestamp from image number
const getImageTimeStamp = (imageNumber) => {
  const thisFrameNumber = imageNumber * 45;
  const thistimeStamp = (thisFrameNumber / 24) * 1000;
  return thistimeStamp;
};

// Assemble JSON image Data
const buildImageData = () => {
  const images = fs.readdirSync("./input-media/plan9_img");
  const assembledData = images.map((image) => {
    const imageNumber = parseInt(image.slice(0, -4).slice(4));
    const frameTimeStamp = getImageTimeStamp(imageNumber);
    const subtitleOffset = -17000;
    const filteredSubs = subtitles.filter((subtitle) => {
      if (
        frameTimeStamp + subtitleOffset >= subtitle.start &&
        frameTimeStamp + subtitleOffset <= subtitle.end
      ) {
        return subtitle;
      }
    });
    let thisSub = null;
    if (filteredSubs.length) {
      if (filteredSubs[0].hasOwnProperty("text")) {
        thisSub = filteredSubs[0].text;
      }
    }
    return {
      frameTimeStamp,
      imageNumber,
      fileName: image,
      frameNumber: getImageFrame(imageNumber),
      subtitle: thisSub,
    };
  });
  const dataString =
    "const subs = " +
    JSON.stringify(assembledData) +
    "; module.exports = subs;";
  fs.writeFile("./input-media/image-data.js", dataString, "utf-8", (res) => {
    console.log("finished");
  });
};

// Execute all functions in sequence - runs at every tick
const masterTaskRunner = () => {
  userSignIn(userEnv.userEmail, userEnv.userPassword)
    .then(() => {
      return getPlayState();
    })
    .then(() => {
      return fetchLastPost();
    })
    .then(() => {
      // Find next image
      return getNextPicture();
    })
    .then(() => {
      // Post Image to twitter
      return postPictureToTwitter();
    })
    .then(() => {
      // Send log entry
      sendLog();
    })
    .then(() => {
      // Reset State
      resetState();
    })
    .catch((err) => {
      if (firebase.auth().currentUser) {
        // sendLog({ comment: "Movie is not playing" });
        console.log("Movie is not playing");
      }
      console.log(err);
      resetState();
    });
};

// Start schedule tick - runs on server start
const startSchedule = (cronInterval) => {
  console.log("Starting Cron scheduler...");
  cron.schedule(cronInterval, () => {
    console.log("Running scheduled task...");
    masterTaskRunner();
  });
};

// ---------------------------------- INVOCATIONS ----------------------------------

// MAIN EVENT - Start Scheduler - Choose ONE
// startSchedule(cronSchedules.everyMinute); // Debug
startSchedule(cronSchedules.every3Hours); // ACTUAL TIMEFRAME
// startSchedule(cronSchedules.every6Hours);

// Perform Post once - debug only
// masterTaskRunner();

// Tweet text once - debug only
// userSignIn(userEnv.userEmail, userEnv.userPassword)
//   .then(() => {
//     return postTweet(writeStatus(42795));
//   })
//   .then(() => {
//     console.log("Finished");
//   })
//   .catch((err) => {
//     console.log("Error" + err);
//   });

// ---------------------------------- DANGER ZONE ----------------------------------

// DANGER - RESET LAST POST - debug only
// userSignIn(userEnv.userEmail, userEnv.userPassword).then(() => {
//   _resetLastPost();
// });

// DANGER - ERASE ALL POSTS  - debug only
// userSignIn(userEnv.userEmail, userEnv.userPassword).then(() => {
//   _eraseAllPosts();
// });
