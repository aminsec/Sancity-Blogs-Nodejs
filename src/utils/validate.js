const jwt = require('jsonwebtoken');
const { sendResponse } = require("./operations");
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

async function validateBlogValues(bannerPic, thumbnail, title, body, tags, option, resp){
    //Validating user inputs
    if(await isUndefined(resp, bannerPic, thumbnail, title, body, tags, option)) return false;

    if(title == "" || body == ""){
        const message = {state: "failed", message: "Fields can not be empty"};
        sendResponse(message, resp, {}, 400);
        return false;
    }

    //Checking options value
    if(!option.hasOwnProperty("is_public") || !option.hasOwnProperty("commentsOff") || !option.hasOwnProperty("showLikes")){
        const message = {state: "failed", message: "Invalid options"};
        sendResponse(message, resp, {}, 400);
        return false;
    }
    
    //Checking options types 
    for(key of Object.values(option)){
        if(!await validateType(resp, "boolean", key)) return false;
    }
   

    //Preventing DOS by checking tags length
    if(tags.length > 255){
        const message = {state: "failed", message: "Tags are too long"}
        sendResponse(message, resp, {}, 400);
        return false;
    }

    //Preventing DOS by checking title length
    if(title.length > 120){
        const message = {state: "failed", message: "Title is too long"}
        sendResponse(message, resp, {}, 400);
        return false;
    }

    //Preventing DOS by checking blog length
    if(body.length > 60000){
        const message = {state: "failed", message: "Body is too long"}
        sendResponse(message, resp, {}, 400);
        return false;
    }

    if(tags != ""){
        //Validating tags
        if(!tags.startsWith("#")){
            const message = {state: "failed", message: "Tags must start with '#'"};
            sendResponse(message, resp, {}, 400);
            return false;
        }
        var tagsValue = tags.split("#");
        tagsValue.splice(0, 1);
        var validTagRegex = new RegExp("^[a-zA-Z0-9_\-]+$");
        for(var tag of tagsValue){
            if(!tag.match(validTagRegex)){
                const message = {state: "failed", message: "Just numbers and characters are allowed as tag"};
                sendResponse(message, resp, {}, 400);
                return false;
            }
        }
    }

    if(body.length < 100){
        const message = {state: "failed", message: "Body must be at least 100 character"};
        sendResponse(message, resp, {}, 400);
        return false
    }

    try {
        if(bannerPic){
            const base64Data = bannerPic.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            let randomFileName = crypto.createHash('md5').update((Date.now() + Math.random()).toString()).digest("hex");
            var blog_image = "/api/v1/profilePics/" + randomFileName;
            const filePath = path.join("/var/www/html/api/", 'uploads', `${randomFileName}`);
            fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                    console.log(err);
                }
            });
        }

        if(thumbnail){
            const base64Data = thumbnail.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            let randomFileName = crypto.createHash('md5').update((Date.now() + Math.random()).toString()).digest("hex");
            var blog_thumbnail = "/api/v1/profilePics/" + randomFileName;
            const filePath = path.join("/var/www/html/api/", 'uploads', `${randomFileName}`);
            fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                    console.log(err);
                }
            });
        }
    } catch (error) {
        const message = {state: "failed", message: "Couldn't upload image"};
        sendResponse(message, resp, {}, 500);
        return false
    }

    return {state: "sucess", blog_image: blog_image, blog_thumbnail: blog_thumbnail};
};

//A function to check type of variables
async function validateType(resp, expectedType, ...variables){
    for(vals of variables){
        if(typeof vals != expectedType){
            const message = {message: "Invalid input type", state: "failed"};
            sendResponse(message, resp, {}, 400);
            return false
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
        const message = {message: "All fields required", state: "failed"};
        sendResponse(message, resp, {}, 400);
        return true
    }
    
    return false
};

//A function to validate username rules
async function validateUsername(username, resp){
    if(username.length < 3) {
        const message = {message: "Username is too short", state: "failed"};
        sendResponse(message, resp, {}, 400);
        return false
    }

    if(username.length > 24){
        const message = {message: "Maximum length for username is 24 character", state: "failed"};
        sendResponse(message, resp, {}, 400);
        return false
    }

    const checkUsernameRG =  new RegExp('^[a-zA-Z0-9_]+$');
    const isValidUsername = username.match(checkUsernameRG);
    if(!isValidUsername){
        const message = {message: "Username can only contain a-z and 0-9", state: "failed"};
        sendResponse(message, resp, {}, 400);
        return false
    }

    return true
};

async function validateCommentValues(comment, resp){
    //This regex matches only spaces 
    var invalidInputRegex = new RegExp("^\\s+$");

    //Validating comment content
    if(comment == undefined){
        const message = {state: "failed", message: "comment parameter required"};
        sendResponse(message, resp, {}, 404);
        return false;
    }

    if(comment == ""){
        const message = {state: "failed", message: "Leave a valid comment"};
        sendResponse(message, resp, {}, 404);
        return false;
    }
    
    if(comment.match(invalidInputRegex)){
        const message = {state: "failed", message: "Leave a valid comment"};
        sendResponse(message, resp, {}, 404);
        return false;
    }

    if(comment.length > 276){
        const message = {state: "failed", message: "Comment is too long"};
        sendResponse(message, resp, {}, 404);
        return false;
    }

    return true;
}

module.exports = {
    validateUserInputAsNumber,
    validateCommentValues,
    validateBlogValues,
    validateUsername,
    validateBlogInfo,
    validateType,
    validateWST,
    validateWSM,
    isUndefined
}