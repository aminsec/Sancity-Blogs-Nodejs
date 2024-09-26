const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { notificationsTB } = require("../../database");
const { sendResponse, validateUserInputAsNumber } = require("../../utils/functions");

router.get("/", async (req, resp) => {
    const readyNotifications = [];
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const userid = userInfo.id;

    const notifcations = await notificationsTB.findAll({
        where: {
            userid: userid
        },
        order: [
            ["timestamp", "DESC"]
        ],
        limit: 10
    });

    //Converting timestamp to (5 sep) format
    for(index in notifcations){
        const notifInfo = notifcations[index].dataValues;
        const timestamp = new Date();
        // Use Intl.DateTimeFormat to format the date
        const formatter = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short'
        });

        const formattedDate = formatter.format(timestamp);
        delete notifInfo.timestamp
        notifInfo.date = formattedDate;
        readyNotifications.push(notifInfo);
    };

    const message = {state: "success", notifications: readyNotifications};
    sendResponse(message, resp);
});

router.post("/", async (req, resp) => {
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    const seenNotifs = await notificationsTB.update({
        seen: 1
    }, {
        where: {
            userid: userInfo.id
        }
    });

    const message = {state: "success"};
    sendResponse(message, resp);
});

router.delete("/:notifId", async(req, resp) => {
    const { notifId } = req.params;
    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

    //There are two kinds of notifId here, first an integer like 12,22,34 ... and second is "all"
    if(notifId == "all"){
        const deleteAllNotifs = await notificationsTB.destroy({
            where: {
                userid: userInfo.id
            }
        });

        if(deleteAllNotifs){
            const message = {state: "success"};
            sendResponse(message, resp);
            return
        }else{
            const message = {state: "failed"};
            sendResponse(message, resp);
            return
        }
    }

    if(!validateUserInputAsNumber(notifId)){
        const message = {state: "failed", message: "Notification not found"};
        sendResponse(message, resp);
        return
    }

    const deleteNotif = await notificationsTB.destroy({
        where: {
            id: notifId,
            userid: userInfo.id
        }
    });

    if(deleteNotif){
        const message = {state: "success"}
        sendResponse(message, resp);
        return
    }else{
        const message = {state: "failed"}
        sendResponse(message, resp);
        return
    }
})

module.exports = router;