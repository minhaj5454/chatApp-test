//multer module.
const multer = require('multer');
//path module for the absolute extension extraction from original file.
const path = require('path');

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, "./uploads/userprofile");
        },
        filename: function (req, file, cb) {
            const fpath = file.fieldname + "-" + Date.now() + path.extname(file.originalname);
            cb(null, fpath);
        }
    })
});


module.exports = upload;