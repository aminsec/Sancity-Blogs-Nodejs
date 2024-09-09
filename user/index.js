const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const upload = require("../middlewares/upload");
var emailValidator = require("email-validator");
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { commentsTB, usersTB, blogsTB } = require("../database");

function sendResponse(data, resp){
    resp.setHeader("Content-Type", "application/json");
    resp.send(JSON.stringify(data));
    resp.end();
}

function removeItemFromArray(array, item){
    const indexOfItem = array.indexOf(item);
    if (indexOfItem > -1){
        array.splice(indexOfItem, 1);
    }
    return array
}

function validateUserInputAsNumber(value) {
    value = value.toString();
    const validBlogNumberRG =  new RegExp('^[0-9]+$'); //This regex gets only numbers
    const isValidBlogNumber = value.match(validBlogNumberRG);
    if(isValidBlogNumber){
        return true
    }
    return false
}

router.get("/info", async(req, resp) => {
    const token = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const userData = await usersTB.findOne({
        where: {
            username: token.username
        }
    })
    delete userData.dataValues.password;
    delete userData.dataValues.savedPosts;
    delete userData.dataValues.likedPosts;
    sendResponse(userData, resp);
})

router.put("/updateInfo", async (req, resp) => {
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    var { username, email} = req.body;
    var usernameUpdated = false;
    var emailUpdated = false;

    if(username == undefined || email == undefined){
        const message = {"state": "failed", "message": "All fields required"};
        resp.setHeader("Content-Type", "application/json");
        resp.send(JSON.stringify(message));
        resp.end();
    }

    //Checking for previes data to prevent temp query to database
    if(username == userInfo.username && email == userInfo.email){
        const message = {"state": "success", "message": "Nothing changed!"};
        resp.setHeader("Content-Type", "application/json");
        resp.send(JSON.stringify(message));
        resp.end();
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
        resp.setHeader("Content-Type", "application/json");
        resp.send(JSON.stringify(message));
        resp.end();
        return
    }

    if(username.length > 24){
        const data = {"message": "Maximum length for username is 24 character", "state": "failed"};

        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
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
            resp.setHeader("Content-Type", "application/json");
            resp.send(JSON.stringify(message));
            resp.end();
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
            resp.setHeader("Content-Type", "application/json");
            resp.send(JSON.stringify(message));
            resp.end();
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
            resp.setHeader("Content-Type", "application/json");
            resp.send(JSON.stringify(message));
            resp.end();
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
            resp.setHeader("Content-Type", "application/json");
            resp.send(JSON.stringify(message));
            resp.end();
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
        resp.setHeader("Content-Type", "application/json");
        resp.send(JSON.stringify(message));
        resp.end();
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
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    if(newPass == "" || oldPass == ""){  
        const data = {"message": "Passwords can not be empty", "success": false};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
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
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
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
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }
})



router.get("/blogs", (req, resp) => {
    var blogs = []
    const token = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    blogsTB.findAll({
        where: {
            userid: token.id
        }
    }).then(res => {
        for(var i = 0; i < res.length; i++){
            blogs.push(res[i].dataValues)
        }
        const data = {"state": "success", user: {username: token.username, profilePic: token.profilePic, userid: token.id}, data: blogs};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }).catch(() => {
        const data = {"message": "Couldn't get blogs", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    })
})

router.get("/blogs/:blogId", async (req, resp) => {
    var { blogId } = req.params;
    const token = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    //Checking if the blogId is number
    if(!validateUserInputAsNumber(blogId)){
        sendResponse({"state": "failed", "message": "Not found"}, resp);
        return
    }

    const blog = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            userid: token.id
        }
    })
    
    if(blog !== null){
        //Getting the user liked posts to see if the user has liked this post
        const userLikes = await usersTB.findAll({
            attributes: ["likedPosts"],
            where: {
                userid: token.id
            }
        })
     
        const likesData = userLikes[0].dataValues.likedPosts;
        const likes = likesData.split(",");
        if(likes.includes(blogId.toString())){
           blog.dataValues.isLiked = true
        }

        const userSaveds = await usersTB.findAll({
            attributes: ["savedPosts"],
            where: {
                userid: token.id
            }
        })
        const savesData = userSaveds[0].dataValues.savedPosts;
        const saves = savesData.split(",");
        if(saves.includes(blogId.toString())){
            blog.dataValues.isSaved = true
        }

        const data = {"state": "success", "user": {username: token.username, profilePic: token.profilePic, userid: token.id}, "data": blog.dataValues};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }else{
        const data = {"state": "failed", "message": "Not found"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }
})

