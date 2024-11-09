const jwt = require('jsonwebtoken');
const { sendResponse } = require("./opt");

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
        if(blog[key]){
            delete blog[key];
        }
    });

    if(blog.showLikes == 0){
        blog.likes = "private"
    } 
    return blog;
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

module.exports = {
    validateUserInputAsNumber,
    validateBlogInfo,
    validateUsername,
    validateType,
    validateWST,
    validateWSM,
    isUndefined
}