const express = require('express');
const app = express();
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

app.use(cookieParser());
app.use(bodyparser.json({limit: "50mb"})); //increasing body size limit
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
  })

app.listen(process.env.APP_PORT, () => {
    console.log(`Sancity app listening on port 80`);
  })