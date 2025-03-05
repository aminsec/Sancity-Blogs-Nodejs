const { usersTB } = require("../../models/users.model");
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function get_user_ai_requests(userInfo) {
    try {
        //Checking user ai request limits
        const userAiRequests = await usersTB.findOne({
            attributes: ["ai_requests"],
            where: {
                userid: userInfo.id
            }
        });

        return [null, userAiRequests];

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function make_summary(userInfo, blogInfo) {
    //Checking user ai request limits
    const [error, userAiRequests] = await get_user_ai_requests(userInfo); 
    if(error){
        return [error, null];
    }
    
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
            `;

            const aiResponse = await model.generateContent(prompt);

            //Cleaning ai response to make it convertable 
            let aiResponseText = aiResponse.response.text();
            const regxToRemoveLineBreaks = new RegExp(/\n/g);
            
            //Will remove ```json from beginning and ``` from the end and converts to json
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
                    return [null, aiResponseText.summarize, newUserAiRequests];

                }else{
                    const error = {message: "A system error occurred ", state: "failed", type: "system_error"};
                    return [error, null];
                }

            }else{
                const error = {message: "Ai didn't provide any response. Please try again later", state: "failed", type: "system_error"};
                return [error, null];
            }

        } catch (err) {
            //Logging error if connecting to ai reached to an error
            console.log(err)
            const error = { message: "Couldn't connect to AI", state: "failed", type: "system_error"};
            return [error, null];
        }

    }else{
        const error = {message: "You have reached to daily limit. Please wait untill tommorow.", state: "failed", type: "access_denied"};
        return [error, null];
    }
};

module.exports = {
    make_summary,
    get_user_ai_requests,
};