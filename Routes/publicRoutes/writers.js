const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { usersTB, blogsTB } = require("../../database");
const { validateUserInputAsNumber, validateBlogInfo } = require("../../utils/validate");
const { sendResponse } = require("../../utils/opt");

router.get("/:userid", async (req, resp) => {
    const { userid } = req.params; //The input can be a userid or a username
    var response = [];

    //Returning alike users to input username
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


router.get("/:userid/info", async(req, resp) => {
    const { userid } = req.params; 
    const userInfo = await usersTB.findOne({
        where: {
            [Op.or]: [
                {
                    username: userid
                },
                {
                    userid: userid
                }
            ]
        }
    });

    if(userInfo){
        const userData = userInfo.dataValues;
        var data = {};
        data.userid = userData.userid;
        data.username = userData.username;
        data.bio = userData.bio;
        data.profilePic = userData.profilePic;
        data.joinDate = userData.joinDate;

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

    //Validating user input 
    if(!await validateUserInputAsNumber(userid)){
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
        for(var blog of getBlogs){
            var validatedBlog = await validateBlogInfo(blog.dataValues);
            blogs.push(validatedBlog);
        }

        const message = {state: "success", content: blogs};
        sendResponse(message, resp);
        return
    }
});

router.get("/:userid/liked-blogs", async (req, resp) => {
    const { userid } = req.params; 

    const likedBlogsId = await usersTB.findOne({
        attributes: ['likedPosts'],
        where: {
            [Op.or]: [
                {
                    username: userid
                },
                {
                    userid: userid
                }
            ]
        }
    });

    if(likedBlogsId){
        const blogIds = likedBlogsId.dataValues;
        let blogsId = blogIds.likedPosts.split(",");
        blogsId.shift() //Removing first that is "0" item 
        const message = {state: "success", blogs_id: blogsId};
        sendResponse(message, resp);
        return
    }else{
        //If the query result was null it means the user does not exist, because every user has a defalt likedPosts value
        const message = {state: "failed", message: "User not found"};
        sendResponse(message, resp);
        return
    }
})

module.exports = router;