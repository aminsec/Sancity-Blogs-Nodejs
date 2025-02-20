const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { usersTB, blogsTB } = require("../../database");
const { validateUserInputAsNumber, validateBlogInfo, validateBlogValues } = require("../../utils/validate");
const { sendResponse, createNotification, removeItemFromArray } = require("../../utils/opt");

router.get("/", async (req, resp) => {
    var blogs = [];
    const { userInfo } = req;

    //Quering all user blogs
    const userBlogs = await blogsTB.findAll({
        where: {
            userid: userInfo.id
        }
    });

    //Validating blogs info
    for(let blog of userBlogs){
        const validatedBlog = await validateBlogInfo(blog.dataValues);
        blogs.push(validatedBlog);
    }

    const message = {state: "success", blogs: blogs};
    sendResponse(message, resp);
});

router.post("/new", async (req, resp) => {
    const { userInfo } = req;
    var { bannerPic, thumbnail, title, body, tags, option} = req.body;

    //Validating blog values before inserting
    const blogResult = await validateBlogValues(bannerPic, thumbnail, title, body, tags, option, resp);
    if(blogResult == false) return;

    //Getting blog created time
    var createdTime = Date.now().toString();

    try {
        await blogsTB.create({
            userid: userInfo.id,
            blog_content: body, 
            blog_image: blogResult.blog_image,
            blog_thumbnail: blogResult.blog_thumbnail,
            blog_title: title,
            tags: tags,
            is_public: option.is_public,
            isCommentOff: option.commentsOff,
            showLikes: option.showLikes,
            createdAt:createdTime
        });
        const data = {message: "Blog added successfully", state: "success"};
        sendResponse(data, resp);
        return
    } catch (error) {
        const data = {message: "Couldn't add blog", state: "failed"};
        sendResponse(data, resp);
        return
    }
});

router.get("/liked-blogs", async (req, resp) => {
    const { userInfo } = req;

    //Quering liked blogs
    const likedBlogs = await usersTB.findOne({
        attributes: ["likedPosts"],
        where: {
            userid: userInfo.id
        }
    });

    var likedBlogsList = likedBlogs.dataValues.likedPosts.split(",");
    const message = {state: "success", liked_blogs: likedBlogsList};
    sendResponse(message, resp);
});

router.get("/saved-blogs", async (req, resp) => {
    const { userInfo } = req;

    //Quering liked blogs
    const likedBlogs = await usersTB.findOne({
        attributes: ["savedPosts"],
        where: {
            userid: userInfo.id
        }
    });

    var likedBlogsList = likedBlogs.dataValues.savedPosts.split(",");
    const message = {state: "success", saved_blogs: likedBlogsList};
    sendResponse(message, resp);
});

router.get("/:blogId", async (req, resp) => {
    var { blogId } = req.params;
    const { userInfo } = req;

    //Quering blog 
    const blog = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            userid: userInfo.id
        }
    })
    
    if(blog){
        const message = {state: "success", blog: blog};
        sendResponse(message, resp);
        return
    }else{
        const message = {state: "failed", message: "Blog not found"};
        sendResponse(message, resp, {}, 404);
        return
    }
});

//Deleting blogs
router.delete("/:blogId", async (req, resp) => {
    const { blogId } = req.params;
    const { userInfo } = req;

    //Validating user input
    if(! await validateUserInputAsNumber(blogId)){
        const message = {state: "failed", message: "Invalid blog number"};
        sendResponse(message, resp, {}, 400);
        return
    }
    
    const deletBlog = await blogsTB.destroy({
        where: {
            blog_id: blogId,
            userid: userInfo.id
        }
    });

   if(deletBlog){
        const message = {state: "success", message: "Blog deleted successfully"};
        sendResponse(message, resp);
        return
   }else{
    const message = {state: "failed", message: "Couldn't delete blog"};
    sendResponse(message, resp);
   }
});

