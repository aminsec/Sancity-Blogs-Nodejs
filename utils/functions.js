const { notificationsTB } = require("../database");

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
function sendResponse(data, resp){
    resp.setHeader("Content-Type", "application/json");
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

function checkBlogInfo(blogData, keys){
    var validBlog = {};
    for(index in keys){
        for(blogDagtaKeys in blogData){
            if(keys[index] == blogDagtaKeys){
                validBlog[blogDagtaKeys] = blogData[blogDagtaKeys];
            }
        }
    };
    if(validBlog.showLikes == 0){
        validBlog.likes = "private"
    } 
    return validBlog;
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
}

module.exports = {
    validateUserInputAsNumber,
    sendResponse,
    removeItemFromArray,
    checkBlogInfo,
    createNotification
}