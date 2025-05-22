//Router is getting imported from the express.
// const router = require('express').Router();
//below 'upload' variable helps to upload images.
const upload = require('../../middlewares/modules/multer');
//below 'get' variable is the allow anything variable, no matter if it is single image or text.
const get = require('multer')();
//Authorization middleware is getting imported.
const authorization = require('../../middlewares/auth/jwtAuth');
//modules from controllers.
const userController = require('../../controller/user/user');

module.exports = async (app) => {
    app.post('/createUser', userController.createUser);
    app.post('/createGroup', authorization,userController.createGroup);
    app.post('/blockOrUnblockUser',authorization, userController.blockOrUnblockUser);
    
    app.post('/oneToOneChatHistory', authorization,userController.oneToOneChatHistory);
app.post('/groupChatHistory',authorization, userController.groupChatHistory);
    
// app.post('/deleteOneToOneMessage', authorization,userController.deleteOneToOneMessage);
// app.post('/deleteGroupMessage', authorization,userController.deleteGroupMessage);
    
app.post("/loginUser", userController.loginUser);
app.post("/addContact",authorization, userController.addContact);

};
