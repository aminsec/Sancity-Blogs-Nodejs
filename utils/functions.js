const { notificationsTB } = require("../database");
const jwt = require('jsonwebtoken');

function validateUserInputAsNumber(value) {
    value = value.toString();
    const validBlogNumberRG =  new RegExp('^[0-9]+$'); //This regex gets only numbers
    const isValidBlogNumber = value.match(validBlogNumberRG);
    if(isValidBlogNumber){
        return true
    }
    return false
};

//Function to send normall messages
function sendResponse(data, resp, headers = {}, code = 200){
    headers["Content-Type"] = "application/json"; //Setting content-type to json
    resp.statusCode = code; //Setting status code
    resp.header(headers);
    resp.send(JSON.stringify(data)); 
    resp.end();
};

function removeItemFromArray(array, item){
    const indexOfItem = array.indexOf(item);
    if (indexOfItem > -1){
        array.splice(indexOfItem, 1);
    }
    return array
};

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

async function createNotification(notif){
    const createNotif = await notificationsTB.create({
        userid: notif.userid,
        acted_userid: notif.acted_userid,
        action_name: notif.action_name,
        blog_id: notif.blog_id ? notif.blog_id : null,
        notif_title: notif.notif_title,
        comment_id: notif.comment_id ? notif.comment_id : null,
        timestamp: Date.now().toString(),
        seen: 0
    })
};

async function validateWST(token){
    try {
        const userInfo = jwt.verify(token, process.env.JWT_SECRET);
        return [true, userInfo];
    } catch (error) {
        return [false, null];
    }
}

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
}

async function isUndefined(resp, ...params){
    if(params.includes(undefined)){
        const message = {message: "All fields required", state: "failed"};
        sendResponse(message, resp, {}, 400);
        return true
    }
    
    return false
}

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
}

module.exports = {
    validateUserInputAsNumber,
    sendResponse,
    removeItemFromArray,
    validateBlogInfo,
    createNotification,
    validateWSM,
    validateWST,
    isUndefined,
    validateUsername
}