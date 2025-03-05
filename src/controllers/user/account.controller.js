const jwt = require('jsonwebtoken');
const { sendResponse, showError } = require("../../utils/operations");
const { isUndefined, validateUsername } = require("../../utils/validate");
const account_services = require("../../services/user/account.service");
const account_blogs_services = require("../../services/user/blogs.service");

async function info(req, resp) {
    const { userInfo } = req;
    const [error, userAccountInfo] = await account_services.get_user_info_by_id(userInfo.id);
    if(error){
        showError(error, resp);
        return;
    }

    //Assigning token to user information
    userAccountInfo.token = req.cookies.token;

    sendResponse(userAccountInfo, resp);
};

async function update_info(req, resp) {
    const { userInfo } = req;
    var { username, email, bio } = req.body;

    //Checking inputs
    if(await isUndefined(resp, username, email, bio)) return;

    //Validating username
    if(! await validateUsername(username, resp)) return;

    const [error, updated] = await account_services.update_info(req);
    if(error){
        showError(error, resp);
        return;
    }

    if(updated === true){
        //Generating new token
        var newToken = {};
        newToken.username = username;
        newToken.email = email;
        newToken.id = userInfo.id;
        newToken.role = userInfo.role;
        newToken.profilePic = userInfo.profilePic;
        const token = jwt.sign(newToken, process.env.JWT_SECRET,{
            expiresIn: "1h"
        });
        resp.cookie("token", token, {httpOnly: true, sameSite: 'lax'});
        const message = {state: "success", message: "Data updated successfully"};
        sendResponse(message, resp);
        return;
    }
};

async function upload_profile_pic(req, resp) {
    const userProfilePic = "/api/v1/profilePics/" + req.file.filename;
    const { userInfo } = req;
    const [error, updated] = await account_services.update_profile_pic_path(userInfo, userProfilePic);
    if(error){
        showError(error, resp);
        return;
    }

    if(updated === true){
        //setting new profile pic to user token
        userInfo.profilePic = userProfilePic;
        const token = jwt.sign(userInfo, process.env.JWT_SECRET);
        resp.cookie("token", token, {httpOnly: true, sameSite: 'lax'});
        const message = {state: "success", message: "Profile picture updated successfully"};
        sendResponse(message, resp);
        return;

    }else{
        const error = {state: "failed", message: "Couldn't update profile picture", type: "system_error"};
        showError(error, resp)
        return;
    }
};

async function change_password(req, resp) {
    const { userInfo } = req;
    const { newPass, oldPass} = req.body;

    //Checking user inputs
    if(await isUndefined(resp, oldPass, newPass)) return;

    if(newPass == "" || oldPass == ""){  
        const error = {message: "Fileds can not be empty", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    if(newPass.length > 50){
        const error = {message: "Password is too long", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }
    
    const [error, update_password] = await account_services.update_password(userInfo, newPass, oldPass);
    if(error){
        showError(error, resp);
        return
    }

    if(update_password === true){
        const message = {state: "success", message: "Password updated successfully"};
        sendResponse(message, resp);
        return

    }else{
        const error = {state: "failed", message: "A system error occurred", type: "sytsem_error"};
        showError(error, resp);
        return
    }
};

async function favorites(req, resp) {
    const { userInfo } = req;
    
    //Getting user saved posts lists
    const [error, favorites] = await account_blogs_services.get_user_saved_blogs(userInfo);
    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success", blogs_id: favorites};
    sendResponse(message, resp);
};

async function likes(req, resp) {
    const { userInfo } = req;

    //Getting user liked posts list
    const [error, liked_blogs] = await account_blogs_services.get_user_liked_blogs(userInfo);
    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success", blogs_id: liked_blogs};
    sendResponse(message, resp);
};

async function deleteAccount(req, resp) {
    const { token } = req.cookies
    const { userInfo } = req;
    const { password, confirm_password } = req.body;

    //Checking user inputes
    if(await isUndefined(resp, password, confirm_password)) return;

    if(password !== confirm_password){
        const error = {state: "failed", message: "Passwords does not match", type: "creds_error"};
        showError(error, resp);
        return;
    }

    const [error, delete_account] = await account_services.delete_account(userInfo, password, token);
    if(error){
        showError(error, resp);
        return
    }

    if(delete_account === true){
        resp.cookie("token", "deleted");
        resp.redirect("/");
        resp.end();

    }else{
        const error = {state: "failed", message: "A system error occurred", type: "sytsem_error"};
        showError(error, resp);
        return
    }
};

module.exports = {
    info,
    update_info,
    upload_profile_pic,
    change_password,
    favorites,
    likes,
    deleteAccount
};