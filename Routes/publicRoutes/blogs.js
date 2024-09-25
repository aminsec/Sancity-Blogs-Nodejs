const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { commentsTB, usersTB, blogsTB } = require("../../database");
const { validateUserInputAsNumber } = require("../../utils/functions");
const { sendResponse } = require("../../utils/functions");
const { checkBlogInfo } = require("../../utils/functions");

router.get("/", async (req, resp) => {
    //Getting all blogs from database
    const blogLists = [];
    const allBlogs = await blogsTB.findAll({
        where: {
            is_public: 1
        }
    }) 

    //Getting userid from each blog, and tieing related user info to each blog object
    await Promise.all(allBlogs.map(async (blog) => {
        var blog = blog.dataValues;
        var keysToExtractFromBlog = ["blog_content", "blog_id", "blog_image", "blog_title", "is_public", "userid", "isCommentOff", "showLikes", "likes", "createdAt", "tags"]
        var validatedBlog = checkBlogInfo(blog, keysToExtractFromBlog);
        const getUserInfo = await usersTB.findOne({
            where: {
                userid: validatedBlog.userid
            }
        });
        userInfo = {
            username: getUserInfo.username,
            userid: getUserInfo.userid,
            profilePic: getUserInfo.profilePic
        };
        validatedBlog.user = userInfo;

        blogLists.push(validatedBlog);
    }));

    sendResponse({"state": "success", "blogs": {"len": blogLists.length, "content": blogLists}}, resp);
});

router.post("/magicLink", async (req, resp) => {
    const { token } = req.body;
    //Validating user input 
    if(token == undefined || (typeof token != "string")){
        var message = {state: "failed", message: "Token not found"};
        sendResponse(message, resp);
        return
    }
    //Checking if token is exist 
    const isTokenExist = await blogsTB.findOne({
        where: {
            blog_magicToken: token
        }
    });

    if(isTokenExist){
        //Checking token expire date
        const tokenExpireDate = isTokenExist.dataValues.magicToken_exp;
        const nowTime = Date.now();
        const tokenExpired = tokenExpireDate < nowTime; //If right now time is greater than  token exp date, it means token has expired
        if(tokenExpired){
            const message = {state: "failed", message: "Token has expired"};
            sendResponse(message, resp);
            return
        }else{
            //If token is valid, we show blog info
            const getBlog = await blogsTB.findOne({
                where: {
                    blog_magicToken: token
                }
            })
            //Checking if something has backed from database
            if(!getBlog){
                sendResponse({"state": "failed", "message": "Blog Not found"}, resp);
                return
            }

            //Checking blog Info
            var keysToExtractFromBlog = ["blog_content", "blog_id", "blog_image", "blog_title", "is_public", "userid", "isCommentOff", "showLikes", "likes", "createdAt", "tags"];
            var blog = checkBlogInfo(getBlog.dataValues, keysToExtractFromBlog);
            //getting the user of blog information
            var blogUserId = blog.userid;
            const blogUserInfo = await usersTB.findOne({
                where: {
                    userid: blogUserId
                }
            })
            var blogUserDataObj = {
                userid: blogUserInfo.dataValues.userid,
                username: blogUserInfo.dataValues.username,
                profilePic: blogUserInfo.dataValues.profilePic
            };
        
            blog.user = blogUserDataObj;
            const data = {state: "success", content: blog};
            sendResponse(data, resp);
            return
        }
    }else{
        const message = {state: "failed", message: "Blog not found"};
        sendResponse(message, resp);
        return
    }
})

router.get("/:blogId", async (req, resp) => {
    var { blogId } = req.params;
    if(!validateUserInputAsNumber(blogId)){
        sendResponse({"state": "failed", "message": "Not found"}, resp);
        return
    };
    const getBlog = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            is_public: 1
        }
    })
    //Checking if something has backed from database
    if(!getBlog){
        sendResponse({"state": "failed", "message": "Not found"}, resp);
        return
    }

    //Checking blog Info
    var keysToExtractFromBlog = ["blog_content", "blog_id", "blog_image", "blog_title", "is_public", "userid", "isCommentOff", "showLikes", "likes", "createdAt", "tags"];
    var blog = checkBlogInfo(getBlog.dataValues, keysToExtractFromBlog);
    //getting the user information of blog 
    var blogUserId = blog.userid;
    const blogUserInfo = await usersTB.findOne({
        where: {
            userid: blogUserId
        }
    })
    var blogUserDataObj = {
        userid: blogUserInfo.dataValues.userid,
        username: blogUserInfo.dataValues.username,
        profilePic: blogUserInfo.dataValues.profilePic
    };

    blog.user = blogUserDataObj;
    //Trying to get the user's liked and saved blogs to see if user has liked or saved this post or not, if user is loggin
    try {
        var user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        const userLikes = await usersTB.findAll({
            attributes: ["likedPosts"],
            where: {
                userid: user.id
            }
        })
        const userSaveds = await usersTB.findAll({
            attributes: ["savedPosts"],
            where: {
                userid: user.id
            }
        })
        const likesData = userLikes[0].dataValues.likedPosts;
        const likes = likesData.split(",");
        const savesData = userSaveds[0].dataValues.savedPosts;
        const saves = savesData.split(",");
        
        if(likes.includes(blogId)){
            blog.isLiked = true;
        }
        if(saves.includes(blogId)){
            blog.isSaved = true
        }
        sendResponse({"state": "success", "content": blog}, resp);
    //if above block code goes into error, it means user is not loggin, then we just show the post without isLiked or isSaved
    } catch (error) {
        if(blog){
            sendResponse({"state": "success", "content": blog}, resp);
            return
        }else{
            const data = {"state": "failed", "message": "Not found"};
            sendResponse(data, resp);
        }
    }
})


