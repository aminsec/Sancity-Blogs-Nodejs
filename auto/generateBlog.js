const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require('pexels');
const { exec } = require("child_process");
const crypto = require('crypto');
const { blogsTB } = require("../database");


async function Generate_blog(){
    //Connecting to ai to get a random blog
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    //AI prompt
    const prompt = `
        Im talking to you via API not web interface. I wanna ask you a very very long blog to add my DB, please talk to me in json format and don't include any character that could break json 
        and don't include the json in md format. The blog content must be greater than 900 words.
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
    `  

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
        const imageURL = photos.photos[0].src.landscape;
        console.log(imageURL)
        //Downloading the image and saving it in /uploads
        const filename =  crypto.createHash('md5').update(Date.now().toString()).digest('hex');
        console.log(filename)
        exec(`curl "${imageURL}" -o /var/www/html/api/uploads/${filename}`, async (error, stdout, stderr) => {
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
            blog_image: filename,
            blog_title: aiResponseText.title,
            tags: blogTags,
            is_public: "1",
            isCommentOff: "0",
            showLikes: "1",
            createdAt: Date.now().toString()
        });

        if(createBlog){
            console.log("New blog created")
        }
    });

}

Generate_blog();