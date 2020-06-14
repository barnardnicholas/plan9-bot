import { v1 as uuidv1 } from "uuid";
import timestamp from "timestamp";
import * as utils from "../utils/utils";

// Import Firebase
import * as firebase from "firebase";

// Auth variables
import * as auth from "../auth/firebase-auth";
// import * as auth from "../env_variables/env";

// Initialize Firebase
firebase.initializeApp(auth.firebaseConfig);

// Database functions --------------------------------------

// Database Reference
const database = firebase.database();

export const getAllPosts = (cb) => {
  const allPostsRef = database.ref("/posts");
  allPostsRef.on("value", (snapshot) => {
    console.log("getAllPosts: ", snapshot.val());
    cb(snapshot.val());
    return snapshot.val();
  });
};

export const getPostByID = (id, cb) => {
  const singlePostRef = database.ref(`/posts/${id}`);
  singlePostRef.on("value", (snapshot) => {
    console.log("getPostByID: ", snapshot.val());
    cb(snapshot.val());
    return snapshot.val();
  });
};

export const postPost = (cb, data) => {
  const time = timestamp();
  const uid = `p9_${time}`;
  const formattedDate = utils.formatTimeStamp(time);
  console.log(formattedDate);
  const newData = {
    ...data,
    post_id: uid,
    post_timestamp: time,
    post_date: formattedDate,
  };
  database.ref(`/posts/${uid}`).set(newData);
  const newPostRef = database.ref(`/posts/${uid}`);
  newPostRef.on("value", (snapshot) => {
    console.log("postPost: ", snapshot.val());
    cb(snapshot.val());
    return snapshot.val();
  });
};

// User Authentication --------------------------------------

// export const userSignIn = (email, password) => {
//   firebase
//     .auth()
//     .signInWithEmailAndPassword(email, password)
//     .then((response) => {
//       console.dir(response);
//     })
//     .catch((error) => {
//       var errorCode = error.code;
//       var errorMessage = error.message;
//       console.log(errorCode, errorMessage);
//     });
// };

// User Authentication --------------------------------------

export const userSignIn = (
  email,
  password,
  cb = () => {
    console.log("ERROR - no callback function provided");
  }
) => {
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then((response) => {
      const {
        uid,
        email,
        emailVerified,
        phoneNumber,
        displayName,
        photoURL,
        isAnonymous,
      } = response.user;
      cb({
        uid: uid === null ? "" : uid,
        email: email === null ? "" : email,
        emailVerified: emailVerified === null ? "" : emailVerified,
        phoneNumber: phoneNumber === null ? "" : phoneNumber,
        displayName: displayName === null ? "" : displayName,
        photoURL: photoURL === null ? "" : photoURL,
        isAnonymous: isAnonymous === null ? "" : isAnonymous,
      });
    })
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      // console.log(errorCode, errorMessage);
      cb({ error });
    });
};

export const userSignOut = (
  cb = () => {
    console.log("ERROR - no callback function provided");
  }
) => {
  firebase
    .auth()
    .signOut()
    .then(
      () => {
        console.log("Signed Out");
        cb();
      },
      (error) => {
        console.error("Sign Out Error", error);
      }
    );
};

export const editUserInfo = (
  data = {},
  cb = () => {
    console.log("ERROR - no callback function provided");
  }
) => {
  const user = firebase.auth().currentUser;

  user
    .updateProfile(data)
    .then(() => {
      cb(data);
    })
    .catch((error) => {
      cb({ error });
    });
};

export const getCurrentUser = (
  cb = () => {
    console.log("ERROR - no callback function provided");
  }
) => {
  const currentUser = firebase.auth().currentUser;
  if (currentUser) {
    cb(currentUser);
  } else {
    cb(null);
  }
};

export const checkForCurrentUser = (
  cb = () => {
    console.log("ERROR - no callback function provided");
  }
) => {
  firebase.auth().onAuthStateChanged((user = null) => {
    if (user) {
      const {
        uid,
        email,
        emailVerified,
        phoneNumber,
        displayName,
        photoURL,
        isAnonymous,
      } = user;
      cb({
        uid: uid === null ? "" : uid,
        email: email === null ? "" : email,
        emailVerified: emailVerified === null ? "" : emailVerified,
        phoneNumber: phoneNumber === null ? "" : phoneNumber,
        displayName: displayName === null ? "" : displayName,
        photoURL: photoURL === null ? "" : photoURL,
        isAnonymous: isAnonymous === null ? "" : isAnonymous,
      });
    } else {
      cb(null);
    }
  });
};
