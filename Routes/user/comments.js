const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { commentsTB, usersTB, blogsTB } = require("../../database");
const { validateUserInputAsNumber } = require("../../utils/functions");
const { sendResponse } = require("../../utils/functions");
const { removeItemFromArray } = require("../../utils/functions");
const { createNotification } = require("../../utils/functions");

router.post("/:blogId/addComment", async (req, resp) => {
    var { blogId } = req.params;
    if(!validateUserInputAsNumber(blogId)){
        sendResponse({state: "failed", message: "Invalid blog Id"}, resp);
        return
    }
    var { comment } = req.body;
    var userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    var invalidInputRegex = new RegExp("^\\s+$");

    //Validation comment content
    if(comment == undefined){
        sendResponse({state: "failed", message: "comment parameter required"}, resp);
        return
    }
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
    var createdTime = Date.now().toString();

    const addComment = await commentsTB.create({
        blog_id: blogId,
        comment_text: comment,
        commentedAt: createdTime,
        userid: userInfo.id
    })

    if(addComment){
        sendResponse({state: "success", message: "Comment added successfully"}, resp);
        //Sending notification to user
        const notifInfo = {
            userid: isPublic.dataValues.userid,
            notif_title: `${userInfo.username} commented on your blog`,
            acted_userid: userInfo.id,
            action_name: "commented_blog",
            blog_id: isPublic.dataValues.blog_id,
            comment_id: addComment.dataValues.commentId,

        }
        if(notifInfo.userid !== notifInfo.acted_userid){ // preventing users to sending notifications to theirselves
            createNotification(notifInfo);
            return
        }

    }
});

router.get("/:commentId/like", async (req, resp) => {
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
                //Sending notification to user
                 
                    const notifInfo = {
                        userid: isCommentExist.dataValues.userid,
                        notif_title: `${userInfo.username} liked your comment`,
                        acted_userid: userInfo.id,
                        action_name: "liked_comment",
                        blog_id: isCommentExist.dataValues.blog_id,
                        comment_id: isCommentExist.dataValues.commentId
                    }
                    if(notifInfo.userid !== notifInfo.acted_userid){ // preventing users to sending notifications to theirselves
                        createNotification(notifInfo);
                    }
                    
                
 
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

router.delete("/:commentId/delete", async (req, resp) => {
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