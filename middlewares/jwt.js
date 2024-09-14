const jwt = require('jsonwebtoken');
const { dead_sessionsTB } = require("../database");

async function validateJWT(req, resp, next){
    if(!req.cookies.token){
      resp.redirect("/login");
      return
    }
    const token = req.cookies.token;

    const dead_sessions = await dead_sessionsTB.findOne({
      where: {
        session: token
      }
    });

    if(dead_sessions !== null){
      resp.redirect("/login");
      return
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (error) {
      resp.redirect("/login");
    }
}

module.exports = validateJWT;