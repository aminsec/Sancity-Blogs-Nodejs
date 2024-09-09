const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { commentsTB, usersTB, blogsTB } = require("../../database");

function removeItemFromArray(array, item){
    const indexOfItem = array.indexOf(item);
    if (indexOfItem > -1){
        array.splice(indexOfItem, 1);
    }
    return array
}

function sendResponse(data, resp){
    resp.setHeader("Content-Type", "application/json");
    resp.send(JSON.stringify(data));
    resp.end();
}


router.post("/:blogId/addComment", async (req, resp) => {
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