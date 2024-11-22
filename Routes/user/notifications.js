const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { notificationsTB } = require("../../database");
const { validateUserInputAsNumber } = require("../../utils/validate");
const { sendResponse } = require("../../utils/opt");

router.get("/", async (req, resp) => {
    const { userInfo } = req;
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

    const message = {state: "success", notifications: notifcations};
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