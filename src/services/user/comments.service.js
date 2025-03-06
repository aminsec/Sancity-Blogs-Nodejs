const { usersTB } = require("../../models/users.model");
const { commentsTB } = require("../../models/comments.model");
const { removeItemFromArray, createNotification } = require("../../utils/operations");
const publicBlogs_services = require("../../services/public/public_blogs.service");

async function get_user_liked_comments(userInfo) {
    try {
        //Quering liked comments
        const likedComments = await usersTB.findOne({
            attributes: ["likedComments"],
            where: {
                userid: userInfo.id
            }
        });

        var likedCommentsList = likedComments.likedComments.split(",");
        return [null, likedCommentsList];

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function add_comment(userInfo, comment, blogId) {
    try {
        //Checking blog is public and commentable 
        const [error, _ ] = await publicBlogs_services.check_blog_comments_on(blogId);
        if(error){
            return [error, null];
        }

        //Getting comment time 
        var createdTime = Date.now().toString();

        const addComment = await commentsTB.create({
            blog_id: blogId,
            comment_text: comment,
            commentedAt: createdTime,
            userid: userInfo.id
        });

        if(addComment){
            //Quering blog data to send notification
            const [error, blog] = await publicBlogs_services.get_public_blog_by_id(blogId);
            if(error){
                return [error, null];
            }

            //Sending notification to user
            const notifInfo = {
                userid: blog.userid,
                notif_title: `${userInfo.username} commented on your blog`,
                acted_userid: userInfo.id,
                action_name: "commented_blog",
                blog_id: blog.blog_id,
                comment_id: addComment.commentId,
            };

            if(notifInfo.userid !== notifInfo.acted_userid){ // preventing users to sending notifications to theirselves
                createNotification(notifInfo);
            }

            return [null, true];

        }else{
            const error = {message: "Couldn't add blog", state: "failed", type: "system_error"};
            return [error, null];
        }   
    } catch (err) {
        console.log(err);
        const error = {message: "As system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function get_comment_by_id(commentId) {
    try {
        //Checking is comment exist or not
        const comment = await commentsTB.findOne({
            where: {
                commentId: commentId
            }
        });

        if(comment){
            return [null, comment];

        }else{
            const error = {message: "Comment not found", state: "failed", type: "not_found"};
            return [error, null];
        }

    } catch (err) {
        console.log(err);
        const error = {message: "As system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
}

async function like_comment(userInfo, commentId) {
    try {
        //Checking is comment exist or not
        const [error, comment] = await get_comment_by_id(commentId);
        if(error){
            return [error, null];
        }
        
        //Getting list of comments user has liked
        var [err, commentsIdList] = await get_user_liked_comments(userInfo);
        if(err){
            return [err, null];
        }

        //If user has liked comment we remove it from their list
        if(commentsIdList.includes(commentId)){
            commentsIdList = await removeItemFromArray(commentsIdList, commentId); 

            //Inserting new liked comments list 
            var newCommentsId = commentsIdList.join(",");
            const insertNewComments = await usersTB.update({
                likedComments: newCommentsId,
            },{
                where: {
                    userid: userInfo.id
                }
            });

            //Decreasing the likes of comment
            var comment_likes = comment.commentLikes;
            comment_likes -= 1;

            //Inserting updated likes 
            const updateLikesOfComment = await commentsTB.update({
                commentLikes: comment_likes
            }, {
                where: {
                    commentId: commentId
                }
            });

            if(updateLikesOfComment && insertNewComments){
                const result = {state: "success", message: "Comment disliked successfully"};
                return [null, result];

            }else{
                const result = {message: "Couldn't dislike comment", state: "failed", type: "system_error"};
                return [null, result];
            }
            
        }else{
            //If the comment is not in the list, we add it
            commentsIdList.push(commentId); 

            //Inserting new liked comments list 
            var newCommentsId = commentsIdList.join(",");
            const insertNewComments = await usersTB.update({
                likedComments: newCommentsId,
            },{
                where: {
                    userid: userInfo.id
                }
            });

            //Increasing comment likes
            var likesOfComment = comment.commentLikes;
            likesOfComment += 1;

            //Inserting updated likes 
            const updateLikesOfComment = await commentsTB.update({
                commentLikes: likesOfComment
            }, {
                where: {
                    commentId: commentId
                }
            });

            if(updateLikesOfComment && insertNewComments){
                //Sending notification to user
                const notifInfo = {
                    userid: comment.dataValues.userid,
                    notif_title: `${userInfo.username} liked your comment`,
                    acted_userid: userInfo.id,
                    action_name: "liked_comment",
                    blog_id: comment.dataValues.blog_id,
                    comment_id: comment.dataValues.commentId
                };

                if(notifInfo.userid !== notifInfo.acted_userid){ // preventing users to sending notifications to theirselves
                    createNotification(notifInfo);
                }

                const result = {state: "success", message: "Comment liked successfully"};
                return [null, result];

            }else{
                const result = {message: "Couldn't like comment", state: "failed", type: "system_error"};
                return [null, result];
            }
        }

    } catch (err) {
        console.log(err);
        const error = {message: "As system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function delete_comment(userInfo, commentId) {
    try {
        //Checking authorization 
        const checkIsDeletable = await commentsTB.findOne({
            where: {
                commentId: commentId,
                userid: userInfo.id
            }
        });

        if(checkIsDeletable === null){
            const error = {message: "Comment not found", state: "failed", type: "access_denied"};
            return [error, null];
        }

        const deleteComment = await commentsTB.destroy({
            where: {
                commentId: commentId,
                userid: userInfo.id
            }
        });

        if(deleteComment){
            return [null, true];

        }else{
            const error = { message: "Coulnd't delete comment", state: "failed", type: "system_error"};
            return [error, null];
        }

    } catch (err) {
        console.log(err);
        const error = {message: "As system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

module.exports = {
    get_user_liked_comments,
    delete_comment,
    like_comment,
    add_comment,
};