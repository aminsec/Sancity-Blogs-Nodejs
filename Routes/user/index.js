const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const upload = require("../../middlewares/upload");
const emailValidator = require("email-validator");
const jwt = require('jsonwebtoken');
const { usersTB, blogsTB, dead_sessionsTB, sequelize, notificationsTB } = require("../../database");
const { sendResponse } = require("../../utils/opt");
const { validateBlogInfo } = require("../../utils/validate");

router.get("/info", async(req, resp) => {
    const token = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const getUserData = await usersTB.findOne({
        where: {
            username: token.username
        }
    })
    var userData = {
        userid: getUserData.dataValues.userid,
        username: getUserData.dataValues.username,
        email: getUserData.dataValues.email,
        joinDate: getUserData.dataValues.joinDate,
        role: getUserData.dataValues.role,
        profilePic: getUserData.dataValues.profilePic,
        bio: getUserData.dataValues.bio,
        token: req.cookies.token
    };
    
    sendResponse(userData, resp);
    return
})

router.put("/updateInfo", async (req, resp) => {
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    var { username, email, bio } = req.body;
    var usernameUpdated = false;
    var emailUpdated = false;
    var bioUpdated = false;

    if(username == undefined || email == undefined || bio == undefined){
        const message = {"state": "failed", "message": "All fields required"};
        sendResponse(message, resp);
        return
    }

    //Checking for previes data to prevent temp query to database
    if(username == userInfo.username){
        usernameUpdated = true;
    }
    if(email == userInfo.email){
        emailUpdated = true;
    }

    //Validating email
    const validEmail = emailValidator.validate(email);
    if(!validEmail){
        sendResponse({state: "failed", message: "Invalid email"}, resp);
        return
    }

    if(username == "" || email == ""){
        const message = {"state": "failed", "message": "Fields can not be empty"};
        sendResponse(message, resp);
        return
    }

    if(username.length > 24){
        const message = {"message": "Maximum length for username is 24 character", "state": "failed"};
        sendResponse(message, resp);
        return
    }

    if(bio.length > 250){
        const message = {"message": "Maximum length for bio is 250 character", "state": "failed"};
        sendResponse(message, resp);
        return
    }

    //Updating username if the username was not the same as in token
    if(usernameUpdated == false){
        //Checking username exist or not
        const isNewUsernameExist = await usersTB.findOne({
            where: {
                username: username
            }
        })

        if(isNewUsernameExist){
            const message = {"state": "failed", "message": "This username exist"};
            sendResponse(message, resp);
            return
        }

        //Updating username
        try {
            await usersTB.update({
                username: username
            }, {
                where: {
                    userid: userInfo.id
                }
            }).then(() => {usernameUpdated = true;})
        } catch (error) {
            const message = {"state": "failed", "message": "Couldn't update username"};
            sendResponse(message, resp);
            return
        }
    }

    //Updating email if the username was not the same as in token
    if(emailUpdated == false){
        const isNewEmailExist = await usersTB.findOne({
            where: {
                email: email
            }
        })

        if(isNewEmailExist){
            const message = {"state": "failed", "message": "This email exist"};
            sendResponse(message, resp);
            return
        }

        try {
            await usersTB.update({
                email: email
            }, {
                where: {
                    userid: userInfo.id
                }
            }).then(() => {emailUpdated = true})
        } catch (error) {
            const message = {"state": "failed", "message": "Couldn't update email"};
            sendResponse(message, resp);
            return
        }
    }

    //Updating Bio
    try {
        const updateBio = await usersTB.update({
            bio: bio
        }, {
            where: {
                userid: userInfo.id
            }
        });

        if(updateBio){
            bioUpdated = true;
        }
    } catch (error) {
        const message = {"state": "failed", "message": "Couldn't update bio"};
        sendResponse(message, resp);
        return
    }

    if(usernameUpdated && emailUpdated && bioUpdated){
        const message = {"state": "success", "message": "Data updated successfully"};
        //Generating new token
        var newToken = {};
        
        newToken.username = username;
        newToken.email = email;
        newToken.id = userInfo.id;
        newToken.role = userInfo.role;
        newToken.profilePic = userInfo.profilePic;

        const token = jwt.sign(newToken, process.env.JWT_SECRET,{
            expiresIn: "1h"
        });
        resp.cookie("token", token, {httpOnly: true, sameSite: 'lax'});
        sendResponse(message, resp);
        return
    }
});

