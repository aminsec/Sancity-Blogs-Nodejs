const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require('pexels');
const { exec } = require("child_process");
const crypto = require('crypto');
const { blogsTB, generated_ai_blogsTB } = require("../database");
const { downloadImageAndSave } = require("../utils/opt");

async function Generate_blog(){
    //Connecting to ai to get a random blog
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    var model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    //Getting generated subjects to prevent repetition
    let subjectsList = [];
    const generatedSubjectList = await generated_ai_blogsTB.findAll({
        attributes: ["subject"]
    });

    for(vals of generatedSubjectList){
        subjectsList.push(vals.subject)
    }

    //AI prompt
    const prompt = `
        Im talking to you via API not web interface. I wanna ask you a very very long blog to add my DB, please talk to me in json format and don't include any character that could break json 
        and don't include the json in md format. The blog content must be greater than 900 words. And the tags must only include a-z and 0-9.
        ${subjectsList.length > 0 ? `The blog subject must not be the following list: ${subjectsList.join(' ')}` : ""}
        I want to you to include these in json:
         - blog subject in one word
         - blog title
         - blog body
         - blog tags in array format
        
        If you could answer successful please answer in this json format:
        {   
            state: "success",
            subject: <subject>,
            title: <title>,
            body: <Blog contet>,
            tags: <Tags>,
        }

        If you couldn't answer for any reason please answer in this format:
        {
            state: "failed",
            reason: <reason>
        }
    `;

    try {
        var aiResponse = await model.generateContent(prompt);
    } catch (error) {
        console.log("Google Ai didn't respone.", error);
        return
    }
    

    //Cleaning ai response to make it convertable 
    let aiResponseText = aiResponse.response.text();
    const regxToRemoveLineBreaks = new RegExp(/\n/g);
    
    try {
        //This will remove ```json from beginning and ``` from the end and converts to json
        aiResponseText = JSON.parse(aiResponseText.replace(regxToRemoveLineBreaks, "").slice(7, aiResponseText.length).slice(0, -3)); 
    } catch (error) {
        console.log("Couldn't parse AI response.", error);
        return
    }
   
    //Preparing tags
    const blogTags = `#${aiResponseText.tags.join("#")}`;

    //Connecting to pexels to get a related image to blog
    const client = createClient(process.env.PEXELS_KEY);
    const query = aiResponseText.subject;

    //Quering to get an image
    client.photos.search({ query, per_page: 1 }).then(async photos => {
        //Checking if any image exists
        if(photos.photos.length == 0){
            throw new Error("There is no image related to this blog.");
        };

        //Getting images for banner and thumbnail
        const imageURL = photos.photos[0].src.landscape; //For banner
        const thumbnailURL =  photos.photos[0].src.tiny; //For thumbnail

        //Changing image size
        let originalImageURL = new URL(imageURL);
        originalImageURL.searchParams.set('w', '2900');
        originalImageURL.searchParams.set('h', '390');
        originalImageURL = originalImageURL.toString();

        //Downloading the image and saving it in /uploads
        const imageFileName = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
        const thumbnailFileName = crypto.createHash('md5').update(imageFileName).digest('hex');
        const uploadPath = "/var/www/html/api/uploads";
        const bannerAPIPath = "/api/v1/profilePics/" + imageFileName;
        const thumbnailAPIPath = "/api/v1/profilePics/" + thumbnailFileName;

        //Downloading banner
        const bannerResult = await downloadImageAndSave(originalImageURL, uploadPath, imageFileName);
        if(bannerResult == false){
            throw "Couldn't download banner";
        }

        //Downloading thumbnail
        const thumbnailResult = await downloadImageAndSave(thumbnailURL, uploadPath, thumbnailFileName);
        if(thumbnailResult == false){
            throw "Couldn't download thumbnail";
        }

        try {
            //Adding the blog into the DB
            const createBlog = await blogsTB.create({
                userid: "108",
                blog_content: aiResponseText.body, 
                blog_image: bannerAPIPath,
                blog_thumbnail: thumbnailAPIPath,
                blog_title: aiResponseText.title,
                tags: blogTags,
                is_public: "1",
                isCommentOff: "0",
                showLikes: "1",
                createdAt: Date.now().toString()
            });
            
            //Adding the created blog subject to createdSubjects list
            const addSubject = await generated_ai_blogsTB.create({
                subject: query,
                createdAt: Date.now().toString()
            });

        } catch (error) {
            console.log("Coulnd't add blog or blog subject to database.", error);
        }
    }).catch(error => {
        console.log("Coulnd't get blog image.", error);
    });
};

Generate_blog();
module.exports = { Generate_blog }