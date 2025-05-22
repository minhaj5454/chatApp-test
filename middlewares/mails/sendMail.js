//below module is a mail sender to the specified address.
const nodemailer = require('nodemailer');

//This below is sending the Email with subject and message which is dynamic.
module.exports = sendMail = async (email, subject, message) => {

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.APP_EMAIL,
            pass: process.env.APP_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: subject,
        text: message
        // template: 'noumiEndUser',
        // context: {
        //     name: req.body.fullname,
        //     id: result._id,
        //     token: token,
        //     otp: otp_code,
        // }
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {

            console.log(`Email has been sent successfully.`);
        }
    });
}