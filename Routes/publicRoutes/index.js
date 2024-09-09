const express = require('express');
const router = express.Router();
const { usersTB, blogsTB } = require("../../database");

//Function to send normall messages
function sendResponse(data, resp){
    resp.setHeader("Content-Type", "application/json");
    resp.send(JSON.stringify(data));
    resp.end();
}

router.get("/search", async (req, resp) => {
    if(!req.query.q){
        sendResponse({"state": "failed", "message": "No blogs found"}, resp);
        return
    }
    const userSearchQuery = req.query.q; //getting user input
    const userSearchQueryList = userSearchQuery.split(" "); //Spliting the user input to have better match with blogs tags
    //Defining score to each blog to sort the most related blogs to user search query
    var blogsScore = {};
    var sortedBlogsScore = new Map(); //using map to save the add sorting. (Object doesn't support)
    var sortedRelatedBlogs = [];
    //Getting all blogs
    const allBlogs = await blogsTB.findAll({
        where: {
            is_public: 1
        }
    })

    //Getting blogs' tags
    for(var i = 0; i < allBlogs.length; i++){
        var blogTag = allBlogs[i].dataValues.tags;
        blogsScore[allBlogs[i].dataValues.blog_id] = 0;
        //spliting tags
        var tags = blogTag.split("#");
        tags.splice(0, 1); //removing the first index that is null
        //if user input was match with tags of blog, the blog gets one score 
        for(var k = 0; k < tags.length; k++){
            for(var j = 0; j < userSearchQueryList.length; j++){
                if(tags[k].includes(userSearchQueryList[j])){
                    blogsScore[allBlogs[i].dataValues.blog_id] = blogsScore[allBlogs[i].dataValues.blog_id] + 1; //increasing score of the blog, that means it's related to the user search                   
                }
            }
        }
    }


    //removing most unrelated blogs that has 0 score
    for(vals in blogsScore){
        if(blogsScore[vals] == 0){
            delete blogsScore[vals]
        }
    }
    //sorting
    function getKeyByValue(object, value) {
        return Object.keys(object).find(key => object[key] === value);
      }

    var values = Object.values(blogsScore); //getting the scores of blogs to sort 
    var sortedValues = values.sort((a, b) => {return b - a}); //sorting the scores descending
    for(var i = 0; i < sortedValues.length; i++){
       var keys = getKeyByValue(blogsScore, sortedValues[i]);
       sortedBlogsScore.set(keys, sortedValues[i]);
       delete blogsScore[keys]; //removing the object, to prevent duplicate
    }
    

    //getting related blogs id from the sorted list
    var relatedBlogsId = Array.from(sortedBlogsScore.keys());
    //getting the related blogs information 
    for(var i = 0; i < relatedBlogsId.length; i++){
        for(var j = 0; j < allBlogs.length; j++){
            if(relatedBlogsId[i] == allBlogs[j].dataValues.blog_id){
                sortedRelatedBlogs.push(allBlogs[j].dataValues);
                break
            }
        }
    }

    //Implementing some security issues 
    for(var i = 0; i < sortedRelatedBlogs.length; i++){
        if(sortedRelatedBlogs[i].showLikes == 0){
            sortedRelatedBlogs[i].likes = "private"
        }
    }

    //Getting each blog user info
    for(index in sortedRelatedBlogs){
        var userId = sortedRelatedBlogs[index].userid;
        const userInfo = await usersTB.findOne({
            where: {
                userid: userId
            }
        })
        sortedRelatedBlogs[index].user = {username: userInfo.dataValues.username, profilePic: "/statics/img/ProfileDefault.png"}
    }
    
    sendResponse({state: "success", length: sortedRelatedBlogs.length, blogs: sortedRelatedBlogs}, resp)
});

module.exports = router;