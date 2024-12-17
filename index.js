const express = require('express');
const http = require('http');
const cron = require("node-cron");
const websocket = require('ws');
const auth = require("./Routes/auth/index");
const user = require("./Routes/user/account");
const UserComments = require("./Routes/user/comments");
const UserBlogs = require("./Routes/user/blogs");
const PublicBlogsRoutes = require("./Routes/publicRoutes/blogs");
const bodyparser = require('body-parser');
const cookieParser = require('cookie-parser');
const validateJWT = require('./middlewares/jwt');
const writers = require("./Routes/publicRoutes/writers");
const messages = require("./Routes/user/messages");
const notification = require("./Routes/user/notifications");
const ai = require("./Routes/user/ai");
const { handelWSC } = require("./ws/index");
const { Generate_blog } = require("./auto/generateBlog");

const app = express();
const server = http.createServer(app); 

app.use(cookieParser());
app.use(bodyparser.json({ limit: "10mb" })); // increasing body size limit
app.use("/user/", validateJWT);
app.use("/user", user);
app.use("/user/ai", ai);
app.use("/writers/", writers);
app.use("/user/comments/", UserComments);
app.use("/user/blogs/", UserBlogs);
app.use("/user/messages/", messages);
app.use("/user/notifications/", notification);
app.use("/auth", auth);
app.use("/blogs", PublicBlogsRoutes);

app.get('/', (req, res) => {
    res.send('Hello World!!');
});

try {
    // passing ws connections to its module
    const wss = new websocket.Server({ server:server, path: "/chat" }); //Binding WS to HTTP
    wss.on("connection", (client) => {
        handelWSC(client, wss)
    }); 

} catch (error) {
    console.log("Couldn't start WS server", error);
};

//Cron Jobs at every 30 minutes
cron.schedule("*/30 * * * *", () => {
    Generate_blog();
});

const PORT = process.env.APP_PORT || 80; 
server.listen(PORT, () => {
    console.log(`Sancity app and WS listening on port ${PORT}`);
});