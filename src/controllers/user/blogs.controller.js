const { validateUserInputAsNumber, validateBlogValues } = require("../../utils/validate");
const { sendResponse, showError } = require("../../utils/operations");
const account_blogs_services = require("../../services/user/blogs.service");

async function all(req, resp) {
    const { userInfo } = req;

    //Quering all user blogs
    const [error, userBlogs] = await account_blogs_services.get_all_user_blogs(userInfo.id);
    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success", blogs: userBlogs};
    sendResponse(message, resp);
};

async function new_blog (req, resp) {
    const { userInfo } = req;
    var { bannerPic, thumbnail, title, body, tags, option} = req.body;

    //Validating blog values before inserting
    const blogResult = await validateBlogValues(bannerPic, thumbnail, title, body, tags, option, resp);
    if(blogResult === false) return;
    
    const [error, create] = await account_blogs_services.create_blog(userInfo, req);
    if(error){
        showError(error, resp);
        return;
    }

    if(create === true){
        const message = {state: "success", message: "Blog created successfully"};
        sendResponse(message, resp);

    }else{
        const error = {state: "failed", message: "Couldn't create blog", type: "system_error"};
        showError(error, resp);
    }
};

async function get_blog(req, resp) {
    var { blogId } = req.params;
    const { userInfo } = req;

    //Quering blog 
    const [error, blog] = await account_blogs_services.get_user_blog_by_id(userInfo, blogId);
    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success", blog: blog};
    sendResponse(message, resp);
};

async function delete_blog(req, resp) {
    const { blogId } = req.params;
    const { userInfo } = req;

    //Validating user input
    if(! await validateUserInputAsNumber(blogId)){
        const error = { message: "Invalid blog number", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }
    
    const [error, deletBlog] = await account_blogs_services.delete_blog(blogId, userInfo);
    if(error){
        showError(error, resp);
        return;
    }

    if(deletBlog === true){
        const message = {state: "success", message: "Blog deleted successfully"};
        sendResponse(message, resp);
    }
};

async function like(req, resp) {
    var { blogId } = req.params;
    var { userInfo } = req;

    const [error, like] = await account_blogs_services.like_blog(userInfo, blogId);
    if(error){
        showError(error, resp);
        return;
    }

    const message = {message: like.message, state: "success"};
    sendResponse(message, resp);
};

async function save(req, resp) {
    var { blogId } = req.params;
    var { userInfo } = req;

    const [error, save] = await account_blogs_services.save_blog(userInfo, blogId);
    if(error){
        showError(error, resp);
        return;
    }

    const message = {message: save.message, state: "success"};
    sendResponse(message, resp);
};

async function update_blog(req, resp) {
    const { userInfo } = req;
    const { blogId } = req.params;
    var { bannerPic, thumbnail, title, body, tags, option} = req.body;

    //Validating blog values before inserting
    const blogResult = await validateBlogValues(bannerPic, thumbnail, title, body, tags, option, resp);
    if(blogResult === false) return;
    
    const [error, update] = await account_blogs_services.update_blog(userInfo, req, blogId);
    if(error){
        showError(error, resp);
        return;
    }

    if(update === true){
        const message = {state: "success", message: "Blog edited successfully"};
        sendResponse(message, resp);

    }else{
        const error = {state: "failed", message: "Blog not found", type: "not_found"};
        showError(error, resp);
    }
};

async function make_magic_link(req, resp) {
    const { blogId } = req.params;
    var { userInfo } = req;

    //Validating user inputes
    if(!validateUserInputAsNumber(blogId)){
        const error = {message: "Invalid blog number", state: "failed", type: "input_error"};
        showError(error, resp);
        return
    }

    const [error, token] = await account_blogs_services.make_magic_link(userInfo, blogId);
    if(error){
        showError(error, resp);
        return;
    }
    const link = `http://sancity.blog:8081/blogs/magicLink?token=${token}`;
    const message = {state: "success", magicLink: link};
    sendResponse(message, resp);
};

module.exports = {
    all,
    new_blog,
    get_blog,
    save,
    like,
    delete_blog,
    update_blog,
    make_magic_link
}