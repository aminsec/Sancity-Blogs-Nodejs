const { notificationsTB, usersTB } = require("../database");

//Function to send normall messages
function sendResponse(data, resp, headers = {}, code = 200){
    headers["Content-Type"] = "application/json"; //Setting content-type to json
    resp.statusCode = code; //Setting status code
    resp.header(headers);
    resp.send(JSON.stringify(data)); 
    resp.end();
};

//A function to remove specific item from array
function removeItemFromArray(array, item){
    const indexOfItem = array.indexOf(item);
    if (indexOfItem > -1){
        array.splice(indexOfItem, 1);
    }
    return array
};

//A function to create notifications to user
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

async function queryUserInfo(userid){
    const info = await usersTB.findOne({
        where: {
            userid: userid
        }
    });

    if(info){
        const userInfo = info.dataValues;
        const data = {
            userid: userInfo.userid,
            username: userInfo.username,
            joinedAt: userInfo.joinDate,
            profilePic: userInfo.profilePic,
            bio: userInfo.bio
        };

        return data;
    }else{
        const message = {state: "failed", message: "User not found"};
        return message;
    }
}

async function sortObjectByValuesDescending(obj) {
    return new Map(
        Object.entries(obj).sort(([, valueA], [, valueB]) => valueB - valueA)
    );
}

module.exports = {
    sendResponse,
    removeItemFromArray,
    createNotification,
    queryUserInfo,
    sortObjectByValuesDescending
}