router.post("/upload", upload.single('profilePic'), async (req, resp)=> {
    const userProfilePic = "/api/v1/profilePics/" + req.file.filename;
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const updateProfilePic = await usersTB.update({
        profilePic: userProfilePic
    }, {
        where: {
            userid: userInfo.id
        }
    })
    //setting new profile pic to user token
    userInfo.profilePic = userProfilePic;
    const token = jwt.sign(userInfo, process.env.JWT_SECRET);
    resp.cookie("token", token, {httpOnly: true, sameSite: 'lax'});
    if(updateProfilePic){
        sendResponse({state: "success", message: "Profile picture updated successfully"}, resp);
        return
    }else{
        sendResponse({state: "failed", message: "Couldn't update profile picture"}, resp);
        return
    }
})

router.put("/changePassword", async (req, resp) => {
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const { newPass, oldPass} = req.body;
    let userNewHashPassword = crypto.createHash('md5').update(newPass).digest("hex"); //hashing the password to md5
    let userOldHashPassword = crypto.createHash('md5').update(oldPass).digest("hex"); //hashing the password to md5

    if(newPass === undefined || oldPass == undefined){
        const data = {"message": "All fields required", "success": false};
        sendResponse(data, resp);
        return
    }

    if(newPass == "" || oldPass == ""){  
        const data = {"message": "Passwords can not be empty", "success": false};
        sendResponse(data, resp);
        return
    }

    const isPasswordCorrect = await usersTB.findOne({
        where: {
            username: userInfo.username,
            password: userOldHashPassword
        }
    })

    if(!isPasswordCorrect){
        const data = {"message": "Current password is incorrect", "state": "failed"};
        sendResponse(data, resp);
        return
    }

    const updatePassword = await usersTB.update({
        password: userNewHashPassword
    }, {
        where: {
            username: userInfo.username
        }
    })

    if(updatePassword){
        const data = {"message": "Password updated successfully", "state": "success"};
        sendResponse(data, resp);
        return
    }
})



router.get("/favorites", async (req, resp) => {
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    //Getting user saved posts lists
    const favoriteBlogs = await usersTB.findOne({
        attributes: ["savedPosts"],
        where: {
            userid: userInfo.id
        }
    })
    const blogs = favoriteBlogs.dataValues.savedPosts;
    var blogsArray = blogs.split(",");
    //removing 0 item from lists that is default value of savedPosts column in DB
    const indexOfDefaultValue = blogsArray.indexOf("0");
    if(indexOfDefaultValue > -1){
        blogsArray.splice(indexOfDefaultValue, 1);
    }
    //If the list is empty, we show a null message
    if(blogsArray.length == 0){
        sendResponse({"state": "failed", "message": "Nothing to show"}, resp);
        return;
    }
    //Getting each blog info
    const getBlogsData = async () => {
        var savedBlogsList = [];
        for(var i = 0; i < blogsArray.length; i++){
            var blogsInfo = {}
            const getBlogData = await blogsTB.findOne({
                where: {
                    blog_id: blogsArray[i],
                    is_public: 1
                }
            })
            //pass if the blog is deleted
            if(getBlogData == null){
                continue
            }

            var blogData = await validateBlogInfo(getBlogData.dataValues);
            const userBLogData = await usersTB.findOne({
                where: {
                    userid: blogData.userid
                }
            })

            const blogUserInfo = {
                userid: userBLogData.dataValues.userid,
                username: userBLogData.dataValues.username, 
                profilePic: userBLogData.dataValues.profilePic
            }
            blogsInfo.user = blogUserInfo;
            blogsInfo.content = blogData;
            savedBlogsList.push(blogsInfo)
        

        }
        return savedBlogsList
    }
    var blogsContent = await getBlogsData();
    sendResponse({state: "success", content: blogsContent}, resp);
})

