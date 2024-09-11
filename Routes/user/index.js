const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const upload = require("../../middlewares/upload");
const emailValidator = require("email-validator");
const jwt = require('jsonwebtoken');
const { usersTB, blogsTB } = require("../../database");

function sendResponse(data, resp){
    resp.setHeader("Content-Type", "application/json");
    resp.send(JSON.stringify(data));
    resp.end();
}

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
        profilePic: getUserData.dataValues.profilePic
    };

    sendResponse(userData, resp);
    return
})

router.put("/updateInfo", async (req, resp) => {
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    var { username, email} = req.body;
    var usernameUpdated = false;
    var emailUpdated = false;

    if(username == undefined || email == undefined){
        const message = {"state": "failed", "message": "All fields required"};
        sendResponse(message, resp);
        return
    }

    //Checking for previes data to prevent temp query to database
    if(username == userInfo.username && email == userInfo.email){
        const message = {"state": "success", "message": "Nothing changed!"};
        sendResponse(message, resp);
        return
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
        const data = {"message": "Maximum length for username is 24 character", "state": "failed"};
        sendResponse(message, resp);
        return
    }

    if(username !== userInfo.username){
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
                    username: userInfo.username
                }
            }).then(() => {usernameUpdated = true;})
        } catch (error) {
            const message = {"state": "failed", "message": "Couldn't update username"};
            sendResponse(message, resp);
            return
        }

    }

    if(email != userInfo.email){
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
                    email: userInfo.email
                }
            }).then(() => {emailUpdated = true})
        } catch (error) {
            const message = {"state": "failed", "message": "Couldn't update email"};
            sendResponse(message, resp);
            return
        }

    }

    if(usernameUpdated || emailUpdated){
        const message = {"state": "success", "message": "Data updated successfully"};
        var newUserData = {}
        const userData = await usersTB.findOne({
            where: {
                username: username
            }
        })
        newUserData.username = userData.username;
        newUserData.email = userData.email;
        newUserData.id = userData.userid;
        newUserData.role = userData.role;

        const token = jwt.sign(newUserData, process.env.JWT_SECRET,{
            expiresIn: "1h"
        });
        resp.cookie("token", token, {httpOnly: true, sameSite: 'lax'});
        sendResponse(message, resp);
        return
    }
})

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
            const blogData = await blogsTB.findOne({
                where: {
                    blog_id: blogsArray[i],
                    is_public: 1
                }
            })
            //pass if the blog is deleted
            if(blogData == null){
                continue
            }
            const userBLogData = await usersTB.findOne({
                where: {
                    userid: blogData.dataValues.userid
                }
            })

            blogsInfo.user = {username: userBLogData.dataValues.username, profilePic: userBLogData.profilePic};
            blogsInfo.content = blogData.dataValues
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
            const blogData = await blogsTB.findOne({
                where: {
                    blog_id: blogsArray[i],
                    is_public: 1
                }
            })
            if(blogData == null){
                continue
            }
            const userBLogData = await usersTB.findOne({
                where: {
                    userid: blogData.dataValues.userid
                }
            })

            blogsInfo.user = {username: userBLogData.dataValues.username, profilePic: userBLogData.profilePic};
            blogsInfo.content = blogData.dataValues
            likedBlogsList.push(blogsInfo)
        }
        return likedBlogsList;
    }
    var blogsContent = await getBlogsData();
    sendResponse({state: "success", content: blogsContent}, resp);
})

module.exports = router;