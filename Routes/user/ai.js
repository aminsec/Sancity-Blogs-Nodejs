const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { blogsTB, usersTB } = require('../../database');
const { sendResponse } = require('../../utils/opt');
const { isUndefined } = require('../../utils/validate');

router.post('/summary', async (req, resp) => {
    const { blogId } = req.body;
    const { userInfo } = req;

    if(await isUndefined(resp, blogId)) return;

    //Checking blog is public 
    const blogInfo = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            is_public: 1
        }
    });

    if(!blogInfo){
        const message = {state: "failed", message: "Blog not found"}
        sendResponse(message, resp, {}, 404);
        return
    }

    //Checking user ai request limits
    const userAiRequests = await usersTB.findOne({
        attributes: ["ai_requests"],
        where: {
            userid: userInfo.id
        }
    });

    if(userAiRequests.ai_requests < 5){
        //Contacting Gemini AI
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            //Ai prompt
            const prompt = `
                Im talking to you via API not web interface. I wanna give you a blog to summarize it, please talk to me in json format and don't include any character that could break json 
                and don't include the json in md format.
                Summarize the blog and extract important lines and put each line in array value.

                If you could summarize the blog answer in this format:
                {
                    "state": "success",
                    "summarize": [
                        "Important line 1",
                        "Important line 2",
                        "Important line 3",
                        ...
                    ]
                }

                if you couldn't summarize the blog for any reasone, answer in this format:
                {
                    "state": "failed",
                    "reasone": <reasone>
                }

                The blog body: 
                ${blogInfo.blog_content}
            `  

            const aiResponse = await model.generateContent(prompt);

            //Cleaning ai response to make it convertable 
            const regxToRemoveLineBreaks = new RegExp(/\n/g);
            let aiResponseText = aiResponse.response.text();

            //Will remove ```json from beginning and ``` from the end and convert to json
            aiResponseText = JSON.parse(aiResponseText.replace(regxToRemoveLineBreaks, "").slice(7, aiResponseText.length).slice(0, -3)); 
            
            if(aiResponseText.state == "success"){
                //Increasing user daily ai request limit
                const newUserAiRequests = userAiRequests.ai_requests + 1;
                const updateUserAiRequests = await usersTB.update({
                    ai_requests: newUserAiRequests
                }, {
                    where: {
                        userid: userInfo.id
                    }
                });

                if(updateUserAiRequests){
                    //Showing ai response to user
                    const message = {state: "success", used_ai: newUserAiRequests, notes: aiResponseText.summarize};
                    sendResponse(message, resp);
                    return
                }else{
                    const message = {state: "failed", message: "An error accoured during updating user data"};
                    sendResponse(resp, message, {}, 500);
                    return
                }
            }else{
                const message = {state: "failed", message: "Contacting to ai reached to an error. Please try again later"};
                sendResponse(message, resp, {}, 403);
                console.log(aiResponseText.reasone);
                return
            }

        } catch (error) {
            //Logging error if connecting to ai reached to an error
            const message = {state: "failed", message: "Couldn't connect to AI"};
            sendResponse(message, resp, {}, 500);
            console.log(error);
            return
        }
    }else{
        const message = {state: "failed", message: "You have reached to daily limit. Please wait untill tommorow."};
        sendResponse(message, resp, {}, 401);
        return
    }
});

module.exports = router;