const { sendResponse, showError } = require('../../utils/operations');
const { isUndefined } = require('../../utils/validate');
const { get_public_blog_by_id } = require("../../services/public/public_blogs.service");
const ai_services = require("../../services/user/ai.service");

async function summary(req, resp) {
    const { blogId } = req.body;
    const { userInfo } = req;

    //Checking user input
    if(await isUndefined(resp, blogId)) return;

    //Checking blog is public 
    const [error, blogInfo ] = await get_public_blog_by_id(blogId);
    if(error){
        showError(error, resp);
        return;
    }

    const [err, summary, used_ai] = await ai_services.make_summary(userInfo, blogInfo);
    if(err){
        showError(err, resp);
        return;
    }

    const message = {state: "success", used_ai, notes: summary};
    sendResponse(message, resp);
};

module.exports = {
    summary
};