const { commentsTB } = require("../../models/comments.model");
const { blogsTB } = require("../../models/blogs.model");
const { validateBlogInfo } = require("../../utils/validate");
const account_services = require("../../services/user/account.service");
const { Op } = require("sequelize");

async function get_all_public_blogs_by_limit_and_offset(limit, offset) {
    try {
        //Getting all blogs from database
        const allBlogs = await blogsTB.findAll({
            where: {
                is_public: 1
            },
            order: [
                ["createdAt", "DESC"]
            ],
            limit: Number(limit),
            offset: Number(offset)
        });

        const blogsList = [];
        for (blog of allBlogs){
            //Removing sensitve keys from blogs
            const validatedBlog = await validateBlogInfo(blog.dataValues);
    
            //Getting user's info of each blog
            const [error, blog_user_info] =  await account_services.get_user_info_by_id(validatedBlog.userid);
    
            if(error){
                continue;
            }
    
            validatedBlog.user = blog_user_info;
            blogsList.push(validatedBlog);
        }

        return [null, blogsList];

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function get_all_public_blogs() {
    try {
        const all_blogs = await blogsTB.findAll({
            where: {
                is_public: 1,
            }
        });

        const blogsList = [];
        for (blog of all_blogs){
            //Removing sensitve keys from blogs
            const validatedBlog = await validateBlogInfo(blog.dataValues);
    
            //Getting user's info of each blog
            const [error, blog_user_info] =  await account_services.get_user_info_by_id(validatedBlog.userid);
    
            if(error){
                continue;
            }
    
            validatedBlog.user = blog_user_info;
            blogsList.push(validatedBlog);
        }

        return [null, blogsList];

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function search_blog(user_search_query) {
    try {
        //Searching user input in title, content and tags 
        const results = await blogsTB.findAll({
            where: {
              [Op.or]: [
                {blog_title: {[Op.like]: `%${user_search_query}%`}},
                {blog_content: {[Op.like]: `%${user_search_query}%`}},
                {tags: {[Op.like]: `%${user_search_query}%`}}
              ]
            }
        });

        const blogsList = [];
        for (blog of results){
            //Removing sensitve keys from blogs
            const validatedBlog = await validateBlogInfo(blog.dataValues);
    
            //Getting user's info of each blog
            const [error, blog_user_info] =  await account_services.get_user_info_by_id(validatedBlog.userid);
    
            if(error){
                continue;
            }
    
            validatedBlog.user = blog_user_info;
            blogsList.push(validatedBlog);
        }

        return [null, blogsList];

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function get_public_blog_by_id(blog_id) {
    try {
        //Quering blog info
        const blog = await blogsTB.findOne({
            where: {
                blog_id: blog_id,
                is_public: 1
            }
        });

        if(blog){
            //Checking blog Info
            var validatedBlog = await validateBlogInfo(blog.dataValues);

            //Getting user information of blog 
            var blogUserId = validatedBlog.userid;
            const [err, blogUserInfo] = await account_services.get_user_info_by_id(blogUserId);
            if(err){
                return [err, null];
            }
            
            validatedBlog.user = blogUserInfo;
            
            return [null, validatedBlog];

        }else{
            const error = {message: "Blog not found", state: "failed", type: "not_found"};
            return [error, null];
        }

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "not_found"};
        return [error, null];
    }
};

async function get_blog_by_magic_link(token) {
    try {
        const blogInfo = await blogsTB.findOne({
            where: {
                blog_magicToken: token
            }
        });

        if(blogInfo === null){
            const error = {message: "Token has expired or not found", state: "failed", type: "not_found"};
            return [error, null];
        }

        //Checking token expiration date
        const tokenExpireDate = blogInfo.magicToken_exp;
        const nowTime = Date.now();

        //If present time was greater than token exp date, it means token has expired
        const tokenExpired = nowTime > tokenExpireDate;
        if(tokenExpired){
            const error = {message: "Token has expired or not found", state: "failed", type: "not_found"};
            return [error, null];
        }

        //Checking blog Info
        const blog = await validateBlogInfo(blogInfo.dataValues);

        //Quering user information of blog
        const blogUserId = blog.userid;
        const [error, blogUserInfo] = await account_services.get_user_info_by_id(blogUserId);
        if(error){
            return [error, null];
        }

        blog.user = blogUserInfo;
        return [null, blog];

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }   
};

async function check_blog_comments_on(blog_id) {
    try {
        const areCommentsOn = await blogsTB.findOne({
            where: {
                blog_id: blog_id,
                isCommentOff: 0,
                is_public: 1
            }
        });
        console.log(areCommentsOn);
        if(areCommentsOn){
            return [null, true];
    
        }else{
            const error = {message: "Blog not found", state: "failed", type: "not_found"};
            return [error, false];
        }

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, false];
    }
};

async function get_blog_comments_by_limit(blog_id, limit, offset) {
    try {
        var result = [];
        var comments_len = 0;
        //Checking if comments are on
        const [error, are_comments_on] = await check_blog_comments_on(blog_id);
        if(error){
            return [error, null];
        }

        if(are_comments_on === true){

            //Quering comments length - we need it in frontend
            const [error, commentsLen] = await get_blog_comments_len(blog_id);
            if(error){
                return [error, null];
            }
            comments_len = commentsLen;

            //Quering comments
            const comments = await commentsTB.findAll({
                where: {
                    blog_id: blog_id
                },
                order: [
                    ["commentedAt", "DESC"]
                ],
            limit: limit,
            offset: offset
            });

            //Preparing comments to be sent
            for(let comment of comments){
                var commentData = {};
                commentData.comment = comment.comment_text;
                commentData.Id = comment.commentId;
                commentData.likes = comment.commentLikes;
                commentData.date = comment.commentedAt;
                
                //Quering the user info of comment
                const [error, userInfo] = await account_services.get_user_info_by_id(comment.userid);
                if(error){
                    continue;
                }

                commentData.user = userInfo;
                result.push(commentData)
            }
        }

        return [null, result, comments_len];

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function get_blog_comments_len(blog_id) {
    try {
        const getAllCommentsLen = await commentsTB.findAll({
            where: {
                blog_id: blog_id
            }
        });

        return [null, getAllCommentsLen.length];

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null]; 
    }
};

async function get_blog_comment(blog_id, commentId) {
    try {
        //Checking if comments of blog are public and the blog is not private
        const [error, areCommentsOn] = await check_blog_comments_on(blog_id);
        if(error){
            return [error, null];
        }

        if(areCommentsOn === true){
            //Quering comment
            const comment = await commentsTB.findOne({
                where: {
                    commentId: commentId,
                    blog_id: blog_id
                }
            });
            
            if(comment){
                return [null, comment];

            }else{
                const error = {message: "Comment not found", state: "failed", type: "not_found"};
                return [error, null]; 
            }
        }
        

    } catch (err) {
        console.log(err)
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null]; 
    }
};

module.exports = {
    get_all_public_blogs_by_limit_and_offset,
    get_blog_comments_by_limit,
    get_blog_comments_len,
    get_all_public_blogs,
    get_blog_by_magic_link,
    get_public_blog_by_id,
    check_blog_comments_on,
    get_blog_comment,
    search_blog
}