const { usersTB } = require("../../models/users.model");
const { blogsTB } = require("../../models/blogs.model");
const { commentsTB } = require("../../models/comments.model");
const { validateUserInputAsNumber, validateCommentValues } = require("../../utils/validate");
const { removeItemFromArray, createNotification, sendResponse } = require("../../utils/operations");

async function liked_comments(req, resp) {
    const { userInfo } = req;

    //Quering liked blogs
    const likedComments = await usersTB.findOne({
        attributes: ["likedComments"],
        where: {
            userid: userInfo.id
        }
    });

    var likedCommentsList = likedComments.dataValues.likedComments.split(",");
    const message = {state: "success", liked_comments: likedCommentsList};
    sendResponse(message, resp);
};

async function add_comment(req, resp) {
    var { blogId } = req.params;
    var { comment } = req.body;
    var { userInfo } = req;

    if(! await validateUserInputAsNumber(blogId)){
        const message = {state: "failed", message: "Invalid blog Id"};
        sendResponse(message, resp, {}, 400);
        return;
    }

    //Checking blog is public and commentable 
    const blog = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            is_public: 1,
            isCommentOff: 0
        }
    });

    //Return if blog is not found or is not public or comments are off
    if(blog == null){
        const message = {state: "failed", message: "Blog not found"};
        sendResponse(message, resp, {}, 404);
        return;
    }

    //Validating comment content
    const validatedComment = await validateCommentValues(comment, resp);
    if(!validatedComment) return;

    //Getting comment time 
    var createdTime = Date.now().toString();

    const addComment = await commentsTB.create({
        blog_id: blogId,
        comment_text: comment,
        commentedAt: createdTime,
        userid: userInfo.id
    });

    if(addComment){
        const message = {state: "success", message: "Comment added successfully"};
        sendResponse(message, resp);

        //Sending notification to user
        const notifInfo = {
            userid: blog.dataValues.userid,
            notif_title: `${userInfo.username} commented on your blog`,
            acted_userid: userInfo.id,
            action_name: "commented_blog",
            blog_id: blog.dataValues.blog_id,
            comment_id: addComment.dataValues.commentId,

        };

        if(notifInfo.userid !== notifInfo.acted_userid){ // preventing users to sending notifications to theirselves
            createNotification(notifInfo);
            return;
        }
    }
};

async function like_comment(req, resp) {
    const { userInfo } = req;
    const { commentId } = req.params;
    var messageToSend = {};

    //Checking user input
    if(! await validateUserInputAsNumber(commentId)){
        const message = {state: "failed", message: "Invalid comment Id"};
        sendResponse(message, resp);
        return;
    }

    //Checking is comment exist or not
    const comment = await commentsTB.findOne({
        where: {
            commentId: commentId
        }
    });

    if(!comment){
        const message = {state: "failed", message: "Comment not found"};
        sendResponse(message, resp, {}, 404);
        return;
    }
    
    //Getting list of comments user has liked
    const getLikedComments = await usersTB.findOne({
        attributes: ["likedComments"],
        where: {
            userid: userInfo.id
        }
    });

    if(getLikedComments){
        var likedComments = getLikedComments.dataValues.likedComments;
        var commentsIdList = likedComments.split(",");

        //If user has liked comment we remove it from their list
        if(commentsIdList.includes(commentId)){
            commentsIdList = await removeItemFromArray(commentsIdList, commentId); 
            
            //Decreasing the likes of comment
            const getLikesOfcomment = await commentsTB.findOne({
                where: {
                    commentId: commentId
                }
            });

            var likesOfComment = getLikesOfcomment.dataValues.commentLikes;
            likesOfComment -= 1;

            //Inserting updated likes 
            const updateLikesOfComment = await commentsTB.update({
                commentLikes: likesOfComment
            }, {
                where: {
                    commentId: commentId
                }
            });

            if(updateLikesOfComment){
                messageToSend = {state: "success", message: "Comment disliked successfully"};
            }
            
        }else{
            //If the comment is not in the list, we add it
            commentsIdList.push(commentId); 

            //Increasing the likes of comment
            const getLikesOfcomment = await commentsTB.findOne({
                where: {
                    commentId: commentId
                }
            });

            var likesOfComment = getLikesOfcomment.dataValues.commentLikes;
            likesOfComment += 1;

            //Inserting updated likes 
            const updateLikesOfComment = await commentsTB.update({
                commentLikes: likesOfComment
            }, {
                where: {
                    commentId: commentId
                }
            });

            if(updateLikesOfComment){
                messageToSend = {state: "success", message: "Comment liked successfully"};
                //Sending notification to user
                const notifInfo = {
                    userid: comment.dataValues.userid,
                    notif_title: `${userInfo.username} liked your comment`,
                    acted_userid: userInfo.id,
                    action_name: "liked_comment",
                    blog_id: comment.dataValues.blog_id,
                    comment_id: comment.dataValues.commentId
                }
                if(notifInfo.userid !== notifInfo.acted_userid){ // preventing users to sending notifications to theirselves
                    createNotification(notifInfo);
                }
            }  
        }
        
        var newCommentsId = commentsIdList.join(",");
        const insertNewComments = await usersTB.update({
            likedComments: newCommentsId,
          },{
            where: {
                userid: userInfo.id
            }
          });

        if(insertNewComments){
            sendResponse(messageToSend, resp);
            return;
        }
    }else{
        const message = {state: "failed", message: "An error accoured"};
        sendResponse(message, resp, {}, 500);
    }
};

async function delete_comment(req, resp) {
    const { commentId } = req.params;
    const { userInfo } = req;

    if(!validateUserInputAsNumber(commentId)){
        const message = {state: "failed", message: "Comment not found"};
        sendResponse(message, resp, {}, 404);
        return;
    }

    //Checking authorization 
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
        });

        if(deleteComment){
            const message = {state: "success", message: "Comment deleted successfully"};
            sendResponse(message, resp);
            return;

        }else{
            const message = {state: "failed", message: "Coulnd't delete comment"};
            sendResponse(message, resp, {}, 500);
            return;
        }

    }else{
        const message = {state: "failed", message: "Comment not found"};
        sendResponse(message, resp, {}, 404);
        return;
    }
};

module.exports = {
    liked_comments,
    add_comment,
    like_comment,
    delete_comment
}