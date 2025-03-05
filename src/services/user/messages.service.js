const { sendResponse } = require("../../utils/operations");
const { messagesTB } = require("../../models/messages.model");

async function get_sent_received_messages(userInfo, contact, limit, offset) {
    try {
        //Converting
        limit = Number(limit);
        offset = Number(offset);
    
        const sentMessages = await messagesTB.findAll({
            where: {
                sender: userInfo.username,
                receiver: contact
            },
    
            limit: limit,
            offset: offset
        });
    
        const receivedMessages = await messagesTB.findAll({
            where: {
                sender: contact,
                receiver: userInfo.username
            },
    
            limit: limit,
            offset: offset
        });
    
        if(sentMessages && receivedMessages){
            const result = {sents: sentMessages, receiveds: receivedMessages};
            return [null, result];
    
        }else{
            const error = {message: "User not found", state: "failed", type: "not_found"};
           return [error, null];
        }

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

module.exports = {
    get_sent_received_messages,
};