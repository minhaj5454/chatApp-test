//below 'upload' variable helps to upload images.
const upload = require('../../middlewares/modules/multer');
//below 'get' variable is the allow anything variable, no matter if it is single image or text.
const get = require('multer')();
//get authorization from middleware.
const authorization = require('../../middlewares/auth/jwtAuth');



module.exports = async (app) => {

};


