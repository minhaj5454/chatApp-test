//below 'upload' variable helps to upload images.
const upload = require('../../middlewares/modules/multer');
//below 'get' variable is the allow anything variable, no matter if it is single image or text.
const get = require('multer')();
//get authorization from middleware.
const authorization = require('../../middlewares/auth/jwtAuth');

//modules from controller.
const {
    register,
    login,
    requestforgotpassword,
    changeforgetPassword,
    getAllUsers,
    activeInactiveUser,
} = require('../../controller/admin/superAdmin');

module.exports = async (app) => {
    app.post('/register', upload.single('profile_pic'), register);
    app.post('/login', get.any(), login);
    app.post('/forgetPassword', requestforgotpassword);
    app.post('/changePassword', authorization, changeforgetPassword);
    app.post('/getAllUsers', authorization, getAllUsers);
    app.post('/activeInactiveUser', get.any(), authorization, activeInactiveUser);
};


