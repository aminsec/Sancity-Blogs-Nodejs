function validateUserInputAsNumber(value) {
    value = value.toString();
    const validBlogNumberRG =  new RegExp('^[0-9]+$'); //This regex gets only numbers
    const isValidBlogNumber = value.match(validBlogNumberRG);
    if(isValidBlogNumber){
        return true
    }
    return false
};

//Function to send normall messages
function sendResponse(data, resp){
    resp.setHeader("Content-Type", "application/json");
    resp.send(JSON.stringify(data));
    resp.end();
};

function removeItemFromArray(array, item){
    const indexOfItem = array.indexOf(item);
    if (indexOfItem > -1){
        array.splice(indexOfItem, 1);
    }
    return array
};

function checkBlogInfo(blogData, keys){
    var validBlog = {};
    for(index in keys){
        for(blogDagtaKeys in blogData){
            if(keys[index] == blogDagtaKeys){
                validBlog[blogDagtaKeys] = blogData[blogDagtaKeys];
            }
        }
    };
    if(validBlog.showLikes == 0){
        validBlog.likes = "private"
    } 
    return validBlog;
};

module.exports = {
    validateUserInputAsNumber,
    sendResponse,
    removeItemFromArray,
    checkBlogInfo
}