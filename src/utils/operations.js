const { usersTB } = require("../models/users.model");
const { notificationsTB } = require("../models/notifications.model");
const bcrypt = require("bcrypt");
const axios = require('axios');
const fs = require('fs');
const path = require('path');

//Function to send normall messages
function sendResponse(data, resp, headers = {}, code = 200){
    headers["Content-Type"] = "application/json"; //Setting content-type to json
    resp.statusCode = code; //Setting status code
    resp.header(headers);
    resp.send(JSON.stringify(data)); 
    resp.end();
};

function showError(error, resp){
    sendResponse(error, resp, {}, (
        error.type === "not_found" ? 404 : 
        error.type === "system_error" ? 500 : 
        error.type === "creds_error" ? 401 : 
        error.type === "access_denied" ? 403 : 
        error.type === "input_error" ? 400 : 
        null));

    if(error.type === "system_error"){
        console.log(error.message);
    }
    return;
}

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
    });
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

//Function to create and compare bcrypt 
async function genBcrypt(operation, userPass, hashedPassword){
    const saltRounds = 10;
    if(operation == "create"){
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(userPass, salt);
        return hashedPassword
    }

    if(operation == "compare"){
        const result = await bcrypt.compare(userPass, hashedPassword);
        return result
    }
};

async function downloadImageAndSave(originalImageURL, filePath, fileName) {
    try {
        const response = await axios({
            url: originalImageURL,
            method: 'GET',
            responseType: 'stream',
        });

        const outputPath = path.join(filePath, fileName);
        const writer = fs.createWriteStream(outputPath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

    } catch (error) {
        console.error(`Failed to download image: ${error.message}`);
        return false;
    }
};

module.exports = {
    genBcrypt,
    showError,
    sendResponse,
    removeItemFromArray,
    createNotification,
    queryUserInfo,
    sortObjectByValuesDescending,
    downloadImageAndSave
}
