const jwt = require('jsonwebtoken');
const { isUndefined, validateUsername } = require("../../utils/validate");
const { sendResponse, showError } = require("../../utils/operations");
const auth_services = require("../../services/auth/auth.service");
var validator = require("email-validator");

async function login(req, resp) {
    //Getting username and password from body
    const { username, password } = req.body; 

    //Returning, If parameters not defined
    if(await isUndefined(resp, username, password)) return;
    
    //Calling the service 
    const [ error, token ] = await auth_services.login(username, password);
    
    if(error){
        showError(error, resp);
        return;
    };

    resp.cookie("token", token);
    resp.end();
};

async function signup(req, resp) {
    //Getting username and password from body
    const { username, password, email } = req.body;

    //Checking if parameters are undefined
    if(await isUndefined(resp, username, password, email)) return;

    //Validating username
    if(!await validateUsername(username, resp)) return;

    //Validating email
    if(!validator.validate(email)){
        const error = {message: "Invalid email format", state: "failed", type: "input_error"};
        showError(error, resp);
        return;
    }

    //Calling service
    const [error, token] = await auth_services.signup(username, password, email);

    if(error){
        showError(error, resp);
        return;
    }

    resp.cookie("token", token, {httpOnly: true, sameSite: 'lax'});
    resp.end();
};

async function logout(req, resp) {
    if(req.cookies.token){
        const [error, success] = await auth_services.revoke_token(req);
        if(error){
            showError(error, resp);
            return;
        }

        if(success === true){
            resp.cookie("token", "deleted");
            resp.redirect("/");
            resp.end();
        }
    }
};

async function check(req, resp) {
    if(!req.cookies.token){
        const message = {"message": false};
        sendResponse(message, resp);
        return;
    }

    const token = req.cookies.token;

    try {
        //If token was not valid, it will go through an error
        jwt.verify(token, process.env.JWT_SECRET);
        
        //Checking if token is revoked
        const [error, isRevokedToken] = await auth_services.check(token);

        if(error){
            showError(error, resp);
            return;
        }

        if(isRevokedToken === true){
            const message = {"message": false};
            sendResponse(message, resp);
            return;
        }

        const message = {"message": true};
        sendResponse(message, resp);
        return;
        
    } catch (error) {
        const message = {"message": false};
        sendResponse(message, resp);
        resp.end();
    }
};

module.exports = {
    login,
    signup,
    logout,
    check
};