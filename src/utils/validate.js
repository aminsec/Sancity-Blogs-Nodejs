const jwt = require('jsonwebtoken');
const { showError } = require("./operations");
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

async function validateUserInputAsNumber(...value) {
    for(vals of value){
        num = vals.toString();
        const validBlogNumberRG =  new RegExp('^[0-9]+$'); //This regex gets only numbers
        const isValidBlogNumber = num.match(validBlogNumberRG);
        if(isValidBlogNumber){
            continue
        }else{
            return false
        }
    }

    return true
};

//A function to removing sensitive fields from blog info
async function validateBlogInfo(blog, extraKeysToBeFilter = []){
    //Defining sensitive keys 
    var keysToBeFilter = ["blog_magicToken", "magicToken_exp"];
    
    //Concatinating keys to be filter
    keysToBeFilter.concat(extraKeysToBeFilter); 
    
    //Removing sensitive keys
    keysToBeFilter.map(key => {
        if(blog[key] || blog[key] == null){
            delete blog[key];
        }
    });

    if(blog.showLikes == 0){
        blog.likes = "private"
    } 
    return blog;
};

function validateUserInfo(userInfo){
    //giving only public information
    var data = {}
    data.userid = userInfo.userid;
    data.username = userInfo.username;
    data.bio = userInfo.bio;
    data.profilePic = userInfo.profilePic;
    data.joinDate = userInfo.joinDate;
    return data;
}

async function validateBlogValues(bannerPic, thumbnail, title, body, tags, option, resp){
    //Validating user inputs
    if(await isUndefined(resp, bannerPic, thumbnail, title, body, tags, option)) return false;

    if(title == "" || body == ""){
        const error = {message: "Fields can not be empty", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }

    //Checking options value
    if(!option.hasOwnProperty("is_public") || !option.hasOwnProperty("commentsOff") || !option.hasOwnProperty("showLikes")){
        const error = {message: "Invalid option values", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }
    
    //Checking options types 
    for(key of Object.values(option)){
        if(!await validateType(resp, "boolean", key)) return false;
    }
   

    //Preventing DOS by checking tags length
    if(tags.length > 255){
        const error = {message: "Tags are too long", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }

    //Preventing DOS by checking title length
    if(title.length > 120){
        const error = {message: "Title is too long", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }

    //Preventing DOS by checking blog length
    if(body.length > 60000){
        const error = {message: "Body is too long", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    if(tags != ""){
        //Validating tags
        if(!tags.startsWith("#")){
            const error = {message: "Tags must start with # character", state: "failed", type: "input_error"};
            showError(error, resp);
            return false;
        }
        var tagsValue = tags.split("#");
        tagsValue.splice(0, 1);
        var validTagRegex = new RegExp("^[a-zA-Z0-9_\-]+$");
        for(var tag of tagsValue){
            if(!tag.match(validTagRegex)){
                const error = {message: "Just numbers and characters are allowed as tag", state: "failed", type: "input_error"};
                showError(error, resp);
                return false;
            }
        }
    }

    if(body.length < 100){
        const error = {message: "Body must have at least 100 character", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }

    return {state: "sucess"};
};

//A function to check type of variables
async function validateType(resp, expectedType, ...variables){
    for(vals of variables){
        if(typeof vals != expectedType){
            const error = {message: "Invalid input values", state: "failed", type: "input_error"};
            showError(error, resp);
            return false;
        }
    }

    return true
};

//A function to validate web-scoket token
async function validateWST(token){
    try {
        const userInfo = jwt.verify(token, process.env.JWT_SECRET);
        return [true, userInfo];
    } catch (error) {
        return [false, null];
    }
};

//A function to validate web-scoket messages
async function validateWSM(message){
    try {
        const data = JSON.parse(message); //Parsing message comming from client and returning it if it's valid
        if(data.message.length > 1000000){
            return [false, null]; //Returning false if message lenght is big
        }
        const [isValidToken, userInfo] = await validateWST(data.token); //Validating user token on each message
        if(isValidToken == false){
            return [false, null];
        };
        data.userInfo = userInfo;
        return [true, data];
      } catch (error) {
        return [false, null];
      }
};

//A function to check variable(s) are undefined or not
async function isUndefined(resp, ...params){
    if(params.includes(undefined)){
        const error = {message: "All fields required", state: "failed", type: "input_error"};
        showError(error, resp);
        return true;
    }
    
    return false
};

//A function to validate username rules
async function validateUsername(username, resp){
    if(username.length < 3) {
        const error = {message: "Username is too short", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }

    if(username.length > 24){
        const error = {message: "Maximum length for username is 24 character", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }

    const checkUsernameRG =  new RegExp('^[a-zA-Z0-9_]+$');
    const isValidUsername = username.match(checkUsernameRG);
    if(!isValidUsername){
        const error = {message: "Username can only contains a-z and 0-9", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }

    return true
};

async function validateCommentValues(comment, resp){
    //This regex matches only spaces 
    var invalidInputRegex = new RegExp("^\\s+$");

    //Validating comment content
    if(comment == undefined){
        const error = {message: "All fields required", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }

    if(comment == ""){
        const error = {message: "Invalid input values", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }
    
    if(comment.match(invalidInputRegex)){
        const error = {message: "Invalid input values", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }

    if(comment.length > 276){
        const error = {message: "Comment is too long", state: "failed", type: "input_error"};
        showError(error, resp);
        return false;
    }

    return true;
}

module.exports = {
    validateUserInputAsNumber,
    validateCommentValues,
    validateBlogValues,
    validateUsername,
    validateUserInfo,
    validateBlogInfo,
    validateType,
    validateWST,
    validateWSM,
    isUndefined
}