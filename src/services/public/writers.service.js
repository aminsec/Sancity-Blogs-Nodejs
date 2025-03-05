const { Op } = require('sequelize');
const { usersTB } = require("../../models/users.model");
const { blogsTB } = require("../../models/blogs.model");

async function get_similar_user(userid) {
    try {
        //Returning users similar to input 
        const user = await usersTB.findAll({
            where: {
                [Op.or]: [
                    {
                        userid: userid
                    },
                    {
                        username: {[Op.like]: `%${userid}%`}
                    }
                ],
            }
        });

        //Checking if any user found
        if(user.length > 0){
            return [null, user];

        }else{
            const error = {message: "User not found", state: "failed", type: "not_found"};
            return [error, null]; 
        }
        
    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null]; 
    }
};

async function get_writer_info_by_id(userid) {
    try {
        const userInfo = await usersTB.findOne({
            where: {
                [Op.or]: [
                    {
                        username: userid
                    },
                    {
                        userid: userid
                    }
                ]
            }
        });

        if(userInfo){
            return [null, userInfo];

        }else{
            const error = {message: "User not found", state: "failed", type: "not_found"};
            return [error, null]; 
        }

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null]; 
    }
};

async function get_writer_blogs(userid) {
    try {
        const blogs = await blogsTB.findAll({
            where: {
                userid: userid,
                is_public: 1
            }
        });

        return [null, blogs];

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null]; 
    }
};

async function get_writer_liked_blogs(userid) {
    try {
        const likedBlogsId = await usersTB.findOne({
            attributes: ['likedPosts'],
            where: {
                [Op.or]: [
                    {
                        username: userid
                    },
                    {
                        userid: userid
                    }
                ]
            }
        });

        if(likedBlogsId){
            let blogsId = likedBlogsId.likedPosts.split(",");
            blogsId.shift() //Removing first that is "0" item 
            return [null, blogsId];

        }else{
            const error = {message: "Not found", state: "failed", type: "not_found"};
            return [error, null]; 
        }

    } catch (err) {
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null]; 
    }
};

module.exports = {
    get_similar_user,
    get_writer_info_by_id,
    get_writer_blogs,
    get_writer_liked_blogs
};