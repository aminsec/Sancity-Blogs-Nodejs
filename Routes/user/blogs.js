const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { usersTB, blogsTB } = require("../../database");
const { validateUserInputAsNumber } = require("../../utils/functions");
const { sendResponse } = require("../../utils/functions");
const { createNotification } = require("../../utils/functions");

router.get("/", (req, resp) => {
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
        sendResponse(data, resp);
        return
    }).catch(() => {
        const data = {"message": "Couldn't get blogs", "state": "failed"};
        sendResponse(data, resp);
        return
    })
});

router.post("/new", async (req, resp) => {
    var { bannerPic, title, body, tags, option} = req.body;
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

    if(title === undefined || body === undefined || tags === undefined || option === undefined || bannerPic === undefined){
        const data = {"message": "All fields required", "state": "failed"};
        sendResponse(data, resp);
        return
    }

    if(title == "" || body == ""){
        const data = {"message": "Fields can not be empty", "state": "failed"};
        sendResponse(data, resp);
        return
    }

    if(!option.hasOwnProperty("is_public") || !option.hasOwnProperty("commentsOff") || !option.hasOwnProperty("showLikes")){
        const data = {"message": "Invalid options", "state": "failed"};
        sendResponse(data, resp);
        return
    }
    
    if(typeof option.is_public !== "boolean" || typeof option.commentsOff !== "boolean" || typeof option.showLikes !== "boolean"){
        const data = {"message": "Invalid options input", "state": "failed"};
        sendResponse(data, resp);
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

            sendResponse(data, resp);

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
        sendResponse(data, resp);
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
        sendResponse(data, resp);
        return
    } catch (error) {
        const data = {"message": "Couldn't add blog", "state": "failed"};
        sendResponse(data, resp);
        return
    }
});

router.get("/:blogId", async (req, resp) => {
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
        sendResponse(data, resp);
        return
    }else{
        const data = {"state": "failed", "message": "Not found"};
        sendResponse(data, resp);
        return
    }
})

//Deleting blogs
router.delete("/:blogId", async (req, resp) => {
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

router.get("/:blogId/like", async (req, resp) => {
    var { blogId } = req.params;
    var user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const checkBlogAccessble = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            is_public: 1
        }
    });
    if(checkBlogAccessble == null){
        sendResponse({"state": "failed", "message": "Couldn't like blog"}, resp);
        return
    }

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
                sendResponse({"state": "success", "message": "Blog liked successfully"}, resp);
                //Sending notification to user
                const notifInfo = {
                    userid: checkBlogAccessble.dataValues.userid,
                    notif_title: `${user.username} liked your blog`,
                    acted_userid: user.id,
                    action_name: "liked_blog",
                    blog_id: checkBlogAccessble.dataValues.blog_id
                }
                if(notifInfo.userid !== notifInfo.acted_userid){ // preventing users to sending notifications to theirselves
                    createNotification(notifInfo);
                    return
                }
            }
        }else{
            sendResponse({"state": "failed", "message": "Coulndn't like blog"}, resp)
        }
    }

})

router.get("/:blogId/save", async (req, resp) => {
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
});

router.put("/:blogId/update", async (req, resp) => {
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
        sendResponse(data, resp);
        return
    }

    if(title == "" || body == ""){
        const data = {"message": "Fields can not be empty", "state": "failed"};
        sendResponse(data, resp);
        return
    }

    if(!option.hasOwnProperty("is_public") || !option.hasOwnProperty("commentsOff") || !option.hasOwnProperty("showLikes")){
        const data = {"message": "Invalid options", "state": "failed"};
        sendResponse(data, resp);
        return
    }
    
    if(typeof option.is_public !== "boolean" || typeof option.commentsOff !== "boolean" || typeof option.showLikes !== "boolean"){
        const data = {"message": "Invalid options input", "state": "failed"};
        sendResponse(data, resp);
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

            sendResponse(data, resp);

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
        sendResponse(data, resp);
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
    });

    if(updateBlog[0] == 1 || updateBlog[0] == 0){
        console.log(updateBlog)
        const data = {"message": "Blog edited successfully", "state": "success"};

        sendResponse(data, resp);
        return
    }else{
        console.log(updateBlog)
        const data = {"message": "Couldn't update blog", "state": "failed"};
        sendResponse(data, resp);
        return
    }
});

router.post("/:blogId/magicLink", async (req, resp) => {
    const { blogId } = req.params;
    var userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

    if(!validateUserInputAsNumber(blogId)){
        var message = {state: "failed", message: "Invalid blog number"};
        sendResponse(message, resp);
        return
    }

    //checking if user has access to this blogId
    const hasUserAccessToBlog = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            userid: userInfo.id
        }
    });

    if(hasUserAccessToBlog == null){
        var message = {state: "failed", message: "Blog not found"};
        sendResponse(message, resp);
        return
    }

    //Creating a unpredictable token
    const toBeHash = "|+|" + Date.now() + "|-|" + Math.random() + "|+|";
    var blogToken = crypto.createHash('md5').update(toBeHash).digest('hex');
    //Creating expire date for blog token
    const currentTime = new Date();
    const blogTokenEXP = new Date(currentTime.getTime() + 5 * 60 * 1000).getTime(); // Add 5 minutes in milliseconds
    // Inserting to database
    const addTokenToDB = await blogsTB.update({
        blog_magicToken: blogToken,
        magicToken_exp: blogTokenEXP
    },
    {
        where: {
            blog_id: blogId
        }
    }
    );

    if(addTokenToDB){
        const blogMagicLink = "http://sancity.blog:8081/blogs/magicLink?token=" + blogToken;
        const message = {state: "success", magicLink: blogMagicLink};
        sendResponse(message, resp);
        return
    }else{
        const message = {state: "failed", message: "Couldn't create magic link"};
        sendResponse(message, resp);
        return
    } 
})

module.exports = router;