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

const cronSchedules = {
  every3Hours: "0 */3 * * *",
  everyMinute: "* * * * *",
  every6Hours: "0 */6 * * *",
  betweenTheseHours: "0 9-17 * * *",
};

const samplePost = {
  frame_timeStamp: 9375,
  image_number: 5,
  filename: "img_005.jpg",
  frame_number: 225,
  subtitle: null,
  log_timestamp: 0, // Generated at point of sending
  log_status: "", // Succeeded/Failed
};

const logOutput = [];

// Assemble Subtitles
const srtString = fs.readFileSync(__dirname + "/input-media/plan9.srt", {
  encoding: "utf-8",
});
const subtitles = Subtitle.parse(srtString);
// console.log(subtitles);

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

// Sign in
const userSignInPromise = (email, password) => {
  appendLog(`Signing in as ${email}...`);
  return firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      appendLog(`Successfully logged in as ${email}`);
      return Promise.resolve();
    });
};

// Get play state
const getPlayState = () => {
  return database
    .ref("/state/is_playing")
    .once("value")
    .then((snapshot) => {
      if (snapshot.val() === true) {
        state.isPlaying = true;
        return true;
      } else {
        state.isPlaying = false;
        return false;
      }
    });
};

// Get last post & store locally
const fetchLastPost = () => {
  appendLog("Fetching last post from database");
  return database
    .ref("/state/last_post")
    .once("value")
    .then((snapshot) => {
      // console.log(snapshot.val());
      appendLog(`Succeeded getting post ${snapshot.val().log_id}`);
      state.lastPost = snapshot.val();
      return snapshot.val();
    });
};

// Find next picture to post and store details locally
const getNextPicture = () => {
  appendLog(`Last recorded image posted was ${state.lastPost.filename}.`);
  appendLog(`Fetching next image from local data...`);
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
    };
    state.nextPost = newNextPost;
    appendLog(`${state.nextPost.filename} successfully added to post queue`);
    return Promise.resolve();
  } else {
    appendLog(`No results found. Aborting...`);
    return Promise.reject();
  }
};

// post picture to twitter
const postPictureToTwitter = () => {
  appendLog(`Reading ${state.nextPost.filename} from images...`);
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
              return Promise.reject();
            } else {
              appendLog("Image posted successfully");
              return Promise.resolve();
            }
          }
        );
      }
    }
  );
};