router.get("/:blogId/like", async (req, resp) => {
    var { blogId } = req.params;
    var { userInfo } = req;

    //Checking blog is accessible 
    const blogData = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            is_public: 1
        }
    });

    if(blogData == null){
        const message = {state: "failed", message: "Blog not found"};
        sendResponse(message, resp, {}, 404);
        return
    }

    //Getting user liked blogs. If user already liked the blog, we decrease, otherwise we increase the likes
    const userLikedPosts = await usersTB.findOne({
        attributes: ["likedPosts"],
        where: {
            userid: userInfo.id
        }
    });

    var likedPosts = userLikedPosts.dataValues.likedPosts;
    var likedPostsLists = likedPosts.split(",");
    
    //Checking if user has liked the current blog
    if(likedPostsLists.includes(blogId)){
        //If user has liked the current blog, it means user wants to dislike it, so we remove the blog id from user's likedPosts list
        var newLikedPostsList = await removeItemFromArray(likedPostsLists, blogId);

        //updating user liked posts list 
        var updatedLikedPostsList = newLikedPostsList.join(",");
        const disliked = await usersTB.update({
            likedPosts: updatedLikedPostsList,
        }, {
            where: {
                userid: userInfo.id
            }
        });

        if(disliked){
            //getting current blog's likes 
            const blogInfo = await blogsTB.findOne({
                where: {
                    blog_id: blogId
                }
            });
            var blogLikes = blogInfo.dataValues.likes;
            blogLikes -= 1;

            //Updating blog's likes - 1
            const decreaseLike = await blogsTB.update({
                likes: blogLikes
            },
            {
                where: {
                    blog_id: blogId
                }
            });

            if(decreaseLike){
                const message = {state: "success", message: "Blog disliked successfully"};
                sendResponse(message, resp);
                return
            }else{
                const message = {state: "failed", message: "Coulndn't dislike blog"};
                sendResponse(message, resp, {}, 500);
                return
            }
            
        }else{
            const message = {state: "failed", message: "Coulndn't dislike blog"};
            sendResponse(message, resp, {}, 500);
            return
        }
    
    //If user has not liked the blog, we reduce the blog likes
    }else{
        likedPostsLists.push(blogId);
        var updatedLikedPostsList = likedPostsLists.join(",");
        const liked = await usersTB.update(
            {
                likedPosts: updatedLikedPostsList,
            }, 
            {
                where: {
                    userid: userInfo.id
                }
            });
            
        if(liked){
            //getting current blog's likes 
            const blogInfo = await blogsTB.findOne({
                where: {
                    blog_id: blogId
                }
            });

            var blogLikes = blogInfo.dataValues.likes;
            blogLikes += 1;

            //Updating likes
            const increaseLikes = await blogsTB.update({
                likes: blogLikes
            },
            {
                where: {
                    blog_id: blogId
                }
            });

            if(increaseLikes){
                const message = {state: "success", message: "Blog liked successfully"};
                sendResponse(message, resp);

                //Sending notification to blog owner
                const notifInfo = {
                    userid: blogData.dataValues.userid,
                    notif_title: `${userInfo.username} liked your blog`,
                    acted_userid: userInfo.id,
                    action_name: "liked_blog",
                    blog_id: blogData.dataValues.blog_id
                };

                // preventing users sending notifications to theirselves
                if(notifInfo.userid !== notifInfo.acted_userid){ 
                    createNotification(notifInfo);
                    return
                }
            }
        }else{
            const message = {state: "failed", message: "Coulndn't like blog"};
            sendResponse(message, resp, {}, 500);
            return
        }
    }
});

