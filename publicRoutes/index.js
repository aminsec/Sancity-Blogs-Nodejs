const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { commentsTB, usersTB, blogsTB } = require("../database");
const { json } = require('sequelize');

//Function to send normall messages
function sendResponse(data, resp){
    resp.setHeader("Content-Type", "application/json");
    resp.send(JSON.stringify(data));
    resp.end();
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

router.get("/blogs", async (req, resp) => {
    //Getting all blogs from database
    const blogLists = [];
    const allBlogs = await blogsTB.findAll({
        where: {
            is_public: 1
        }
    }) 

    //Getting userid from each blog, and tieing related user info to each blog object
    await Promise.all(allBlogs.map(async (blog) => {
        const userInfo = await usersTB.findOne({
            where: {
                userid: blog.userid
            }
        });
        //Deleting sensetive information from grabbed user data 
        delete userInfo.dataValues.password;
        delete userInfo.dataValues.email;
        delete userInfo.dataValues.joinDate;
        delete userInfo.dataValues.likedPosts;
        delete userInfo.dataValues.savedPosts;
        delete userInfo.dataValues.role;
        userInfo.dataValues.profilePic = userInfo.profilePic
        blog.dataValues.user = userInfo;
        blogLists.push(blog);
    }));

    sendResponse({"state": "success", "blogs": {"len": blogLists.length, "content": blogLists}}, resp)
})

router.get("/blogs/:blogId", async (req, resp) => {
    var { blogId } = req.params;
    if(!validateUserInputAsNumber(blogId)){
        sendResponse({"state": "failed", "message": "Not found"}, resp);
        return
    }
    const blog = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            is_public: 1
        }
    })
    //Checking if something has backed from database
    if(!blog){
        sendResponse({"state": "failed", "message": "Not found"}, resp);
        return
    }
    //Making the likes hidden if the likes are private
    if(blog.dataValues.showLikes == 0){
        blog.dataValues.likes = "private" 
    }

    //getting the user of blog information
    var blogUserId = blog.dataValues.userid;
    const blogUserInfo = await usersTB.findOne({
        where: {
            userid: blogUserId
        }
    })
    var blogUserDataObj = blogUserInfo.dataValues;
    //removing sensetive fields
    delete blogUserDataObj.password;
    delete blogUserDataObj.email;
    delete blogUserDataObj.role;
    delete blogUserDataObj.joinDate;
    delete blogUserDataObj.savedPosts;
    delete blogUserDataObj.likedPosts;

    blog.dataValues.user = blogUserDataObj;
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
            blog.dataValues.isLiked = true;
        }
        if(saves.includes(blogId)){
            blog.dataValues.isSaved = true
        }
        sendResponse({"state": "success", "content": blog}, resp);
    //if above block code goes into error, it means user is not loggin, then we just show the post without isLiked or isSaved
    } catch (error) {
        if(blog){
            sendResponse({"state": "success", "content": blog}, resp)
        }else{
            const data = {"state": "failed", "message": "Not found"};
            sendResponse(data, resp)
        }
    }
})

router.get("/search", async (req, resp) => {
    if(!req.query.q){
        sendResponse({"state": "failed", "message": "No blogs found"}, resp);
        return
    }
    const userSearchQuery = req.query.q; //getting user input
    const userSearchQueryList = userSearchQuery.split(" "); //Spliting the user input to have better match with blogs tags
    //Defining score to each blog to sort the most related blogs to user search query
    var blogsScore = {};
    var sortedBlogsScore = new Map(); //using map to save the add sorting. (Object doesn't support)
    var sortedRelatedBlogs = [];
    //Getting all blogs
    const allBlogs = await blogsTB.findAll({
        where: {
            is_public: 1
        }
    })

    //Getting blogs' tags
    for(var i = 0; i < allBlogs.length; i++){
        var blogTag = allBlogs[i].dataValues.tags;
        blogsScore[allBlogs[i].dataValues.blog_id] = 0;
        //spliting tags
        var tags = blogTag.split("#");
        tags.splice(0, 1); //removing the first index that is null
        //if user input was match with tags of blog, the blog gets one score 
        for(var k = 0; k < tags.length; k++){
            for(var j = 0; j < userSearchQueryList.length; j++){
                if(tags[k].includes(userSearchQueryList[j])){
                    blogsScore[allBlogs[i].dataValues.blog_id] = blogsScore[allBlogs[i].dataValues.blog_id] + 1; //increasing score of the blog, that means it's related to the user search                   
                }
            }
        }
    }


    //removing most unrelated blogs that has 0 score
    for(vals in blogsScore){
        if(blogsScore[vals] == 0){
            delete blogsScore[vals]
        }
    }
    //sorting
    function getKeyByValue(object, value) {
        return Object.keys(object).find(key => object[key] === value);
      }

    var values = Object.values(blogsScore); //getting the scores of blogs to sort 
    var sortedValues = values.sort((a, b) => {return b - a}); //sorting the scores descending
    for(var i = 0; i < sortedValues.length; i++){
       var keys = getKeyByValue(blogsScore, sortedValues[i]);
       sortedBlogsScore.set(keys, sortedValues[i]);
       delete blogsScore[keys]; //removing the object, to prevent duplicate
    }
    

    //getting related blogs id from the sorted list
    var relatedBlogsId = Array.from(sortedBlogsScore.keys());
    //getting the related blogs information 
    for(var i = 0; i < relatedBlogsId.length; i++){
        for(var j = 0; j < allBlogs.length; j++){
            if(relatedBlogsId[i] == allBlogs[j].dataValues.blog_id){
                sortedRelatedBlogs.push(allBlogs[j].dataValues);
                break
            }
        }
    }

    //Implementing some security issues 
    for(var i = 0; i < sortedRelatedBlogs.length; i++){
        if(sortedRelatedBlogs[i].showLikes == 0){
            sortedRelatedBlogs[i].likes = "private"
        }
    }

    //Getting each blog user info
    for(index in sortedRelatedBlogs){
        var userId = sortedRelatedBlogs[index].userid;
        const userInfo = await usersTB.findOne({
            where: {
                userid: userId
            }
        })
        sortedRelatedBlogs[index].user = {username: userInfo.dataValues.username, profilePic: "/statics/img/ProfileDefault.png"}
    }
    
    sendResponse({state: "success", length: sortedRelatedBlogs.length, blogs: sortedRelatedBlogs}, resp)
});

router.get("/blogs/:blogId/comments", async (req, resp) => {
    var data = {state: "success", comments: []};
    var { blogId } = req.params;

    if(!validateUserInputAsNumber(blogId)){
        sendResponse({state: "failed", message: "Blog not found"}, resp);
        return
    }

    //Checking if comments of blog are public
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
            }
        })
    
        const preparingComments = async () => {
            for(index in comments){
                var commentData = {};
                commentData.comment = comments[index].dataValues.comment_text;
                commentData.Id = comments[index].dataValues.commentId;
                commentData.likes = comments[index].dataValues.commentLikes;
                var commentedUserId = comments[index].dataValues.userid;
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
})

// router.get("/members/:memberId", async (req, resp) => {
//     const { memberId } = req.params;
//     const userInfo = await usersTB.findOne({
//         where: {
//             userid: memberId
//         }
//     })

//     if(userInfo){
//         var userData = {"id": userInfo.userid, "username": userInfo.username, "profilePic": "/statics/img/ProfileDefault.png"};
//         resp.send(userData);
//         resp.end();
//     }else{
//         resp.send({"state": "failed", "message": "User not found"})
//     }
// })

module.exports = router;