const { usersTB } = require("../../models/users.model");
const { notificationsTB } = require("../../models/notifications.model");
const { messagesTB } = require("../../models/messages.model");
const { commentsTB } = require("../../models/comments.model");
const { blogsTB } = require("../../models/blogs.model");
const { dead_sessionsTB } = require("../../models/dead_sessions.model");
const emailValidator = require("email-validator");
const { genBcrypt } = require("../../utils/operations");

async function get_user_info_by_id(userid){
    try {
        const userInfo = await usersTB.findOne({
            where: {
                userid: userid
            }
        });

        if(userInfo){
            const user_data = {
                userid: userInfo.userid,
                username: userInfo.username,
                email: userInfo.email,
                joinedAt: userInfo.joinDate,
                profilePic: userInfo.profilePic,
                bio: userInfo.bio
            };
    
            return [null, user_data];
    
        }else{
            const error = {message: "User not found", state: "failed", type: "not_found"};
            return [error, null];
        }
        
    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function get_user_account_info(userid) {
    try {
        const user_info = await usersTB.findOne({
            where: {
                userid: userid
            }
        });
    
        if(user_info){
            var userData = {
                userid: user_info.userid,
                username: user_info.username,
                email: user_info.email,
                joinDate: user_info.joinDate,
                role: user_info.role,
                profilePic: user_info.profilePic,
                bio: user_info.bio,
            };

            return [null, userData];

        }else{
            const error = {message: "User not found", state: "failed", type: "not_found"};
            return [error, null];
        }

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function update_info(req) {
    try {
        const { userInfo } = req;
        var { username, email, bio } = req.body;
        var usernameUpdated = false;
        var emailUpdated = false;
        var bioUpdated = false;
    
        //Checking for previous data to prevent temp query to database
        if(username == userInfo.username){
            usernameUpdated = true;
        }
        if(email == userInfo.email){
            emailUpdated = true;
        }
    
        //Validating email
        const validEmail = emailValidator.validate(email);
        if(!validEmail){
            const error = {message: "Invalid email address", state: "failed", type: "input_error"};
            return [error, null];
        }
    
        //Updating username if the username was not the same as in token
        if(usernameUpdated == false){
            //Checking username exist or not
            const isNewUsernameExist = await usersTB.findOne({
                where: {
                    username: username
                }
            });
    
            if(isNewUsernameExist){
                const error = {message: "This username exist", state: "failed", type: "input_error"};
                return [error, null];
            }
    
            //Updating username
            const updateUsername = await usersTB.update({
                username: username
            },{
                where: {
                    userid: userInfo.id
                }
            });
    
            if(updateUsername){
                usernameUpdated = true;

            }else{
                const error = { message: "Couldn't update username", state: "failed", type: "system_error"}; 
                return [error, null];
            }
        }
    
        //Updating email if the username was not the same as in token
        if(emailUpdated == false){
            //Checking email exist or not
            const isNewEmailExist = await usersTB.findOne({
                where: {
                    email: email
                }
            });
    
            if(isNewEmailExist){
                const error = {message: "This email exist", state: "failed", type: "input_error"};
                return [error, null];
            }
    
            const updateEmail = await usersTB.update({
                email: email
            },{
                where: {
                    userid: userInfo.id
                }
            });
    
            if(updateEmail){
                emailUpdated = true;

            }else{
                const error = { message: "Couldn't update email", state: "failed", type: "system_error"}; 
                return [error, null];
            }
        }
    
        //Updating Bio
        const updateBio = await usersTB.update({
            bio: bio
        }, {
            where: {
                userid: userInfo.id
            }
        });
    
        if(updateBio){
            bioUpdated = true;

        }else{
            const error = { message: "Couldn't update bio", state: "failed", type: "system_error"}; 
            return [error, null];
        }
        
        //If everything updated, returns a true
        if(usernameUpdated && emailUpdated && bioUpdated){
            return [null, true];

        }else{
            const error = { message: "Couldn't update data", state: "failed", type: "system_error"}; 
            return [error, null];
        }

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function update_profile_pic_path(userInfo, profile_pic_path) {
    try {
        const updateProfilePic = await usersTB.update({
            profilePic: profile_pic_path
        }, {
            where: {
                userid: userInfo.id
            }
        });

        //Checking if any row updated
        if(updateProfilePic[0]){
            return [null, true];

        }else{
            const error = {message: "A system error occurred", state: "failed", type: "system_error"};
            return [error, null];
        }

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function update_password(userInfo, new_pass, old_pass) {
    try {
        //Checking user password
        const userData = await usersTB.findOne({
            where: {
                username: userInfo.username
            }
        });

        //Comparing passwords
        const userCurrentHashedPassword = userData.password;
        const passwordCheckResult = await genBcrypt("compare", old_pass, userCurrentHashedPassword);
        if(passwordCheckResult === false){
            const error = {message: "Current password is incorrect", state: "failed", type: "creds_error"};
            return [error, null];
        }

        //Updating password
        const userNewHashPassword = await genBcrypt("create", new_pass);
        const updatePassword = await usersTB.update({
            password: userNewHashPassword
        }, {
            where: {
                username: userInfo.username
            }
        });

        if(updatePassword[0]){
            return [null, true];

        }else{
            const error = {message: "A system error occurred", state: "failed", type: "system_error"};
            return [error, null];
        }

    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
};

async function delete_account(userInfo, password, token) {
    try {
        //Checking user password
        const userData = await usersTB.findOne({
            where: {
                userid: userInfo.id
            }
        });

        //Comparing passwords
        const userCurrentHashedPassword = userData.password;
        const passwordCheckResult = await genBcrypt("compare", password, userCurrentHashedPassword);
        if(passwordCheckResult === false){
            const error = {message: "Current password is incorrect", state: "failed", type: "creds_error"};
            return [error, null];
        }

        //Deleting all information related to user
        await usersTB.destroy({
            where: {
                userid: userInfo.id
            }
        });
        await blogsTB.destroy({
            where: {
                userid: userInfo.id
            }
        });
        await commentsTB.destroy({
            where: {
                userid: userInfo.id
            }
        });
        await notificationsTB.destroy({
            where: {
                acted_userid: userInfo.id
            }
        });
        await notificationsTB.destroy({
            where: {
                userid: userInfo.id
            }
        });
        await messagesTB.destroy({
            where: {
                sender: userInfo.username
            }
        });
        await messagesTB.destroy({
            where: {
                receiver: userInfo.username
            }
        });
        
        //revoking session
        await dead_sessionsTB.create({
            session: token,
            timestamp: Date.now().toString()
        });

        return [null, true];
        
    } catch (err) {
        console.log(err);
        const error = {message: "A system error occurred", state: "failed", type: "system_error"};
        return [error, null];
    }
}

module.exports = {
    update_profile_pic_path,
    get_user_account_info,
    get_user_info_by_id,
    update_password,
    delete_account,
    update_info
}