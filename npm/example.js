const ngrok = require("./index");

async function connect() {
  const url = await ngrok.connect(8080);
  console.log(url);
}

connect();
