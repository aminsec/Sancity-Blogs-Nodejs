const { validateUserInputAsNumber, validateBlogInfo, validateUserInfo } = require("../../utils/validate");
const { sendResponse, showError } = require("../../utils/operations");
const writer_services = require("../../services/public/writers.service");

async function info(req, resp) {
    const { userid } = req.params; //This input can be a userid or a username
    var response = [];

    //Returning users similar to input 
    const [error, users] = await writer_services.get_similar_user(userid);
    if(error){
        showError(error, resp);
        return
    }

    for(var user of users){
        //Remvoing sensetive information of user
        const validated_user_info = validateUserInfo(user);
        response.push(validated_user_info);
    };

    const message = {state: "success", users: response};
    sendResponse(message, resp);
    return;
};

async function id_info(req, resp) {
    const { userid } = req.params; 

    //Quering service
    const [error, userInfo] = await writer_services.get_writer_info_by_id(userid);
    if(error){
        showError(error, resp);
        return;
    }

    //Remvoing sensetive information of user
    const validated_user_info = validateUserInfo(userInfo); 

    const message = {state: "success", user: validated_user_info};
    sendResponse(message, resp);
    return;
};

async function blogs(req, resp) {
    const { userid } = req.params; 

    //Validating user input 
    if(!await validateUserInputAsNumber(userid)){
        const error = {message: "Invalid input values", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    };

    const [error, getBlogs] = await writer_services.get_writer_blogs(userid);
    if(error){
        showError(error, resp);
        return;
    }

    var blogs = [];
    for(var blog of getBlogs){
        var validatedBlog = await validateBlogInfo(blog.dataValues);
        blogs.push(validatedBlog);
    }

    const message = {state: "success", content: blogs};
    sendResponse(message, resp);
    return;
};

async function liked_blogs(req, resp) {
    const { userid } = req.params; 

    const [error, likedBlogsId] = await writer_services.get_writer_liked_blogs(userid);
    if(error){
        showError(error, resp);
        return
    }

    const message = {state: "success", blogs_id: likedBlogsId};
    sendResponse(message, resp);
    return;
};

module.exports = {
    info,
    id_info,
    blogs,
    liked_blogs
};