//Deleting blogs
router.delete("/blogs/:blogId", async (req, resp) => {
    const { blogId } = req.params;
    const isValidBlogNumber = validateUserInputAsNumber(blogId)
    if(!isValidBlogNumber){
        const data = {"state": "failed", "message": "Invalid blog number"};
        sendResponse(data, resp);
        return
    }

    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const deletBlog = await blogsTB.destroy({
        where: {
            blog_id: blogId,
            userid: userInfo.id
        }
    })

   if(deletBlog){
        const data = {"state": "success", "message": "Blog deleted successfully"}
        sendResponse(data, resp)
   }else{
    const data = {"state": "failed", "message": "Couldn't delete blog"}
    sendResponse(data, resp)
   }

})

router.get("/blogs/:blogId/like", async (req, resp) => {
    var { blogId } = req.params;
    var user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const checkBlogAccessble = await blogsTB.findOne({
        where: {
            blog_id: blogId
        }
    })
    var blogInfo = checkBlogAccessble.dataValues;
    if(blogInfo.userid !== user.id && blogInfo.is_public == 0){
        sendResponse({"state": "failed", "message": "Couldn't like or dislike blog"}, resp)
    }else{
        //Getting user liked posts. If user already liked the posts, we decrease, else we increase the likes
        const userLikedPosts = await usersTB.findAll({
            attributes: ["likedPosts"],
            where: {
                userid: user.id
            }
        })
        var likedPosts = userLikedPosts[0].dataValues.likedPosts
        var likedPostsLists = likedPosts.split(",")
        //Checking if user has liked the current post
        if(likedPostsLists.includes(blogId)){
            //If user has liked the current post, it means user wants to dislike it, so we remove the blog id from user's likedPosts list
            var newLikedPostsList = []
            for(var i = 0; i < likedPostsLists.length; i++){
                if(likedPostsLists[i] == blogId){
                    continue
                }else{
                    newLikedPostsList.push(likedPostsLists[i])
                }
            }
            //updating user's liked posts list 
            var updatedLikedPostsList = newLikedPostsList.join(",");
            const disliked = await usersTB.update({
                likedPosts: updatedLikedPostsList,
                }, {
                    where: {
                        userid: user.id
                    }
                })

            if(disliked){
                //getting current blog's likes 
                const blogInfo = await blogsTB.findOne({
                    where: {
                        blog_id: blogId
                    }
                })
                const blogLikes = blogInfo.dataValues.likes;
                //Updating blog's likes - 1
                const decreaseLike = await blogsTB.update({
                    likes: blogLikes - 1
                },
                {
                    where: {
                        blog_id: blogId
                    }
                })
                if(decreaseLike){
                    sendResponse({"state": "success", "message": "Blog disliked successfully"}, resp)
                }else{
                    sendResponse({"state": "failed", "message": "Coulndn't dislike blog"}, resp)
                }
                
            }else{
                sendResponse({"state": "failed", "message": "Coulndn't dislike blog"}, resp)
            }

        }else{

            likedPostsLists.push(blogId)
            var updatedLikedPostsList = likedPostsLists.join(",");
            const liked = await usersTB.update(
                {
                    likedPosts: updatedLikedPostsList,
                }, 
                {
                    where: {
                        userid: user.id
                    }
                }
            )
            if(liked){
                //getting current blog's likes 
                const blogInfo = await blogsTB.findOne({
                    where: {
                        blog_id: blogId
                    }
                })
                const blogLikes = blogInfo.dataValues.likes;
                const increaseLikes = await blogsTB.update({
                    likes: blogLikes + 1
                },
                {
                    where: {
                        blog_id: blogId
                    }
                })
                if(increaseLikes){
                    sendResponse({"state": "success", "message": "Blog liked successfully"}, resp)
                }
            }else{
                sendResponse({"state": "failed", "message": "Coulndn't like blog"}, resp)
            }
        }
    }
})

