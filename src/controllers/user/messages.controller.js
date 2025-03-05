const { validateUserInputAsNumber, isUndefined } = require("../../utils/validate");
const messages_services = require("../../services/user/messages.service");
const { showError, sendResponse } = require("../../utils/operations");

async function get_messages(req, resp) {
    const { userInfo } = req;
    const { contact } = req.params;
    var { limit } = req.query;
    var { offset } = req.query;
    
    //Validating limit and offset value
    if(await isUndefined(resp, limit, offset)) return;
    
    if(limit > 1000 || offset > 1000){
        const error = { message: "Invalid limit or offset value", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    if(! await validateUserInputAsNumber(limit, offset)){
        const error = { message: "Invalid limit or offset value", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    const [error, result] = await messages_services.get_sent_received_messages(userInfo, contact, limit, offset);
    if(error){
        showError(error, resp);
        return;
    }

    const messages = {state: "success", messages: result};
    sendResponse(messages, resp);
};

module.exports = {
    get_messages
};