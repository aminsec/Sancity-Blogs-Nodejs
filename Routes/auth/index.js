const express = require('express');
const router = express.Router();
const crypto = require('crypto')
const { usersTB, dead_sessionsTB } = require("../../database");
const jwt = require('jsonwebtoken');
const { sendResponse, isUndefined, validateUsername } = require("../../utils/functions");
var validator = require("email-validator");

router.post("/login", async (req, resp) => {
    //Getting username and password from body
    const { username, password } = req.body; 
    
    //Returning, If parameters not defined
    if(await isUndefined(resp, username, password)) return;

    //hashing the password to md5
    let userHashPassword = crypto.createHash('md5').update(password).digest("hex"); 
    
    //Quering user's data
    const userData = await usersTB.findOne({
        where: {
            username: username,
            password: userHashPassword
        }
    });

    //Responding with 401 if credentials were not valid
    if(userData == null){
        const message = {message: "Invalid credentials", state: "failed"};
        sendResponse(message, resp, {}, 401);
        return
    }
    
    //Getting user's data if it was valid
    if(userData){
        const userInfo = {
            username: userData.username,
            email: userData.email,
            id: userData.userid,
            role: userData.role,
            profilePic: userData.profilePic
        };
        
        //Signing token
        const token = jwt.sign(userInfo, process.env.JWT_SECRET,{
            expiresIn: "1h"
        });
        
        //Responding with token
        resp.cookie("token", token, {httpOnly: true, sameSite: 'lax'});
        resp.end();
    }
});

router.post("/signup", async (req, resp) => {
     //Getting username and password from body
    const { username, password, email } = req.body;

    //Checking if parameters are undefined
    if(await isUndefined(resp, username, password, email)) return;

    //Validating username
    if(!await validateUsername(username, resp)) return;

    //Validating email
    if(!validator.validate(email)){
        const message = {message: "Invalid email", state: "failed"};
        sendResponse(message, resp, {}, 400);
        return
    }

    //Checking if the username exist
    const usernameExist = await usersTB.findOne({
        where: {
            username: username
        }
    });

    if(usernameExist){
        const message = {message: "This username already exist", state: "failed"};
        sendResponse(message, resp, {}, 400);
        return
    }

    //Checking if the email exist
    const emailExist = await usersTB.findOne({
        where: {
            email: email
        }
    })
    if(emailExist){
        const message = {message: "This email already exist", state: "failed"};
        sendResponse(message, resp, {}, 400);
        return
    }

    //Inserting user
    var createdTime = Date.now().toString();
    
    //hashing the password to md5
    let userHashPassword = crypto.createHash('md5').update(password).digest("hex"); 
    
    try {
        //Inserting user's data
        const insertUser = await usersTB.create({
            username: username,
            password: userHashPassword,
            email: email,
            role: "user",
            joinDate: createdTime
        })
        if(insertUser){
            const userData = {
                username: username,
                email:  email,
                id: insertUser.userid,
                profilePic: "/api/v1/profilePics/ProfileDefault.png",
                role: "user"
            }
            //Creating token
            const token = jwt.sign(userData, process.env.JWT_SECRET);
            resp.cookie("token", token, {httpOnly: true, sameSite: 'lax'});
            resp.end();
            return;
        }
    } catch (error) {
        const message = {"message": "An error accoured", "success": false};
        sendResponse(message, resp, {}, 500);
        return
    }
});

router.get("/logout", async (req, resp) => {
    if(req.cookies.token){
        try {
            //validating the cookie's value to insert only valid jwt token to dead_sessions table
            jwt.verify(req.cookies.token, process.env.JWT_SECRET);
            const revokeToken = await dead_sessionsTB.create({
                session: req.cookies.token
            })
            resp.cookie("token", "deleted");
            resp.redirect("/");
            resp.end();
            return

        } catch (error) {
            resp.cookie("token", "deleted");
            resp.redirect("/");
            resp.end();
            return
        }
    }

    resp.cookie("token", "deleted");
    resp.redirect("/");
    resp.end();
});

//A secondary route to check user authentication
router.get("/check-auth", async (req, resp) => {
    if(!req.cookies.token){
        const message = {"message": false};
        sendResponse(message, resp);
        return
    }

    const token = req.cookies.token;

    try {
        //If token was not valid, it will go through an error
        const isValidToken = jwt.verify(token, process.env.JWT_SECRET);
        
        //checking if the token is a revoked token
        const isRevokedToken = await dead_sessionsTB.findOne({
            where: {
                session: token
            }
        });
        if(isRevokedToken){
            const message = {"message": false};
            sendResponse(message, resp);
            return
        }

        const message = {"message": true};
        sendResponse(message, resp);
        return
        
    } catch (error) {
        const message = {"message": false};
        sendResponse(message, resp);
        resp.end();
    }
});

module.exports = router;