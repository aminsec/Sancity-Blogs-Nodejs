const { usersTB } = require("../../models/users.model");
const { dead_sessionsTB } = require("../../models/dead_sessions.model");
const jwt = require('jsonwebtoken');
const { isUndefined, validateUsername } = require("../../utils/validate");
const { sendResponse, genBcrypt } = require("../../utils/operations");
var validator = require("email-validator");

async function login(username, password) {

    //Quering user's data
    const userData = await usersTB.findOne({
        where: {
            username: username
        }
    });

    //Responding with 401 if username was not found
    if(userData == null){
        const error = {message: "Invalid credentials", state: "failed", code: 401};
        return [error, null];
    }

    //Comparing password
    const userHashedPassword = userData.dataValues.password;
    const passwordCheckResult = await genBcrypt("compare", password, userHashedPassword);
    
    if(passwordCheckResult == false){
        const error = {message: "Invalid credentials", state: "failed", code: 401};
        return [error, null];
    }
    
    //Getting user's data if credentials were valid
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
    return [null, token];
};

async function signup(username, password, email) {
    
    //Checking if the username exist
    const usernameExist = await usersTB.findOne({
        where: {
            username: username
        }
    });

    if(usernameExist){
        const error = {message: "This username already exist", state: "failed", code: 400};
        return [error, null];
    }

    //Checking if the email exist
    const emailExist = await usersTB.findOne({
        where: {
            email: email
        }
    });

    if(emailExist){
        const error = {message: "This email already exist", state: "failed", code: 400};
        return [error, null];
    }

    //Inserting user
    var createdTime = Date.now().toString();
    
    //hashing the password to bcrypt
    let userHashPassword = await genBcrypt("create", password);
    
    try {
        //Inserting user's data
        const insertUser = await usersTB.create({
            username: username,
            password: userHashPassword,
            email: email,
            role: "user",
            joinDate: createdTime
        });

        if(insertUser){
            const userData = {
                username: username,
                email:  email,
                id: insertUser.userid,
                profilePic: "/api/v1/profilePics/ProfileDefault.png",
                role: "user"
            };
            
            //Creating token
            const token = jwt.sign(userData, process.env.JWT_SECRET);
            return [null, token];
        }

    } catch (err) {
        const error = {message: "An error accoured", success: false, code: 500};
        return [error, null];
    }
};

async function revoke_token(req) {
    try {
        //validating the cookie's value to insert only valid jwt token to dead_sessions table
        jwt.verify(req.cookies.token, process.env.JWT_SECRET);

        const revokeToken = await dead_sessionsTB.create({
            session: req.cookies.token,
            timestamp: Date.now().toString()
        });

    } catch (error) {
        console.log("Invalid token. Could not revoke token");
        return;
    }
};

async function check(token) {
    //checking if the token is a revoked token
    const isRevokedToken = await dead_sessionsTB.findOne({
        where: {
            session: token
        }
    });

    return isRevokedToken;
}

module.exports = {
    login,
    signup,
    revoke_token,
    check
}