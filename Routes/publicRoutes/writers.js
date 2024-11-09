const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { usersTB, blogsTB } = require("../../database");
const { validateUserInputAsNumber, validateBlogInfo } = require("../../utils/validate");
const { sendResponse } = require("../../utils/opt");

router.get("/:userid", async (req, resp) => {
    //Returning alike users to input username
    const { userid } = req.params;
    var response = []
    const user = await usersTB.findAll({
        where: {
            [Op.or]: [
                {
                    userid: userid
                },
                {
                    username: {[Op.like]: `%${userid}%`}
                }
            ],
        }
    });

    if(user){
        for(vals of user){
            var data = {}
            data.userid = vals.userid;
            data.username = vals.username;
            data.bio = vals.bio;
            data.profilePic = vals.profilePic;
            data.joinDate = vals.joinDate;
            response.push(data);
        };

        const message = {state: "success", users: response};
        sendResponse(message, resp);
        return
    }
});


router.get("/:username/info", async(req, resp) => {
    const { username } = req.params; 
    const userInfo = await usersTB.findOne({
        where: {
            username: username
        }
    });

    if(userInfo){
        const userData = userInfo.dataValues;
        var data = {}
        data.userid = userInfo.userid;
        data.username = userInfo.username;
        data.bio = userInfo.bio;
        data.profilePic = userInfo.profilePic;
        data.joinDate = userInfo.joinDate;

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
    };

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