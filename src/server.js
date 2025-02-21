const http = require("http");
const websocket = require("ws");
const cron = require("node-cron");

const app = require("./app");
const { handelWSC } = require("./ws/index");
const { Generate_blog } = require("./scripts/generateBlog");

const PORT = process.env.APP_PORT || 80;
const server = http.createServer(app);

// WebSocket Setup
try {
  const wss = new websocket.Server({ server, path: "/chat" }); // Bind WS to HTTP
  wss.on("connection", (client) => {
    handelWSC(client, wss);
  });
} catch (error) {
  console.error("Couldn't start WS server", error);
}

// Cron Job (Runs every 30 minutes)
cron.schedule("*/30 * * * *", () => {
  Generate_blog();
});

server.listen(PORT, () => {
  console.log(`Sancity app and WS listening on port ${PORT}`);
});
