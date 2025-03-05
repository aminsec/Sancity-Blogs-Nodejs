const { validateUserInputAsNumber, validateCommentValues } = require("../../utils/validate");
const { sendResponse, showError } = require("../../utils/operations");
const comment_services = require("../../services/user/comments.service");

async function liked_comments(req, resp) {
    const { userInfo } = req;

    //Quering liked blogs
    const [error, likedComments] = await comment_services.get_user_liked_comments(userInfo);
    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success", liked_comments: likedComments};
    sendResponse(message, resp);
};

async function add_comment(req, resp) {
    var { blogId } = req.params;
    var { comment } = req.body;
    var { userInfo } = req;

    //Validating user input
    if(! await validateUserInputAsNumber(blogId)){
        const error = { message: "Invalid blog id", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    //Validating comment content
    const validatedComment = await validateCommentValues(comment, resp);
    if(!validatedComment) return;

    const [error, comment_added] = await comment_services.add_comment(userInfo, comment, blogId);
    if(error){
        showError(error, resp);
        return;
    }

    if(comment_added === true){
        const message = {state: "success", message: "Comment added successfully"};
        sendResponse(message, resp);
    }else{
        const error = {message: "Couldn't add comment", state: "failed", type: "system_error"};
        showError(error, resp);
    }
};

async function like_comment(req, resp) {
    const { userInfo } = req;
    const { commentId } = req.params;

    //Checking user input
    if(! await validateUserInputAsNumber(commentId)){
        const error = { message: "Invalid comment id", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    const [error, result] = await comment_services.like_comment(userInfo, commentId);
    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success", message: result.message};
    sendResponse(message, resp);
};

async function delete_comment(req, resp) {
    const { commentId } = req.params;
    const { userInfo } = req;

    if(!validateUserInputAsNumber(commentId)){
        const error = { message: "Invalid comment id", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    const [error, deleted] = await comment_services.delete_comment(userInfo, commentId);
    if(error){
        showError(error, resp);
        return;
    }

    if(deleted === true){
        const message = {state: "success", message: "Comment deleted successfully"};
        sendResponse(message, resp);

    }else{
        const error = { message: "Couldn't delete comment", state: "failed", type: "system_error"};
        showError(error, resp);
    }
};

module.exports = {
    liked_comments,
    add_comment,
    like_comment,
    delete_comment
};