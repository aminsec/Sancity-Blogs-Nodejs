const express = require("express");
const cookieParser = require("cookie-parser");
const validateJWT = require("./middlewares/jwt");
const bodyParser = require("body-parser");
const auth = require("./routes/auth/auth");
const user = require("./routes/user/account");
const userComments = require("./routes/user/comments");
const userBlogs = require("./routes/user/blogs");
const publicBlogsRoutes = require("./routes/public/blogs");
const writers = require("./routes/public/writers");
const messages = require("./routes/user/messages");
const notification = require("./routes/user/notifications");
const ai = require("./routes/user/ai");

const app = express();

app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" })); // Increasing body size limit

// Protected routes
app.use("/user/", validateJWT);
app.use("/user", user);
app.use("/user/ai", ai);
app.use("/user/comments", userComments);
app.use("/user/blogs", userBlogs);
app.use("/user/messages", messages);
app.use("/user/notifications", notification);

// Public routes
app.use("/auth", auth);
app.use("/writers", writers);
app.use("/blogs", publicBlogsRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!!");
});

module.exports = app;