// After everything, upload log to database, whether post succeeded or failed
const sendLog = (data) => {
  appendLog(`Sending Log entry...`);
  const time = timestamp();
  const formattedDate = new Date(time).toLocaleString();
  const newData = {
    ...data,
    frame_timeStamp: state.nextPost.frame_timeStamp,
    image_number: state.nextPost.image_number,
    filename: state.nextPost.filename,
    frame_number: state.nextPost.frame_number,
    subtitle: state.nextPost.subtitle,
    log_timestamp: time,
    log_status: state.nextPost.log_status,
    comment: state.nextPost.comment,
    log_date: formattedDate,
    log_id: state.nextPost.log_id,
    status: state.nextPost.status,
    log_output: logOutput,
  };
  return database
    .ref(`/posts/${time}`)
    .set(newData)
    .then(() => {
      console.log("Successfully posted log entry.");
      updateLastPost(newData).then(() => {
        console.log("Last post information updated successfully.");
        resetState();
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

// Update last post in database
const updateLastPost = (data) => {
  console.log("Updating last post information...");
  return database
    .ref(`/state/last_post`)
    .set(data)
    .then(() => {
      console.log("Success!");
    })
    .catch((err) => {
      console.log(err);
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

const appendLog = (logData) => {
  console.log(logData);
  logOutput.push(logData);
};

const userSignIn = (
  email,
  password,
  cb = () => {
    console.log("ERROR - no callback function provided");
  }
) => {
  appendLog(`Signing in as ${email}`);
  return firebase.auth().signInWithEmailAndPassword(email, password);
};

const postPost = (cb, data) => {
  const time = timestamp();
  const uid = time;
  const formattedDate = new Date(time).toLocaleString();
  const newData = {
    ...data,
    post_id: uid,
    post_timestamp: time,
    post_date: formattedDate,
  };
  database
    .ref(`/posts/${uid}`)
    .set(newData)
    .then((res) => {
      cb(snapshot.val());
      database
        .ref(`/state/last_post`)
        .set(newData)
        .then((res) => {
          console.log("setLastPost");
          console.log(res);
        });
    });
  const newPostRef = database.ref(`/posts/${uid}`);
  newPostRef.on("value", (snapshot) => {
    console.log("postPost: ", snapshot.val());

    return null;
  });
};

const sendLastPostEvent = (cb, data) => {
  database
    .ref(`/state/last_post`)
    .set(data)
    .then((res) => {
      console.log("setLastPost");
      console.log(res);
    })
    .catch((err) => {
      console.log(err);
    });
};

const _eraseAllPosts = (cb) => {
  const time = timestamp();
  const formattedDate = new Date(time).toLocaleString();
  const newData = {
    date_last_erased: time,
  };
  database.ref(`/posts`).set(newData);
  const newPostRef = database.ref(`/posts`);
  newPostRef.on("value", (snapshot) => {
    console.log("postPost: ", snapshot.val());
    cb(snapshot.val());
    return snapshot.val();
  });
};

const sendTweet = (cb, status) => {
  console.log("reached model");
  twitterInstance.post(
    "statuses/update",
    { status: status },
    (err, data, response) => {
      if (err) {
        console.log(`ERROR: Failed to post "${status}"`);
        console.dir(err);
        // console.log(data);
        cb(err);
      } else {
        console.log(`Successfully posted "${status}"`);
        // console.log("RESPONSE: ", response);
        // console.log(data);
        cb(null, response);
      }
    }
  );
};

const tweetImage = (cb) => {
  const options = {
    url:
      "https://vignette.wikia.nocookie.net/simpsons/images/f/fc/T-McClure.png",
    dest: "./troy.png",
  };
  console.log("reached model");
  // TODO - Assemble tweet code from base64test
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
                      cb({
                        error: "ERROR: unable to delete image " + options.dest,
                      });
                    } else {
                      console.log("image " + options.dest + " was deleted");
                      cb({ status: "image " + options.dest + " was deleted" });
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

const getImageFrame = (imageNumber) => {
  return imageNumber * 45;
};

const getImageTimeStamp = (imageNumber) => {
  const thisFrameNumber = imageNumber * 45;
  const thistimeStamp = (thisFrameNumber / 24) * 1000;
  return thistimeStamp;
};

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

// Scheduled function using cron

// userSignIn(userEnv.userEmail, userEnv.userPassword, (response) => {
//   console.log(`Signing into firebase as ${userEnv.userEmail}`);
//   if (response.hasOwnProperty("uid")) {
//     console.log(`Signed in as ${response.email}`);
//     database
//       .ref("/state/last_post")
//       .once("value")
//       .then((snapshot) => {
//         cron.schedule(cronSchedules.every6Hours, () => {
//           console.log("Running scheduled task...");
//           const cb = (err, res) => {
//             if (err) {
//               console.log(err);
//             } else {
//               console.log(res);
//             }
//           };
//           postPost(cb, { comment: "Cron schedule = 6 hours" });
//         });
//       });
//   } else {
//     console.log("error");
//     console.log(response);
//   }
// });

// DANGER - ERASE ALL POSTS

// userSignIn(userEnv.userEmail, userEnv.userPassword, (response) => {
//   console.log(`Signing into firebase as ${userEnv.userEmail}`);
//   if (response.hasOwnProperty("uid")) {
//     console.log(`Signed in as ${response.email}`);
//     database
//       .ref("/state/last_post")
//       .once("value")
//       .then((snapshot) => {
//         const cb = (err, res) => {
//           if (err) {
//             console.log(err);
//           } else {
//             console.log(res);
//           }
//         };
//         _eraseAllPosts(cb);
//       });
//   } else {
//     console.log("error");
//     console.log(response);
//   }
// });

// userSignIn(userEnv.userEmail, userEnv.userPassword)
//   .then((res) => {
//     const { email, uid, displayName, photoURL } = res.user;
//     const userData = {
//       uid: uid === null ? "" : uid,
//       email: email === null ? "" : email,
//       displayName: displayName === null ? "" : displayName,
//       photoURL: photoURL === null ? "" : photoURL,
//     };
//     console.log("success");
//     console.dir(userData);
//     // sendLogEvent({ comment: "Testing Promises" }).then((res) => {
//     //   console.log(res.val());
//     // });
//   })
//   .catch((error) => {
//     console.log("error");
//     var errorCode = error.code;
//     var errorMessage = error.message;
//     console.log(errorCode, errorMessage);
//   });

// userSignInPromise(userEnv.userEmail, userEnv.userPassword)
//   .then(() => {
//     return fetchLastPost();
//   })
//   .then(() => {
//     // Find next image
//     return getNextPicture();
//   })
//   .then(() => {
//     // Post Image to twitter
//   })
//   .then(() => {
//     // Send log entry
//   })
//   .catch((err) => {
//     console.log(err);
//   });

userSignInPromise(userEnv.userEmail, userEnv.userPassword).then(() => {
  getPlayState().then((response) => {
    console.log(response);
    if (response === true) {
      fetchLastPost().then(() => {
        getNextPicture().then(() => {
          postPictureToTwitter().then(() => {
            sendLog();
          });
        });
      });
    } else {
      const time = timestamp();
      console.log(`Failed playback check at ${time}`);
    }
  });
});

// Almost there. Log output stops after image post:
// POSSIBLE SOLUTION: Declare all functions as new promises

// Signing in as plan9framebyframe@gmail.com...
// Successfully logged in as plan9framebyframe@gmail.com
// true
// Fetching last post from database
// Succeeded getting post 1592247540003
// Last recorded image posted was img_005.jpg.
// Fetching next image from local data...
// Found 1 matches.
// Updating local storage...
// img_006.jpg successfully added to post queue
// Reading img_006.jpg from images...
// Encoded img_006.jpg to base64
// Uploading image to Twitter...
// Image uploaded successfully.
// Starting Twitter post...
// Image posted successfully