router.get("/blogs/:blogId/save", async (req, resp) => {
    var { blogId } = req.params;
    var user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const checkBlogAccessble = await blogsTB.findOne({
        where: {
            blog_id: blogId
        }
    })
    if(checkBlogAccessble == null){
        sendResponse({"state": "failed", "message": "Couldn't save blog"}, resp);
        return
    }
    var blogInfo = checkBlogAccessble.dataValues;
    //Preventing user to do not save the blogs that are private by other users
    if(blogInfo.userid !== user.id && blogInfo.is_public == 0){
        sendResponse({"state": "failed", "message": "Couldn't save blog"}, resp);
        return
    }else{
        //Getting user saved posts. If user already saved the posts, we remove it, else we add it to the list
        const userSavedPosts = await usersTB.findAll({
            attributes: ["savedPosts"],
            where: {
                userid: user.id
            }
        })
        var savedPosts = userSavedPosts[0].dataValues.savedPosts
        var savedPostsLists = savedPosts.split(",")
        if(savedPostsLists.includes(blogId)){
            //If user has saved the current post, it means user wants to unsave it, so we remove the blogid from user's saved list
            var newSavedPostsList = []
            for(var i = 0; i < savedPostsLists.length; i++){
                if(savedPostsLists[i] == blogId){
                    continue
                }else{
                    newSavedPostsList.push(savedPostsLists[i])
                }
            }
            var updatedSavedPostsList = newSavedPostsList.join(",");
            const unsaved = await usersTB.update({
                savedPosts: updatedSavedPostsList,
                }, {
                    where: {
                        userid: user.id
                    }
                })
            if(unsaved){
                sendResponse({"state": "success", "message": "Blog unsaved"}, resp)
            }else{
                sendResponse({"state": "failed", "message": "Couldn't unsave blog"}, resp)
            }
        }else{
            savedPostsLists.push(blogId);
            var updatedSavedPostsList = savedPostsLists.join(",");
            const saved = await usersTB.update(
                {
                    savedPosts: updatedSavedPostsList,
                }, 
                {
                    where: {
                        userid: user.id
                    }
                }
            )
            if(saved){
                sendResponse({"state": "success", "message": "Blog saved successfully"}, resp);
            }else{
                sendResponse({"state": "failed", "message": "Couldn't save blog"}, resp);
            }
        }
    }
})

