const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { usersTB, blogsTB } = require("../../database");
const { validateUserInputAsNumber, checkBlogInfo } = require("../../utils/functions");
const { sendResponse } = require("../../utils/functions");

router.get("/:userid", async (req, resp) => {
    const { userid } = req.params;

    const user = await usersTB.findOne({
        where: {
            [Op.or]: [{ userid: userid }, { username: userid }],
        }
    });

    if(user){
        const userData = user.dataValues;
        var data = {
            userid: userData.userid,
            username: userData.username,
            bio: userData.bio,
            profilePic: userData.profilePic,
            joinDate: userData.joinDate
        }; 
        
        const message = {state: "success", user: data};
        sendResponse(message, resp);
        return
    }else{
        const message = {state: "failed", message: "User not found"};
        sendResponse(message, resp);
        return
    }
});

router.get("/:userid/blogs", async (req, resp) => {
    const { userid } = req.params; 
    if(!validateUserInputAsNumber(userid)){
        const message = {state: "failed", message: "User not found"};
        sendResponse(message, resp);
        return
    }

    const getBlogs = await blogsTB.findAll({
        where: {
            userid: userid,
            is_public: 1
        }
    })

    if(getBlogs){
        var blogs = [];
        var keysToExtractFromBlog = ["blog_content", "blog_id", "blog_image", "blog_title", "is_public", "userid", "isCommentOff", "showLikes", "likes", "createdAt", "tags"];
        for(var blog of getBlogs){
            blogs.push(checkBlogInfo(blog.dataValues, keysToExtractFromBlog))
        }

        const message = {state: "success", content: blogs};
        sendResponse(message, resp);
        return
    }else{
        const message = {state: "failed", message: "There is no any blog yet"};
        sendResponse(message, resp);
        return
    }
});

router.get("/:userid/liked-blogs", async (req, resp) => {
    const { userid } = req.params; 
    if(!validateUserInputAsNumber(userid)){
        const message = {state: "failed", message: "User not found"};
        sendResponse(message, resp);
        return
    }

    const likedBlogsId = await usersTB.findOne({
        attributes: ['likedPosts'],
        where: {
            userid: userid
        }
    });

    if(likedBlogsId){
        const blogIds = likedBlogsId.dataValues;
        let blogsId = blogIds.likedPosts.split(",");
        blogsId.shift() //Removing first that is "0" item 
        const message = {state: "success", blogs_id: blogsId};
        sendResponse(message, resp);
        return
    }
})

module.exports = router;