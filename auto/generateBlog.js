const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require('pexels');
const { exec } = require("child_process");
const crypto = require('crypto');
const { blogsTB, generated_ai_blogsTB } = require("../database");

async function Generate_blog(){
    //Connecting to ai to get a random blog
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
        var model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (error) {
        console.log("Coulnd't connect to google ai.", error);
        return;
    };

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

    const aiResponse = await model.generateContent(prompt);

    //Cleaning ai response to make it convertable 
    let aiResponseText = aiResponse.response.text();
    const regxToRemoveLineBreaks = new RegExp(/\n/g);
            
    //This will remove ```json from beginning and ``` from the end and converts to json
    aiResponseText = JSON.parse(aiResponseText.replace(regxToRemoveLineBreaks, "").slice(7, aiResponseText.length).slice(0, -3)); 
    
    //Preparing tags
    const blogTags = `#${aiResponseText.tags.join("#")}`;

    //Connecting to pexels to get a related image to blog
    const client = createClient(process.env.PEXELS_KEY);
    const query = aiResponseText.subject;

    //Quering to get an image
    client.photos.search({ query, per_page: 1 }).then(async photos => {
        //Checking if any image exists
        if(photos.photos.length == 0){
            console.log("Couldn't found related image");
            return
        };

        //Getting image
        const imageURL = photos.photos[0].src.landscape;
        
        //Changing image size
        let originalImageURL = new URL(imageURL);
        originalImageURL.searchParams.set('w', '2600');
        originalImageURL.searchParams.set('h', '380');
        originalImageURL = originalImageURL.toString();

        //Downloading the image and saving it in /uploads
        const imageFileName = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
        const imageAPIPath = "/api/v1/profilePics/" + imageFileName;
        exec(`curl "${originalImageURL}" -o /var/www/html/api/uploads/${imageFileName}`, async (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
        });

        //Adding the blog into the DB
        const createBlog = await blogsTB.create({
            userid: "108",
            blog_content: aiResponseText.body, 
            blog_image: imageAPIPath,
            blog_title: aiResponseText.title,
            tags: blogTags,
            is_public: "1",
            isCommentOff: "0",
            showLikes: "1",
            createdAt: Date.now().toString()
        });
        console.log(aiResponse.subject)
        const addSubject = await generated_ai_blogsTB.create({
            subject: query,
            createdAt: Date.now().toString()
        });

        if(createBlog && addSubject){
            console.log("New blog created");
        }else{
            console.log("Couldn't create blog");
        }
    });
};

module.exports = { Generate_blog }