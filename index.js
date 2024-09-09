const express = require('express');
const app = express();
const auth = require("./auth/index");
const user = require("./user/index");
const publicRoutes = require("./publicRoutes/index");
const bodyparser = require('body-parser');
const cookieParser = require('cookie-parser');
const validateJWT = require('./middlewares/jwt');

app.use(cookieParser());
app.use(bodyparser.json({limit: "50mb"})); //increasing body size limit
app.use("/auth", auth);
app.use("/user/", validateJWT);
app.use("/user", user);
app.use("/", publicRoutes);

app.get('/', (req, res) => {
    res.send('Hello World!!');
  })

app.listen(80, () => {
    console.log(`Example app listening on port 80`);
  })