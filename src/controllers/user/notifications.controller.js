const { notificationsTB } = require("../../models/notifications.model");
const { validateUserInputAsNumber } = require("../../utils/validate");
const { sendResponse } = require("../../utils/operations");

async function all(req, resp) {
    const { userInfo } = req;
    const userid = userInfo.id;

    //Quering notifications based on their times
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
};

async function seen(req, resp) {
    const { userInfo } = req;
    
    //Updating notifications seen state
    await notificationsTB.update({
        seen: 1
    }, {
        where: {
            userid: userInfo.id
        }
    });

    const message = {state: "success"};
    sendResponse(message, resp);
};

async function delete_notification(req, resp) {
    const { notifId } = req.params;
    const { userInfo } = req;

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
            return;

        }else{
            const message = {state: "failed"};
            sendResponse(message, resp, {}, 500);
            return;
        }
    }

    //Validating user input
    if(! await validateUserInputAsNumber(notifId)){
        const message = {state: "failed", message: "Notification not found"};
        sendResponse(message, resp, {}, 404);
        return;
    }

    //Deleting the notification
    const deleteNotif = await notificationsTB.destroy({
        where: {
            id: notifId,
            userid: userInfo.id
        }
    });

    if(deleteNotif){
        const message = {state: "success"}
        sendResponse(message, resp);
        return;

    }else{
        const message = {state: "failed"}
        sendResponse(message, resp);
        return;
    }
};

module.exports = {
    all, 
    seen,
    delete_notification
};