router.get("/:blogId/save", async (req, resp) => {
    var { blogId } = req.params;
    var { userInfo } = req;
    
    //Checking blog is accessible
    const blogData = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            is_public: 1
        }
    });

    if(blogData == null){
        const message = {state: "failed", message: "Blog not found"};
        sendResponse(message, resp);
        return
    }

    //Getting user saved blogs. If user already saved the posts, we remove it, otherwise we add it to the list
    const userSavedPosts = await usersTB.findOne({
        attributes: ["savedPosts"],
        where: {
            userid: userInfo.id
        }
    });

    var savedPosts = userSavedPosts.dataValues.savedPosts;
    var savedPostsLists = savedPosts.split(",");
    if(savedPostsLists.includes(blogId)){
        //If user has saved the current post, it means user wants to unsave it, so we remove the blogid from user saved list
        var newSavedPostsList = await removeItemFromArray(savedPostsLists, blogId);
        var updatedSavedPostsList = newSavedPostsList.join(",");
        const unsaved = await usersTB.update({
            savedPosts: updatedSavedPostsList,
        }, {
            where: {
                userid: userInfo.id
            }
        });

        if(unsaved){
            const message = {state: "success", message: "Blog unsaved successfully"};
            sendResponse(message, resp);
            return
        }else{
            const message = {state: "failed", message: "Couldn't unsave blog"};
            sendResponse(message, resp, {}, 500);
            return
        }

    }else{
        //If user has not saved the blog, we add the blogId to their list
        savedPostsLists.push(blogId);
        var updatedSavedPostsList = savedPostsLists.join(",");
        const saved = await usersTB.update({
            savedPosts: updatedSavedPostsList,
        }, 
        {
            where: {
                userid: userInfo.id
            }
        });

        if(saved){
            const message = {state: "success", message: "Blog saved successfully"};
            sendResponse(message, resp);
        }else{
            const message = {state: "failed", message: "Couldn't save blog"};
            sendResponse(message, resp, {}, 500);
        }
    }
});

router.put("/:blogId/update", async (req, resp) => {
    var { blogId } = req.params;
    const { userInfo } = req; 
    var { bannerPic, thumbnail, title, body, tags, option} = req.body;

    //validating user input to get only numbers
    if(! await validateUserInputAsNumber(blogId)){
        const message = {state: "failed", message: "Invalid blog number"};
        sendResponse(message, resp, {}, 400);
        return
    }
   
    //Validating blog owner
    const blog = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            userid: userInfo.id
        }
    });

    if(!blog){
        const message = {state: "failed", message: "Blog not found"};
        sendResponse(message, resp, {}, 404);
        return
    }

    //Validating blog values before inserting
    const blogResult = await validateBlogValues(bannerPic, thumbnail, title, body, tags, option, resp);
    if(blogResult == false) return;
    
    const updateBlog = await blogsTB.update({
        blog_title: title,
        blog_image: blogResult.blog_image,
        blog_thumbnail: blogResult.blog_thumbnail,
        blog_content: body,
        tags: tags,
        is_public: option.is_public,
        isCommentOff: option.commentsOff,
        showLikes: option.showLikes
    }, {
        where: {
            blog_id: blogId,
            userid: userInfo.id
        }
    });

    if(updateBlog){
        const message = {state: "success", message: "Blog edited successfully"};
        sendResponse(message, resp);
        return
    }else{
        const message = {state: "failed", message: "Could not update blog"};
        sendResponse(message, resp, {}, 500);
        return
    }
});

router.post("/:blogId/magicLink", async (req, resp) => {
    const { blogId } = req.params;
    var { userInfo } = req;

    if(!validateUserInputAsNumber(blogId)){
        const message = {state: "failed", message: "Invalid blog number"};
        sendResponse(message, resp, {}, 400);
        return
    }

    //checking if user has access to this blogId
    const hasUserAccessToBlog = await blogsTB.findOne({
        where: {
            blog_id: blogId,
            userid: userInfo.id
        }
    });

    if(hasUserAccessToBlog == null){
        const message = {state: "failed", message: "Blog not found"};
        sendResponse(message, resp, {}, 404);
        return
    }

    //Creating a unpredictable token
    const toBeHash = "|+|" + Date.now() + "|-|" + Math.random() + "|+|";
    var blogToken = crypto.createHash('md5').update(toBeHash).digest('hex');

    //Creating expire date for blog token
    const currentTime = new Date();
    const blogTokenEXP = new Date(currentTime.getTime() + 5 * 60 * 1000).getTime(); // Add 5 minutes in milliseconds

    // Inserting to database
    const addTokenToDB = await blogsTB.update({
        blog_magicToken: blogToken,
        magicToken_exp: blogTokenEXP
    },
    {
        where: {
            blog_id: blogId
        }
    }
    );

    if(addTokenToDB){
        const blogMagicLink = "http://sancity.blog:8081/blogs/magicLink?token=" + blogToken;
        const message = {state: "success", magicLink: blogMagicLink};
        sendResponse(message, resp);
        return
    }else{
        const message = {state: "failed", message: "Couldn't create magic link"};
        sendResponse(message, resp, {}, 500);
        return
    } 
});

module.exports = router;