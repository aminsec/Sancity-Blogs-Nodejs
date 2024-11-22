const express = require('express');
const router = express.Router();
const { sendResponse } = require("../../utils/opt");
const { validateUserInputAsNumber, isUndefined } = require("../../utils/validate");
const { messagesTB } =  require("../../database");

router.get("/:contact", async (req, resp) => {
    const { userInfo } = req;
    const { contact } = req.params;
    var { limit } = req.query;
    var { offset } = req.query;
    
    //Validating limit and offset value
    if((await isUndefined(resp, limit, offset)) || (limit > 1000 || offset > 1000)){
        const message = {state: "failed", message: "Invalid limit or offset value"};
        sendResponse(message, resp);
        return
    }

    if(! await validateUserInputAsNumber(limit, offset)){
        const message = {state: "failed", message: "Invalid limit or offset value"};
        sendResponse(message, resp);
        return
    }
    
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
        const message = {state: "success", messages: {sents: sentMessages,receiveds: receivedMessages}};
        sendResponse(message, resp);
    }else{
        const message = {state: "failed", message: "User not found"};
        sendResponse(message, resp);
    }
});

module.exports = router;