router.put("/blogs/:blogId/update", async (req, resp) => {
    var { blogId } = req.params;
    //validating user input to get only numbers
    const isValidBlogNumber = validateUserInputAsNumber(blogId);
    if(!isValidBlogNumber){
        const data = {"state": "failed", "message": "Invalid blog number"};
        sendResponse(data, resp);
        return
    }
    var { bannerPic, title, body, tags, option} = req.body;
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

    if(title === undefined || body === undefined || tags === undefined || option === undefined || bannerPic === undefined){
        const data = {"message": "All fields required", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    if(title == "" || body == ""){
        const data = {"message": "Fields can not be empty", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    if(!option.hasOwnProperty("is_public") || !option.hasOwnProperty("commentsOff") || !option.hasOwnProperty("showLikes")){
        const data = {"message": "Invalid options", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }
    
    if(typeof option.is_public !== "boolean" || typeof option.commentsOff !== "boolean" || typeof option.showLikes !== "boolean"){
        const data = {"message": "Invalid options input", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    //Preventing DOS
    if(tags.length > 255){
        sendResponse({state: "failed", message: "Tags are too long"}, resp);
        return
    }

    if(tags != ""){
        if(tags[0] != "#"){
            const data = {"message": "Tags must start with '#'", "state": "failed"};
            resp.setHeader("content-type", "application/json");
            resp.send(JSON.stringify(data));
            resp.end();
            return
        }
        var tagsValue = tags.split("#");
        tagsValue.splice(0, 1);
        var validTagRegex = new RegExp("^[a-zA-Z0-9]+$");
        for(var i = 0; i < tagsValue.length; i++){
            if(!tagsValue[i].match(validTagRegex)){
                const data = {"message": "Just numbers and characters are allowed as tag value", "state": "failed"};
                sendResponse(data, resp);
                return
            }
        }
    }

    if(body.length < 100){
        const data = {"message": "Body must be at least 100 character", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    if(bannerPic){
        const base64Data = bannerPic.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        let randomFileName = crypto.createHash('md5').update((Date.now() + Math.random()).toString()).digest("hex")
        var blog_image = "/api/v1/profilePics/" + randomFileName;
        const filePath = path.join("/var/www/html/api/", 'uploads', `${randomFileName}`);
        fs.writeFile(filePath, buffer, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }
    
    const updateBlog = await blogsTB.update({
        blog_title: title,
        blog_image: blog_image,
        blog_content: body,
        tags: tags,
        is_public: option.is_public,
        isCommentOff: option.commentsOff,
        showLikes: option.showLikes
    }, {
        where: {
            blog_id: blogId,
            userid: userInfo.id
        }
    })


    if(updateBlog[0] == 1 || updateBlog[0] == 0){
        console.log(updateBlog)
        const data = {"message": "Blog edited successfully", "state": "success"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }else{
        console.log(updateBlog)
        const data = {"message": "Couldn't update blog", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }
})

router.post("/blogs/new", async (req, resp) => {
    var { bannerPic, title, body, tags, option} = req.body;
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

    if(title === undefined || body === undefined || tags === undefined || option === undefined || bannerPic === undefined){
        const data = {"message": "All fields required", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    if(title == "" || body == ""){
        const data = {"message": "Fields can not be empty", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    if(!option.hasOwnProperty("is_public") || !option.hasOwnProperty("commentsOff") || !option.hasOwnProperty("showLikes")){
        const data = {"message": "Invalid options", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }
    
    if(typeof option.is_public !== "boolean" || typeof option.commentsOff !== "boolean" || typeof option.showLikes !== "boolean"){
        const data = {"message": "Invalid options input", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    //Preventing DOS
    if(tags.length > 255){
        sendResponse({state: "failed", message: "Tags are too long"}, resp);
        return
    }

    if(tags != ""){
        if(tags[0] != "#"){
            const data = {"message": "Tags must start with '#'", "state": "failed"};
            resp.setHeader("content-type", "application/json");
            resp.send(JSON.stringify(data));
            resp.end();
            return
        }
        var tagsValue = tags.split("#");
        tagsValue.splice(0, 1);
        var validTagRegex = new RegExp("^[a-zA-Z0-9]+$");
        for(var i = 0; i < tagsValue.length; i++){
            if(!tagsValue[i].match(validTagRegex)){
                const data = {"message": "Just numbers and characters are allowed as tag", "state": "failed"};
                sendResponse(data, resp);
                return
            }
        }
    }

    if(body.length < 100){
        const data = {"message": "Body must be at least 100 character", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    }

    if(bannerPic){
        const base64Data = bannerPic.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        let randomFileName = crypto.createHash('md5').update((Date.now() + Math.random()).toString()).digest("hex")
        var blog_image = "/api/v1/profilePics/" + randomFileName;
        const filePath = path.join("/var/www/html/api/", 'uploads', `${randomFileName}`);
        fs.writeFile(filePath, buffer, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }

    //Getting blog created time
    var datetime = new Date();
    var createdTime = datetime.toISOString().slice(0,10);

    try {
        const insertBlog = await blogsTB.create({
            userid: userInfo.id,
            blog_content: body, 
            blog_image: blog_image,
            blog_title: title,
            tags: tags,
            is_public: option.is_public,
            isCommentOff: option.commentsOff,
            showLikes: option.showLikes,
            createdAt:createdTime
        })
        const data = {"message": "Blog added successfully", "state": "success"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
        return
    } catch (error) {
        const data = {"message": "Couldn't add blog", "state": "failed"};
        resp.setHeader("content-type", "application/json");
        resp.send(JSON.stringify(data));
        resp.end();
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

router.get("/comments/:commentId/like", async (req, resp) => {
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const { commentId } = req.params;
    var messageToSend = {};

    //Checking user input
    if(!validateUserInputAsNumber(commentId)){
        sendResponse({state: "failed", message: "Invalid comment Id"}, resp);
        return
    }

    //Checking is comment exist or not
    const isCommentExist = await commentsTB.findOne({
        where: {
            commentId: commentId
        }
    })
    if(!isCommentExist){
        sendResponse({state: "failed", message: "Comment not found"}, resp);
        return
    }
    
    //Getting list of comments user has liked
    const getLikedComments = await usersTB.findOne({
        attributes: ["likedComments"],
        where: {
            userid: userInfo.id
        }
    })
    if(getLikedComments){
        var likedComments = getLikedComments.dataValues.likedComments;
        var commentsId = likedComments.split(",");
        if(commentsId.includes(commentId)){
            commentsId = removeItemFromArray(commentsId, commentId); //If the comment has been liked, we remove it from the list
            //Decreasing the likes of comment
            const getLikesOfcomment = await commentsTB.findOne({
                where: {
                    commentId: commentId
                }
            })
            var likesOfComment = getLikesOfcomment.dataValues.commentLikes;
            console.log("The likes: ", likesOfComment)
            likesOfComment -= 1;
            //Inserting updated likes 
            const updateLikesOfComment = await commentsTB.update({
                commentLikes: likesOfComment
            }, 
            {
                where: {
                    commentId: commentId
                }
            })
            if(updateLikesOfComment){
                messageToSend = {state: "success", message: "Comment disliked successfully"};
            }
            
        }else{
            commentsId.push(commentId); //If the comment is not in the list, we add it
            //Increasing the likes of comment
            const getLikesOfcomment = await commentsTB.findOne({
                where: {
                    commentId: commentId
                }
            })
            var likesOfComment = getLikesOfcomment.dataValues.commentLikes;
            likesOfComment += 1;
            //Inserting updated likes 
            const updateLikesOfComment = await commentsTB.update({
                commentLikes: likesOfComment
            }, 
            {
                where: {
                    commentId: commentId
                }
            })
            if(updateLikesOfComment){
                messageToSend = {state: "success", message: "Comment liked successfully"};
            }  
        }
        
        var newCommentsId = commentsId.join(",");
        const insertNewComments = await usersTB.update({
            likedComments: newCommentsId,
          },
          {
            where: {
                userid: userInfo.id
            }
          }
        )
        if(insertNewComments){
            sendResponse(messageToSend, resp);
            return
        }
    }
})

router.post("/comments/:blogId/addComment", async (req, resp) => {
    var { blogId } = req.params;
    var { comment } = req.body;
    var userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    var invalidInputRegex = new RegExp("^\\s+$");

    if(comment == ""){
        sendResponse({state: "failed", message: "Leave a valid comment"}, resp);
        return
    }
    
    if(comment.match(invalidInputRegex)){
        sendResponse({state: "failed", message: "Leave a valid comment"}, resp);
        return
    }

    if(comment.length > 276){
        sendResponse({state: "failed", message: "Comment is too long"}, resp);
        return
    }

    //Checking blog is public and commentable 
    const isPublic = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            is_public: 1,
            isCommentOff: 0
        }
    })
    //Return if blog is not found or is not public or comments are off
    if(isPublic == null){
        sendResponse({state: "failed", message: "Blog not found"}, resp);
        return
    }
    
    //Getting comment time 
    var datetime = new Date();
    var createdTime = datetime.toISOString().slice(0,10);

    const addComment = await commentsTB.create({
        blog_id: blogId,
        comment_text: comment,
        commentedAt: createdTime,
        userid: userInfo.id
    })

    if(addComment){
        sendResponse({state: "success", message: "Comment added successfully"}, resp);
        return
    }
})

router.delete("/comments/:commentId/delete", async (req, resp) => {
    const { commentId } = req.params;
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

    if(!validateUserInputAsNumber(commentId)){
        sendResponse({state: "failed", message: "Comment not found"}, resp);
        return
    }

    const checkIsDeletable = await commentsTB.findOne({
        where: {
            commentId: commentId,
            userid: userInfo.id
        }
    });
    if(checkIsDeletable){
        const deleteComment = await commentsTB.destroy({
            where: {
                commentId: commentId,
                userid: userInfo.id
            }
        })
        if(deleteComment){
            sendResponse({state: "success", message: "Comment deleted successfully"}, resp);
            return
        }

    }else{
        sendResponse({state: "failed", message: "Comment not found"}, resp);
        return
    }

})

module.exports = router;