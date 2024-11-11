const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { commentsTB, usersTB, blogsTB } = require("../../database");
const { validateUserInputAsNumber, isUndefined, validateBlogInfo, validateType } = require("../../utils/validate");
const { sendResponse, sortObjectByValuesDescending, queryUserInfo } = require("../../utils/opt");

router.get("/", async (req, resp) => {
    const blogsList = [];

    //Getting all blogs from database
    const allBlogs = await blogsTB.findAll({
        where: {
            is_public: 1
        }
    });
   
    for (blog of allBlogs){
        //Removing sensitve keys from blog
        const validatedBlog = await validateBlogInfo(blog.dataValues);

        //Getting user's info of each blog
        validatedBlog.user = await queryUserInfo(validatedBlog.userid);
        blogsList.push(validatedBlog);
    }

    const message = {state: "success", "blogs": {"len": blogsList.length, "content": blogsList}};
    sendResponse(message, resp);
});

router.get("/search", async (req, resp) => {
    const userSearchQuery = req.query.q;

    //Checking if parameter is not defined
    if(await isUndefined(resp, userSearchQuery)) return;

    //Spliting the user input to have better match with blogs tags
    const userSearchQueryList = userSearchQuery.split(" "); 

    //Defining score to each blog to sort the most related blogs to user search query
    var blogsScore = {};

    //Getting blogs that their tags or blog_title includes with user search query
    const allBlogs = await blogsTB.findAll({
        where: {
            is_public: 1,
        }
    });

    for(blog of allBlogs){
        const blogTag = blog.tags;
        //Defining score to each blog
        blogsScore[blog.blog_id] = 0;
        //Spliting blogs tag by '#'
        var tags = blogTag.split("#");
        tags.splice(0, 1); //removing the first index that is null
        for(let tag of tags){
            for(let word of userSearchQueryList){
                //If the user searched word is in tags, we add one score to blog
                if(tag.includes(word)){
                    blogsScore[blog.blog_id] =  blogsScore[blog.blog_id] + 1;
                }
            }
        }
    }

    //removing unrelated blogs that has 0 score
    for(let key in blogsScore){
        if(blogsScore[key] == 0){
            delete blogsScore[key];
        }
    }
   
    //Sorting obj by their scores and getting blog
    var response = [];
    var sortedBlogs = await sortObjectByValuesDescending(blogsScore); //returns a Map
    for(let id of sortedBlogs.keys()){
        for(let blog of allBlogs){
            if(id == blog.blog_id){
                //Validating blog
                var validBlog = await validateBlogInfo(blog.dataValues);
                //Getting each blog user information 
                var userid = validBlog.userid;
                const userInfo = await queryUserInfo(userid);
                validBlog.user = userInfo;
                response.push(validBlog);
                continue
            }
        }
    }

    const message = {state: "success", length: response.length, blogs: response};
    sendResponse(message, resp);
});

router.post("/magicLink", async (req, resp) => {
    //Getting and converting token to string
    const { token }  = req.body;

    //Validating user input 
    if(await isUndefined(resp, token) || await validateType(resp, "string", token) == false) return;

    //Checking if token exists 
    const tokenInfo = await blogsTB.findOne({
        where: {
            blog_magicToken: token
        }
    });

    if(tokenInfo){
        //Checking token expiration date
        const tokenExpireDate = tokenInfo.dataValues.magicToken_exp;
        const nowTime = Date.now();

        //If time of right now is greater than token exp date, it means token has expired
        const tokenExpired = nowTime > tokenExpireDate;
        if(tokenExpired){
            const message = {state: "failed", message: "Token has expired"};
            sendResponse(message, resp);
            return
        }

        //If token is valid, we show blog info
        const getBlog = await blogsTB.findOne({
            where: {
                blog_magicToken: token
            }
        });
        
        //Checking if something has backed from database
        if(!getBlog){
            const message = {state: "failed", message: "Blog Not found"};
            sendResponse(message, resp);
            return
        }

        //Checking blog Info
        var blog = await validateBlogInfo(getBlog.dataValues);

        //getting the user of blog information
        var blogUserId = blog.userid;
        const blogUserInfo = await usersTB.findOne({
            where: {
                userid: blogUserId
            }
        });

        var blogUserDataObj = {
            userid: blogUserInfo.dataValues.userid,
            username: blogUserInfo.dataValues.username,
            profilePic: blogUserInfo.dataValues.profilePic
        };
    
        blog.user = blogUserDataObj;
        const data = {state: "success", content: blog};
        sendResponse(data, resp);
        return
        
    }else{
        //Sending error if token not found
        const message = {state: "failed", message: "Blog not found"};
        sendResponse(message, resp, {});
        return
    }
})

