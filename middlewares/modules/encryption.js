require("dotenv").config();
var crypto = require("crypto");
const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = process.env.ENCRYPTION_KEY;
const iv = process.env.ENCRYPTION_IV;


module.exports = function (text) {
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return  encrypted.toString('base64');
 }



