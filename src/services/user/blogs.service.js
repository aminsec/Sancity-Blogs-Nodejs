const { blogsTB } = require("../../models/blogs.model");
const { usersTB } = require("../../models/users.model");
const public_blogs_services = require("../public/public_blogs.service");
const notification_services = require("../user/notifications.service");
const account_blogs_services = require("../../services/user/blogs.service");
const { removeItemFromArray } = require("../../utils/operations");
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

async function get_all_user_blogs(userid) {
    try {
        //Quering all user blogs
        const userBlogs = await blogsTB.findAll({
            where: {
                userid: userid
            }
        });

        return [null, userBlogs];

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function create_blog(userInfo, req) {
    var {bannerPic, thumbnail, title, body, tags, option} = req.body;
    
    //Getting blog created time
    var createdTime = Date.now().toString();

    //Uploading banner and thumbnail
    try {
        if(bannerPic){
            const base64Data = bannerPic.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            let randomFileName = crypto.createHash('md5').update((Date.now() + Math.random()).toString()).digest("hex");
            var blog_image = "/api/v1/profilePics/" + randomFileName;
            const filePath = path.join("/var/www/html/api/", 'uploads', `${randomFileName}`);
            fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                    console.log(err);
                }
            });
        }

        if(thumbnail){
            const base64Data = thumbnail.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            let randomFileName = crypto.createHash('md5').update((Date.now() + Math.random()).toString()).digest("hex");
            var blog_thumbnail = "/api/v1/profilePics/" + randomFileName;
            const filePath = path.join("/var/www/html/api/", 'uploads', `${randomFileName}`);
            fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                    console.log(err);
                }
            });
        }

        const create = await blogsTB.create({
            userid: userInfo.id,
            blog_content: body, 
            blog_image: blog_image,
            blog_thumbnail: blog_thumbnail,
            blog_title: title,
            tags: tags,
            is_public: option.is_public,
            isCommentOff: option.commentsOff,
            showLikes: option.showLikes,
            createdAt:createdTime
        });
        
        if(create){
            return [null, true];

        }else{
            const error = {state: "failed", message: "Couldn't add blog", type: "system_error"};
            return [error, null];
        }
    } catch (err) {
        console.log(err);
        const error = {message: "As system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function update_blog(userInfo, req, blogId) {
    var {bannerPic, thumbnail, title, body, tags, option} = req.body;
    
    //Getting blog created time
    var createdTime = Date.now().toString();

    //Uploading banner and thumbnail
    try {
        //Checking user has permission to edit this blog
        const hasUserAccessToEdit = await blogsTB.findOne({
            where: {
                blog_id: blogId,
                userid: userInfo.id
            }
        });

        if(hasUserAccessToEdit === null){
            const error = {message: "Blog not found", state: "failed", type: "not_found"};
            return [error, null];
        }

        //Uploading banner
        if(bannerPic){
            const base64Data = bannerPic.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            let randomFileName = crypto.createHash('md5').update((Date.now() + Math.random()).toString()).digest("hex");
            var blog_image = "/api/v1/profilePics/" + randomFileName;
            const filePath = path.join("/var/www/html/api/", 'uploads', `${randomFileName}`);
            fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                    console.log(err);
                }
            });
        }

        //Uploading thumbnail
        if(thumbnail){
            const base64Data = thumbnail.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            let randomFileName = crypto.createHash('md5').update((Date.now() + Math.random()).toString()).digest("hex");
            var blog_thumbnail = "/api/v1/profilePics/" + randomFileName;
            const filePath = path.join("/var/www/html/api/", 'uploads', `${randomFileName}`);
            fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                    console.log(err);
                }
            });
        }

        const update = await blogsTB.update(
            {
                userid: userInfo.id,
                blog_content: body, 
                blog_image: blog_image,
                blog_thumbnail: blog_thumbnail,
                blog_title: title,
                tags: tags,
                is_public: option.is_public,
                isCommentOff: option.commentsOff,
                showLikes: option.showLikes,
                createdAt:createdTime
            },
            {
            where: {
                    blog_id: blogId,
                    userid: userInfo.id
                }
            }
        );
        
        if(update){
            return [null, true];

        }else{
            const error = {state: "failed", message: "Blog not found", type: "not_found"};
            return [error, null];
        }
    } catch (err) {
        console.log(err);
        const error = {message: "As system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function get_user_blog_by_id(userInfo, blog_id) {
    try {
        //Quering blog 
        const blog = await blogsTB.findOne({
            where: {
                blog_id: blog_id,
                userid: userInfo.id
            }
        });

        if(blog){
            return [null, blog];

        }else{
            const error = {state: "failed", message: "Blog not found", type: "not_found"};
            return [error, null];
        }

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function delete_blog(blogId, userInfo) {
    try {
        const deletBlog = await blogsTB.destroy({
            where: {
                blog_id: blogId,
                userid: userInfo.id
            }
        });

        if(deletBlog){
            return [null, true];

        }else{
            const error = {message: "Blog not found", state: "failed", type: "not_found"};
            return [error, null];
        }
    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function like_blog(userInfo, blogId) {
    try {
        //Getting blog data without any restriction on their likes. 
        const blogData = await blogsTB.findOne({
            where: {
                blog_id: blogId,
                is_public: 1
            }
        });

        if(blogData === null){
            const error = {message: "Blog not found", state: "failed", type: "not_found"};
            return [error, null];
        }

        //Getting user liked blogs. If user already liked the blog, we decrease, otherwise we increase the likes
        const [err, likedPostsLists] = await get_user_liked_blogs(userInfo);
        if(err){
            return [err, null];
        }

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
                var blogLikes = blogData.likes;
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
                    return [null, message];

                }else{
                    const error = {message: "Blog not found", state: "failed", type: "not_found"};
                    return [error, null];
                }
                
            }else{
                const error = {message: "Blog not found", state: "failed", type: "not_found"};
                return [error, null];
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
                var blogLikes = blogData.likes;
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
                    //Sending notification to blog owner
                    const notifInfo = {
                        userid: blogData.userid,
                        notif_title: `${userInfo.username} liked your blog`,
                        acted_userid: userInfo.id,
                        action_name: "liked_blog",
                        blog_id: blogData.blog_id
                    };
                
                    // preventing users sending notifications to theirselves
                    if(notifInfo.userid !== notifInfo.acted_userid){ 
                        const [error, _ ] = await notification_services.send_notificaiton(notifInfo);
                        if(error){
                            return [error, null];
                        }
                    }

                    const message = {state: "success", message: "Blog liked successfully"};
                    return [null, message];

                }else{
                    const error = {message: "Blog not found", state: "failed", type: "not_found"};
                    return [error, null];
                }

            }else{
                const error = {message: "Coulndn't like blog", state: "failed", type: "system_error"};
                return [error, null];
            }
        }

    } catch (err) {
        console.log(err)
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function save_blog(userInfo, blogId) {
    try {
        //Checking blog is accessible 
        var [error, _ ] = await public_blogs_services.get_public_blog_by_id(blogId);
        if(error){
            return [error, null];
        }

        //Getting user saved blogs. If user already saved the posts, we remove it, otherwise we add it to the list
        const [err, savedPostsLists] = await account_blogs_services.get_user_saved_blogs(userInfo);
        if(err){
            return [err, null];
        }

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
                const message = {state: "success", message: "Blog removed from saved list successfully"};
                return [null, message];

            }else{
                const error = { message: "Blog not found", state: "failed", type: "not_found"};
                return [error, null];
            }

        }else{
            //If user has not saved the blog, we add the blogId to list
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
                const message = {state: "success", message: "Blog added to saved list successfully"};
                return [null, message];

            }else{
                const error = { message: "Blog not found", state: "failed", type: "not_found"};
                return [error, null];
            }
        }

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function make_magic_link(userInfo, blogId) {
    try {
        //checking if user has access to this blogId
        const hasUserAccessToBlog = await blogsTB.findOne({
            where: {
                blog_id: blogId,
                userid: userInfo.id
            }
        });

        if(hasUserAccessToBlog == null){
            const error = {message: "Blog not found", state: "failed", type: "not_found"};
            return [error, null];
        }

        //Creating a unpredictable token
        const toBeHash = "|+|" + Date.now() + "|-_-_-_-_-|" + Math.random() + "|+|";
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
            return [null, blogToken];

        }else{
            const error = {message: "Blog not found", state: "failed", type: "not_found"};
            return [error, null];
        } 
    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function get_user_liked_blogs(userInfo) {
    try {
        const likedBlogs = await usersTB.findOne({
            attributes: ["likedPosts"],
            where: {
                userid: userInfo.id
            }
        });
    
        const blogs = likedBlogs.dataValues.likedPosts;
        var blogsArray = blogs.split(",");
    
        return [null, blogsArray];

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function get_user_saved_blogs(userInfo) {
    try {
        const savedBlogs = await usersTB.findOne({
            attributes: ["savedPosts"],
            where: {
                userid: userInfo.id
            }
        });

        const blogs = savedBlogs.savedPosts;
        var blogsArray = blogs.split(",");
    
        //removing 0 item from lists that is default value of savedPosts column in DB
        blogsArray.shift();
        return [null, blogsArray];

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

module.exports = {
    get_all_user_blogs,
    get_user_liked_blogs,
    get_user_saved_blogs,
    get_user_blog_by_id,
    make_magic_link,
    create_blog,
    update_blog,
    delete_blog,
    save_blog,
    like_blog
};