router.get("/:blogId", async (req, resp) => {
    var { blogId } = req.params;

    //Validating blog id to be numver
    if(!validateUserInputAsNumber(blogId)){
        const message = {state: "failed", message: "Not found"}
        sendResponse(message, resp);
        return
    };

    //Quering blog info
    const blog = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            is_public: 1
        }
    });

    //Checking if something has backed from database
    if(!blog){
        const message = {state: "failed", message: "Not found"};
        sendResponse(message, resp);
        return
    }

    //Checking blog Info
    var validatedBlog = await validateBlogInfo(blog.dataValues);

    //getting the user information of blog 
    var blogUserId = validatedBlog.userid;
    validatedBlog.user = await queryUserInfo(blogUserId);

    //Trying to get the user's liked and saved blogs to see if user has liked or saved this post or not, if user is loggin
    try {
        //If user was not authenticated, this block go through an error
        var user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

        //Quering user's liked blogs
        const userLikes = await usersTB.findAll({
            attributes: ["likedPosts"],
            where: {
                userid: user.id
            }
        });

        //Quering user's saved blogs
        const userSaveds = await usersTB.findAll({
            attributes: ["savedPosts"],
            where: {
                userid: user.id
            }
        });

        const likesData = userLikes[0].dataValues.likedPosts;
        const likes = likesData.split(",");
        const savesData = userSaveds[0].dataValues.savedPosts;
        const saves = savesData.split(",");
        
        //Checking if blog is in liked list
        if(likes.includes(blogId)){
            validatedBlog.isLiked = true;
        }

        //Checking if blog is in saved list
        if(saves.includes(blogId)){
            validatedBlog.isSaved = true
        }

        const message = {state: "success", content: validatedBlog};
        sendResponse(message, resp);

    //if above block code goes into error, it means user is not authenticated, then we just show the post without isLiked or isSaved
    } catch (error) {
        if(validatedBlog){
            const message = {state: "success", content: validatedBlog};
            sendResponse(message, resp);
            return
        }else{
            const message = {state: "failed", message: "Not found"};
            sendResponse(message, resp);
        }
    }
});

router.get("/:blogId/comments", async (req, resp) => {
    var data = {state: "success", comments: []};
    var { blogId } = req.params;
    var { limit } = req.query;
    var { offset } = req.query;

    //Validating limit and offset value
    if(await isUndefined(resp, limit, offset)) return;

    //Validating user input as number
    if(!validateUserInputAsNumber(limit, offset, blogId)){
        const message = {state: "failed", message: "Invalid inputs"};
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
    });

    if(areCommentsOn){
        //Quering for comments
        const comments = await commentsTB.findAll({
            where: {
                blog_id: blogId
            },
            order: [
                ["commentedAt", "DESC"]
            ],
           limit: limit,
           offset: offset
        });

        //Quering for all commenst to get their count - we need it in front
        const getAllCommentsLen = await commentsTB.findAll({
            where: {
                blog_id: blogId
            }
        });

        //Giving all comments count, we need it in frontend
        data.allCommentsLen = getAllCommentsLen.length;
        
        //Preparing comments to be sent
        for(let comment of comments){
            var commentData = {};
            commentData.comment = comment.comment_text;
            commentData.Id = comment.commentId;
            commentData.likes = comment.commentLikes;
            commentData.date = comment.commentedAt;
            
            //Quering the user info of comment
            commentData.user = await queryUserInfo(comment.userid);
            data.comments.push(commentData);
        }
        
        sendResponse(data, resp);
    }else{
        const message = {state: "failed", message: "Not found"};
        sendResponse(message, resp);
        return
    }
});

router.get("/:blogId/comments/:commentId", async (req, resp) => {
    const { commentId } = req.params;
    const { blogId } = req.params;
    
    if(!await validateUserInputAsNumber(commentId, blogId)){
        const message = {state: "failed", message: "Comment not found"};
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
        //Quering comment
        const comment = await commentsTB.findOne({
            where: {
                commentId: commentId,
                blog_id: blogId
            }
        });

        if(comment){
            const commentInfo = comment.dataValues;
            const message = {state: "success", comment: commentInfo};
            sendResponse(message, resp);
        }else{
            const message = {state: "failed", message: "Comment not found"};
            sendResponse(message, resp);
        }
    }
});

module.exports = router;