const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { sendResponse } = require("../../utils/functions");
const { validateUserInputAsNumber } = require("../../utils/functions");
const { messagesTB } =  require("../../database");

router.get("/:contact", async (req, resp) => {
    const { contact } = req.params;
    var { limit } = req.query;
    var { offset } = req.query;

    //Validating limit and offset value
    if(!limit || !offset){
        const message = {state: "failed", message: "Invalid limit or offset value"};
        sendResponse(message, resp);
        return
    }

    if(!validateUserInputAsNumber(limit) || !validateUserInputAsNumber(offset)){
        const message = {state: "failed", message: "Invalid limit or offset value"};
        sendResponse(message, resp);
        return
    }

    const userInfo = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
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
        const message = {
            sents: sentMessages,
            receiveds: receivedMessages
        };

        sendResponse(message, resp)
    }


});

module.exports = router;