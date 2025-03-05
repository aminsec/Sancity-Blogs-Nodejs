const { validateUserInputAsNumber, isUndefined, validateType } = require("../../utils/validate");
const { sendResponse, showError } = require("../../utils/operations");
const publicBlogs_services = require("../../services/public/public_blogs.service");

async function all(req, resp) {
    const { offset, limit } = req.query;

    //Validating user input
    if(await isUndefined(resp, offset, limit)) return;

    if(await validateUserInputAsNumber(offset, limit) === false){
        const error = {message: "Invalid input values", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    //Calling service
    const [error, blogs] = await publicBlogs_services.get_all_public_blogs_by_limit_and_offset(limit, offset);
    
    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success", "blogs": {"len": blogs.length, "content": blogs}};
    sendResponse(message, resp);
};

async function search(req, resp) {
    const userSearchQuery = req.query.q;

    //Checking if parameter is not defined
    if(await isUndefined(resp, userSearchQuery)) return;

    //Getting blogs that their tags or blog_title includes with user search query
    const [error, blogs] = await publicBlogs_services.search_blog(userSearchQuery);

    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success", length: blogs.length, blogs: blogs};
    sendResponse(message, resp);
};

async function magic_link(req, resp) {
    //Getting and converting token to string
    const { token }  = req.body;

    //Validating user input 
    if(await isUndefined(resp, token) || await validateType(resp, "string", token) == false) return;


    const [error, blog] = await publicBlogs_services.get_blog_by_magic_link(token);
    if(error){
        showError(error, resp);
        return;
    }
    
    const message = {state: "success", content: blog};
    sendResponse(message, resp);
};

async function get_blog(req, resp) {
    var { blogId } = req.params;

    //Validating blog id to be number
    if(!await validateUserInputAsNumber(blogId)){
        const error = {message: "Invalid input values", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    };

    //Quering blog info
    const [error, blog] = await publicBlogs_services.get_public_blog_by_id(blogId);
    
    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success", content: blog};
    sendResponse(message, resp);
    return;
};

async function get_blog_comments(req, resp) {
    var data = {state: "success", comments: []};
    var { blogId } = req.params;
    var { limit } = req.query;
    var { offset } = req.query;

    //Validating limit and offset value
    if(await isUndefined(resp, limit, offset)) return;

    //Validating user input as number
    if(!await validateUserInputAsNumber(limit, offset, blogId)){
        const error = {message: "Invalid input values", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    //Converting
    limit = Number(limit);
    offset = Number(offset);

    const [error, result, allCommentsLen] = await publicBlogs_services.get_blog_comments_by_limit(blogId, limit, offset);
    if(error){
        showError(error, resp);
        return;
    }

    data.comments = result;
    data.allCommentsLen = allCommentsLen;
    sendResponse(data, resp);
};

async function get_blog_comment(req, resp) {
    const { commentId } = req.params;
    const { blogId } = req.params;
    
    //Checking user inputs
    if(!await validateUserInputAsNumber(commentId, blogId)){
        const error = {message: "Invalid input values", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    const [error, comment] = await publicBlogs_services.get_blog_comment(blogId, commentId);
    if(error){
        showError(error, resp);
        return;
    }

    const commentInfo = comment.dataValues;
    const message = {state: "success", comment: commentInfo};
    sendResponse(message, resp);
};

module.exports = {
    all,
    search,
    magic_link,
    get_blog,
    get_blog_comment,
    get_blog_comments
};