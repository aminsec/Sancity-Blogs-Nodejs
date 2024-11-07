const jwt = require('jsonwebtoken');
const { dead_sessionsTB } = require("../database");
//A middleware to validate JWT token
async function validateJWT(req, resp, next){
  //Redirecting to /login if token is not found
  if(!req.cookies.token){
    resp.redirect("/login");
    return
  }
  //Getting token from cookies
  const token = req.cookies.token;
  //Checking if the token has expired
  const dead_sessions = await dead_sessionsTB.findOne({
    where: {
      session: token
    }
  });
  //Redirecting /login if DB query was not null. Null means token has not expired
  if(dead_sessions !== null){
    resp.redirect("/login");
    return
  }
  //Verifing token in try-catch. If token was not valid, it will go through an error and we handle it with catch
  try {
    const userInfo = jwt.verify(token, process.env.JWT_SECRET);
    req.userInfo = userInfo; // Assigning user's info to req as an object
    next();
  } catch (error) {
    resp.redirect("/login");
  }
}
//Exporting module
module.exports = validateJWT;