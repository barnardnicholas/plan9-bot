let promise = new Promise(function (resolve, reject) {
  // not taking our time to do the job
  // resolve(123); // immediately give the result: 123
  reject("error");
});

// promise
//   .then((result) => {
//     console.log(result);
//   })
//   .catch((err) => {
//     console.log(err);
//   });

  
