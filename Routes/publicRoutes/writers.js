const express = require('express');
const router = express.Router();
const { usersTB } = require("../../database");
const { validateUserInputAsNumber } = require("../../utils/functions");
const { sendResponse } = require("../../utils/functions");

router.get("/:userid", async (req, resp) => {
    const { userid } = req.params;

    if(!validateUserInputAsNumber(userid)){
        const message = {state: "failed", message: "User not found"};
        sendResponse(message, resp);
        return
    }

    const user = await usersTB.findOne({
        where: {
            userid: userid
        }
    });

    if(user){
        const userData = user.dataValues;
        var data = {
            userid: userData.userid,
            username: userData.username,
            profilePic: userData.profilePic,
            joinDate: userData.joinDate
        }; 
        
        const message = {state: "success", user: data};
        sendResponse(message, resp);
        return
    }else{
        const message = {state: "failed", message: "User not found"};
        sendResponse(message, resp);
        return
    }
});

module.exports = router;