router.get("/:blogId/comments", async (req, resp) => {
    var data = {state: "success", comments: []};
    var { blogId } = req.params;
    var { limit } = req.query;
    var { offset } = req.query;

    if(!validateUserInputAsNumber(blogId)){
        sendResponse({state: "failed", message: "Blog not found"}, resp);
        return
    }

    //Validating limit and offset value
    if(!limit || !offset){
        const message = {state: "failed", message: "Invalid limit or offset value"};
        sendResponse(message, resp);
        return
    }

    if(!validateUserInputAsNumber(limit) || !validateUserInputAsNumber(offset)){
        const message = {state: "failed", message: "Invalid limit or offset value"};
        sendResponse(message, resp);
        return
    }

    //Converting
    limit = Number(limit);
    offset = Number(offset);

    //Checking if comments of blog are public and the blog is not private
    const areCommentsOn = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            isCommentOff: 0,
            is_public: 1
        }
    })

    if(areCommentsOn){
        const comments = await commentsTB.findAll({
            where: {
                blog_id: blogId
            },
           limit: limit,
           offset: offset
        });

        const getAllCommentsLen = await commentsTB.findAll({
            where: {
                blog_id: blogId
            }
        });
        //Giving all comments count, we need it in frontend
        data.allCommentsLen = getAllCommentsLen.length;
        
        const preparingComments = async () => {
            for(index in comments){
                var commentData = {};
                commentData.comment = comments[index].dataValues.comment_text;
                commentData.Id = comments[index].dataValues.commentId;
                commentData.likes = comments[index].dataValues.commentLikes;
                var commentedUserId = comments[index].dataValues.userid;
                commentData.date = comments[index].dataValues.commentedAt;
                commentData.userid = comments[index].dataValues.userid;
                const commentedUserInfo = await usersTB.findOne({
                    attributes: ["profilePic", "username"],
                    where: {
                        userid: commentedUserId
                    }
                })
                commentData.username = commentedUserInfo.dataValues.username;
                commentData.profilePic = commentedUserInfo.dataValues.profilePic;
                //Checking if user has liked the comment, if is loggin
                try {                   
                    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);                  
                    const getUserLikedComments = await usersTB.findOne({
                        where: {
                            userid: userInfo.id
                        },
                        attributes: ["likedComments"]
                    })
                    var likedComments = getUserLikedComments.dataValues.likedComments;
                    var commentsId = likedComments.split(",");
                    if(commentsId.includes(comments[index].dataValues.commentId.toString())){
                        commentData.isLiked = true;
                    }else{
                        commentData.isLiked = false;
                    }

                } catch (error) {
                   
                }
                data.comments.push(commentData);
            }
        }
        await preparingComments();
        sendResponse(data, resp);
    }else{
        sendResponse({state: "failed", message: "Not found"}, resp);
    }
});

router.get("/:blogId/comments/:commentId", async (req, resp) => {
    const { commentId } = req.params;
    const { blogId } = req.params;
    
    if(!validateUserInputAsNumber(commentId)){
        const message = {state: "failed", message: "Comment not found"};
        sendResponse(message, resp);
        return
    }
    if(!validateUserInputAsNumber(blogId)){
        const message = {state: "failed", message: "Blog not found"};
        sendResponse(message, resp);
        return
    }

    //Checking if comments of blog are public and the blog is not private
    const areCommentsOn = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            isCommentOff: 0,
            is_public: 1
        }
    });

    if(areCommentsOn){
        const getComment = await commentsTB.findOne({
            where: {
                commentId: commentId,
                blog_id: blogId
            }
        });

        if(getComment){
            const commentInfo = getComment.dataValues;
            const message = {state: "success", comment: commentInfo};
            sendResponse(message, resp);
        }else{
            const message = {state: "failed", message: "Comment not found"};
            sendResponse(message, resp);
        }
    }
})

module.exports = router;