router.get("/likes", async (req, resp) => {
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    //Getting user liked posts list
    const likedBlogs = await usersTB.findOne({
        attributes: ["likedPosts"],
        where: {
            userid: userInfo.id
        }
    })
    const blogs = likedBlogs.dataValues.likedPosts;
    var blogsArray = blogs.split(",");
    //removing 0 item from lists that is default value of savedPosts column in DB
    const indexOfDefaultValue = blogsArray.indexOf("0");
    if(indexOfDefaultValue > -1){
        blogsArray.splice(indexOfDefaultValue, 1);
    }
    //If the list is empty, we show a null message
    if(blogsArray.length == 0){
        sendResponse({"state": "failed", "message": "Nothing to show"}, resp);
        return;
    }
    //Getting each blog info
    const getBlogsData = async () => {
        var likedBlogsList = [];
        for(var i = 0; i < blogsArray.length; i++){
            var blogsInfo = {}
            const getBlogData = await blogsTB.findOne({
                where: {
                    blog_id: blogsArray[i],
                    is_public: 1
                }
            })
            if(getBlogData == null){
                continue
            }

            var keysToExtractFromBlog = ["blog_content", "blog_id", "blog_image", "blog_title", "is_public", "userid", "isCommentOff", "showLikes", "likes", "createdAt", "tags"];
            var blogData = checkBlogInfo(getBlogData.dataValues, keysToExtractFromBlog);
            const userBLogData = await usersTB.findOne({
                where: {
                    userid: blogData.userid
                }
            })

            const blogUserInfo = {
                userid: userBLogData.dataValues.userid,
                username: userBLogData.dataValues.username, 
                profilePic: userBLogData.dataValues.profilePic
            };

            blogsInfo.user = blogUserInfo;
            blogsInfo.content = blogData;
            likedBlogsList.push(blogsInfo)
        }
        return likedBlogsList;
    }
    var blogsContent = await getBlogsData();
    sendResponse({state: "success", content: blogsContent}, resp);
});

router.delete("/deleteAccount", async (req, resp) => {
    const { token } = req.cookies
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const { password, confirm_password } = req.body;

    if(!password || !confirm_password){
        const message = {state: "failed", message: "All fields required"};
        sendResponse(message, resp);
        return
    }

    const passwordHash = crypto.createHash('md5').update(password).digest('hex');
    const confirm_passwordHash = crypto.createHash('md5').update(confirm_password).digest('hex');

    if(passwordHash !== confirm_passwordHash){
        const message = {state: "failed", message: "Passwords does not match"};
        sendResponse(message, resp);
        return
    }

    //Checking if password is correct 
    const getUserInfo = await usersTB.findOne({
        attributes: ["password"],
        where: {
            userid: userInfo.id
        }
    });
    if(getUserInfo){
        const userPassword = getUserInfo.dataValues.password;
        if(userPassword !== passwordHash){
            const message = {state: "failed", message: "Incorrect password"};
            sendResponse(message, resp);
            return
        }
    }

    //Getting all tables name to delete all records with just one command
    const allTablesName = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'sancity'", {type: sequelize.QueryTypes.SELECT});
    const blackListTables = ["dead_sessions"];

    const deleteAccount = async () => {
        for(index in allTablesName){
            const tableName = allTablesName[index].TABLE_NAME;
            if(blackListTables.includes(tableName)){
                continue
            }
            const deleteUserAccount = await sequelize.query(`delete from ${tableName} where userid = ${userInfo.id}`, {type: sequelize.QueryTypes.DELETE});
        }
        //Deleting user notification where user's id matches with acted_userid column
        notificationsTB.destroy({
            where: {
                acted_userid: userInfo.id
            }
        })

    }
    await deleteAccount();
    //revoking session
    const revokeSession = await dead_sessionsTB.create({
        session: token
    });

    const message = {state: "success", message: "Account deleted succussfully"};
    sendResponse(message, resp);
});

module.exports = router;