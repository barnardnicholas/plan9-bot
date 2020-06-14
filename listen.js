const server = require("./server.js");

const { PORT = 9090 } = process.env;

server.listen(PORT, () => console.log(`Listening on ${PORT}...`));
