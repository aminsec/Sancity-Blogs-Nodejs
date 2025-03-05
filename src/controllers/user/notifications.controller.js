const { notificationsTB } = require("../../models/notifications.model");
const { validateUserInputAsNumber } = require("../../utils/validate");
const { sendResponse, showError } = require("../../utils/operations");
const notif_services = require("../../services/user/notifications.service");

async function all(req, resp) {
    const { userInfo } = req;
    const userid = userInfo.id;

    const [error, notifications] = await notif_services.get_notifications(userid);
    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success", notifications: notifications};
    sendResponse(message, resp);
};

async function seen(req, resp) {
    const { userInfo } = req;
    
    const [error, _ ] = await notif_services.seen_notifs(userInfo);
    if(error){
        showError(error, resp);
        return;
    }

    const message = {state: "success"};
    sendResponse(message, resp);
};

async function delete_notification(req, resp) {
    const { notifId } = req.params;
    const { userInfo } = req;

    //Validating user input
    if(notifId !== "all" && ! await validateUserInputAsNumber(notifId)){
        const error = {message: "Invalid notification id", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    const [error, delete_notif_result] = await notif_services.delete_notification(userInfo, notifId);
    if(error){
        showError(error, resp);
        return;
    }

    if(delete_notif_result === true){
        const message = {state: "success"};
        sendResponse(message, resp);
        return;

    }else{
        const error = {message: "Couldn't delete notifications", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }
};

module.exports = {
    all, 
    seen,
    delete_notification
};