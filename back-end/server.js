const http = require("http");
const app = require("./src/app");
const { env } = require("./src/config/env");
const { createSocketServer } = require("./src/socket/chatSocket");

const httpServer = http.createServer(app);
createSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}`);
});
