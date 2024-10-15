const express = require('express');
const http = require('http');
const websocket = require('ws');
const auth = require("./Routes/auth/index");
const user = require("./Routes/user/index");
const UserComments = require("./Routes/user/comments");
const UserBlogs = require("./Routes/user/blogs");
const IndexPublicRoutes = require("./Routes/publicRoutes/index");
const PublicBlogsRoutes = require("./Routes/publicRoutes/blogs");
const bodyparser = require('body-parser');
const cookieParser = require('cookie-parser');
const validateJWT = require('./middlewares/jwt');
const writers = require("./Routes/publicRoutes/writers");
const notification = require("./Routes/user/notifications");
const { handelWSC } = require("./ws/index")

const app = express();
const server = http.createServer(app); 

app.use(cookieParser());
app.use(bodyparser.json({ limit: "50mb" })); // increasing body size limit
app.use("/", IndexPublicRoutes);
app.use("/user/", validateJWT);
app.use("/user", user);
app.use("/writers/", writers);
app.use("/user/comments/", UserComments);
app.use("/user/blogs/", UserBlogs);
app.use("/user/notifications/", notification);
app.use("/auth", auth);
app.use("/blogs", PublicBlogsRoutes);

app.get('/', (req, res) => {
    res.send('Hello World!!');
});

const wss = new websocket.Server({ server }); //Binding WS to HTTP
wss.on("connection", (client) => {
    handelWSC(client, wss)
}); // passing ws connections to its module

const PORT = process.env.APP_PORT || 80; 
server.listen(PORT, () => {
    console.log(`Sancity app and WS listening on port ${PORT}`);
});