const jwt = require('jsonwebtoken');

function validateJWT(req, resp, next){
    if(!req.cookies.token){
      resp.redirect("/login");
    }
    const token = req.cookies.token;
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (error) {
      resp.redirect("/login");
    }
}

module.exports = validateJWT;