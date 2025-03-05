const { notificationsTB } = require("../../models/notifications.model");

async function send_notificaiton(notif){
    try {
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

        if(createNotif){
            return [null, true];

        }else{
            const error = {message: "Media not found", state: "failed", type: "not_found"};
            return [error, null];
        }
    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function get_notifications(userid) {
    try {
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

        return [null, notifcations];

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function seen_notifs(userInfo) {
    try {
        //Updating notifications seen state
        await notificationsTB.update({
            seen: 1
        }, {
            where: {
                userid: userInfo.id
            }
        });

        return [null, true];

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function delete_notification(userInfo, notifId) {
    try {
        //There are two kinds of notifId here, first an integer like 12,22,34 ... and second is "all"
        if(notifId == "all"){
            await notificationsTB.destroy({
                where: {
                    userid: userInfo.id
                }
            });

            return [null, true];
        }

        //Deleting notification by id
        const deleteNotif = await notificationsTB.destroy({
            where: {
                id: notifId,
                userid: userInfo.id
            }
        });

        if(deleteNotif){
            return [null, true];

        }else{
            const error = {message: "Notification not found", state: "failed", type: "not_found"};
            return [error, null];
        }
        
    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

module.exports = {
    delete_notification,
    send_notificaiton,
    get_notifications,
    seen_notifs,
};

