const express = require('express');
const router = express.Router();
const crypto = require('crypto')
const { usersTB } = require("../../database");
const jwt = require('jsonwebtoken');
const { sendResponse } = require("../../utils/functions");
var validator = require("email-validator");
var nodemailer = require('nodemailer');

router.get("/check-auth", (req, resp) => {
    if(!req.cookies.token){
        const data = {"message": false};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
    }

    const token = req.cookies.token;
    try {
        const isValidToken = jwt.verify(token, process.env.JWT_SECRET);
        if(isValidToken){
            const data = {"message": true};
            resp.setHeader("content-type", "application/json");
            resp.send(JSON.stringify(data));
            resp.end();
        }
    } catch (error) {
        const data = {"message": false};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
    }
})

router.post("/login", (req, resp) => {
    const { username, password } = req.body;
    if(username === undefined || password === undefined){
        const data = {"message": "All fields required", "success": false};
        resp.status(400);
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    let userHashPassword = crypto.createHash('md5').update(password).digest("hex"); //hashing the password to md5
    usersTB.findOne({
        where: {
            username: username,
            password: userHashPassword
        }
    }).then((res) => {
        if(res == null){
            const data = {"message": "Invalid credentials", "success": false};
            resp.status(401)
            resp.setHeader("content-type", "application/json");
            resp.send(JSON.stringify(data));
            resp.end();
        }

        if(res){
            const userData = {
                username: username,
                email: res.email,
                id: res.userid,
                role: res.role,
                profilePic: res.profilePic
            }

            const token = jwt.sign(userData, process.env.JWT_SECRET,{
                expiresIn: "1h"
            });
            resp.cookie("token", token, {httpOnly: true, sameSite: 'lax'});
            resp.end();
            
        }
    })

})


router.post("/signup", async (req, resp) => {
    const { username, password, email } = req.body;
    if(username === undefined || password === undefined || email == undefined){
        const data = {"message": "All fields required", "success": false};
        resp.status(400);
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    if(username.length > 24){
        const data = {"message": "Maximum length for username is 24 character", "success": false};
        resp.status(400);
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }
    
    const checkUsernameRG =  new RegExp('^[a-zA-Z0-9_]+$');
    const isValidUsername = username.match(checkUsernameRG);
    const validEmail = validator.validate(email);
    
    if(!validEmail || !isValidUsername){
        const data = {"message": "Invalid inputs. Check email and username are valid", "success": false};
        resp.status(400);
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    //Checking if the username exist
    const checkUsernameExist = await usersTB.findOne({
        where: {
            username: username
        }
    })
    if(checkUsernameExist){
        const data = {"message": "This username already exist", "success": false};
        resp.status(400);
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data))
        resp.end();
        return
    }

    //Checking if the email exist
    const checkEamilExist = await usersTB.findOne({
        where: {
            email: email
        }
    })
    if(checkEamilExist){
        const data = {"message": "This email already exist", "success": false};
        resp.status(400);
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data))
        resp.end();
        return
    }

    //Inserting user
    var datetime = new Date();
    var createdTime = datetime.toISOString().slice(0,10);
    let userHashPassword = crypto.createHash('md5').update(password).digest("hex"); //hashing the password to md5
    
    try {
        const insertUser = await usersTB.create({
            username: username,
            password: userHashPassword,
            email: email,
            role: "user",
            joinDate: createdTime
        })
        
        if(insertUser){
            //Getting userid data from database to be set in token
            const createdUserData = await usersTB.findOne({
                where:{
                    username: username
                }
            })

            const userData = {
                username: username,
                email:  email,
                id: createdUserData.userid,
                profilePic: "/api/v1/profilePics/ProfileDefault.png",
                role: "user"
            }
            //Creating token
            const token = jwt.sign(userData, process.env.JWT_SECRET);
            resp.setHeader("content-type", "application/json");
            resp.cookie("token", token, {httpOnly: true, sameSite: 'lax'});
            resp.end();
            return;
        }
    } catch (error) {
        const data = {"message": "An error accoured", "success": false};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }
})

router.post("/forgot-password", (req, resp) => {
    const { email } = req.body;
    if(!email){
        sendResponse({state: "failed", message: "Required email parameter"}, resp)
        return
    }
    
    const isValidEmail = validator.validate(email);
    if(!isValidEmail){
        sendResponse({state: "failed", message: "Invalid email address"}, resp)
        return
    }

    const data = {
        email: email
    }
    //Creating token to change password
    const token = jwt.sign(data, process.env.JWT_SECRET,{
        expiresIn: "5m"
    });

    var transporter = nodemailer.createTransport({
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false, 
        auth: {
          user: 'postmaster@sandbox94213fe03b824870b50c50d58f27973e.mailgun.org',
          pass: 'd782ab7804e5066149b396ea77369746-2b755df8-19d1528a'
        }
    });



    var mailOptions = {
        from: 'sancityblogs@gmail.com',
        to: email,
        subject: 'Change Password!',
        html: `You can change your password using this <a href=http://sancity.blogs:8081/change-password?token=${token}>link</a>`
    };

    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
        console.log(error);
    } else {
        console.log('Email sent: ' + info.response);
    }
    });

})

router.get("/logout", (req, resp) => {
    resp.cookie("token", "deleted");
    resp.redirect("/");
    resp.end();
})

module.exports = router;