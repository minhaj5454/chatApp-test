//All the required modules for the SuperAdmin.
//This is contoller holds Register + login + forgetPassword + changePassword API for Super admin.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

//Send Mail middleware/module to send email with different subjects and messages.
const sendMail = require('../../middlewares/mails/sendMail');

//Super Admin model.
const SuperAdmin = require('../../models/superAdmin');
//User model.
const User = require('../../models/user');

//register superAdmin in our app.
exports.register = async (req, res) => {

    try {
        if (!req.body.fname || !req.body.lname || !req.body.email || !req.body.phone || !req.body.password) {
            res.status(400).send({
                message: req.t('content_not_empty')
            });

        }
        let date_ob = new Date();
        let otp_code = Math.floor(100000 + Math.random() * 900000);

        //Create a super admin.
        const superAdmin = new SuperAdmin({
            fname: req.body.fname,
            lname: req.body.lname,
            email: req.body.email,
            phone: req.body.phone,
            password: req.body.password,
            opt_marketing: req.body.opt_marketing,
            dob_year: req.body.dob_year,
            country_code: req.body.country_code,
            country_name: req.body.country_name,
            device_id: req.body.device_id,
            otp: otp_code,
            profile_pic: req.file.filename,
            user_type: "superadmin"
        });

        let token_data = {
            fname: req.body.fname,
            time: Date(),
        }

        await SuperAdmin.findOne({ email: req.body.email })
            .then(async function (data) {

                if (data) {
                    res.status(200).send({
                        response: "success",
                        message: req.t("already_registered"),
                    });

                }
                else {

                    //Here comes the hash password assignment to the 'superAdmin' object.
                    //But we are hashing in the model of the superAdmin.so no need to hash here and assignment as well.
                    await superAdmin
                        .save()
                        .then(result => {
                            if (!result) {

                                res.status(400).send({
                                    response: "failed",
                                    message: req.t('something_went_wrong')

                                });
                            }
                            const token = jwt.sign({
                                token_data
                            }, process.env.ACCESS_TOKEN_SECRET, {
                                expiresIn: '15m'
                            });

                            //Subject contains the header of the email. so whatever the header you define will be shown in email's subject.
                            const subject = "Welcome email";
                            //Message is the inner content of the email.(Text)
                            const message = `Welcome ${superAdmin.fname} to {App name}`;
                            sendMail(superAdmin.email, subject, message);


                            res.status(201).send({
                                response: "success",
                                message: req.t('register_success'),
                                token: token
                            });
                        });
                }
            });
    }
    catch (err) {
        console.log(err.message);
        res.status(400).send({
            response: "failed",
            message: req.t('something_went_wrong')

        });
    }
};

//Super admin login API.
exports.login = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        let token_data = {
            email: email,
            time: Date(),
        }

        const userdata = await SuperAdmin.findOne({
            email: email,
        });

        if (userdata) {
            bcrypt.compare(password, userdata.password, async (error, result) => {
                if (error || !result) {
                    console.log("in the error slot of bcrypt.compare")
                    // console.log(error);
                    res.status(400).send({
                        response: "failed",
                        message: req.t('invalid_credentials')
                    });
                } else {
                    console.log("In the result slot of the bcrypt.compare")
                    // console.log(typeof (result));
                    if (userdata.status == true) {
                        const token = jwt.sign({
                            token_data
                        }, process.env.ACCESS_TOKEN_SECRET, {
                            expiresIn: '12h'
                        });

                        //Here you can check whatever the authority your superAdmin entitled with, in your conditionals.
                        //eg below 'previlege' conditional.

                        // const previleges = await User_Group_Privilege.find({ user_group_id: userdata.user_group_id })
                        // if (previleges) {
                        //     res.status(201).send({
                        //         response: "success",
                        //         result: userdata,
                        //         previleges: previleges,
                        //         token: token
                        //     });
                        // }
                        // else {
                        //     res.status(201).send({
                        //         response: "success",
                        //         result: userdata,
                        //         token: token
                        //     });
                        // }
                        res.status(200).send({
                            response: "success",
                            result: userdata,
                            token: token
                        });
                    } else {
                        res.status(400).send({
                            response: "failed",
                            message: req.t('user_deactive')
                        });
                    }
                }
            });
        } else {
            res.status(400).send({
                response: "failed",
                message: req.t('invalid_user')

            });
        }

    } catch (e) {
        console.log(e);
        res.status(400).send({
            response: "failed",
            message: req.t('something_went_wrong')
        });
    }
}



//Forget password request API for super admin.
exports.requestforgotpassword = async (req, res) => {
    try {

        const email = req.body.email;
        if (!req.body.email) {
            res.status(400).send({
                message: req.t('content_not_empty')
            });
            return;
        }

        const userdata = await SuperAdmin.findOne({
            email: email
        });

        if (!userdata) {
            res.status(400).send({
                response: "failed",
                message: req.t('invlid_email')
            });
        } else {
            if (userdata.status === false) {
                res.status(400).send({
                    response: "failed",
                    message: req.t('user_deactive')
                });
            } else {
                let token_data = {
                    email: req.body.email,
                    time: Date(),
                };

                const token = jwt.sign({
                    token_data
                }, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: '10m'
                });

                const link = 'http://localhost:5000/superAdmin/changeForgetPassoword';
                //Subject contains the header of the email. so whatever the header you define will be shown in email's subject.
                const subject = "Reset password request";
                //Message is the inner content of the email.(Text)
                const message = `Hello ${userdata.fname}, Here is your {App name} RESET PASSWORD LINK to RESET your password. Link:- ${link}`;
                sendMail(userdata.email, subject, message);

                res.status(201).send({
                    response: "success",
                    message: req.t("forgetpassword"),
                    token: token
                });
            }
        }
    } catch (err) {
        res.status(400).send({
            response: 'failed',
            message: err.message || "Some error occurred"
        });
    }

}


//Change password API for super Admin.
exports.changeforgetPassword = async (req, res) => {
    try {

        if (!req.body.email || !req.body.token || !req.body.newpassword) {
            res.status(400).send({
                message: req.t('content_not_empty')
            });
            return;
        }
        //getting token, email, and newpassword from the body.
        const token = req.body.token;
        const email = req.body.email;
        const newpassword = req.body.newpassword;
        //hashing the newpassword.
        const epass = await bcrypt.hash(newpassword, 10);
        //finding User/SuperAdmin data in the collectin of the superadmin.
        const userdata = await SuperAdmin.findOne({
            email: email
        });

        //Here token is getting passed in the body.
        //we can handle token with the authorization header which is the proper way to handle the token.
        if (token) {
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, authData) => {
                if (err) {
                    return res.status(400).send({
                        message: req.t("expirelink"),
                    })
                }

                const verify = SuperAdmin.findByIdAndUpdate({
                    _id: userdata._id
                }, {
                    $set: {
                        password: epass,
                        updatedAt: new Date()
                    }
                }, function (err, result) {

                    if (err) {
                        res.send(err)
                    } else {
                        res.status(201).send({
                            response: "success",
                            message: req.t("reset_password_successful"),
                        });
                    }
                });

                if (!verify) {
                    console.log("error");
                    return res.status(404).send();
                }


                //  res.status(201).send({
                //   response: "success",
                //   msg :"Email is verified"
                // });
                // res.status(201).send(token)
            });
        } else {
            res.status(400).send({
                message: req.t("something_went_wrong"),
            });
        }
    } catch (e) {
        console.log(e);
        res.status(400).send({
            message: req.t("something_went_wrong"),
        });
    }

}

//Get all the users API.
exports.getAllUsers = async (req, res, next) => {
    try {

        //page limit that you want to look at. default is 1 set.
        let page = req.body.page || 1;
        //document limit that you want to get. default is 1 set.
        let limit = parseInt(req.body.limit) || 1;
        //skip is the document skip amount on the given/specific page.
        const skip = (page - 1) * limit;

        // //Have to parse to integer because 
        // limit = parseInt(limit);

        const users = await User.find().limit(limit).skip(skip);

        res.status(200).send({
            status: 'success',
            message: req.t('all_users'),
            data: users
        });

    } catch (error) {
        console.log(error);
        res.status(400).send({
            response: 'failed',
            message: req.t('something_went_wrong')
        });
    }
}


//Active/Inactive the specific user.
exports.activeInactiveUser = async (req, res, next) => {
    try {
        //getting user id from the body.
        const user_id = req.body.user_id;
        //parsing string to the boolean.
        const status_key = req.body.status;

        let status = "";
        if (status_key == true) {
            status = req.t('unblocked_user')
        } else {
            status = req.t('user_blocked')
        }

        //finding user that matches the id in the body.
        const find_user = await User.findOne({ _id: user_id });

        if (!find_user) {
            res.status(400).send({
                response: 'failed',
                message: req.t('user_not_found')
            });
        } else {
            //if status_key is true user will be active/unblocked by admin.
            await User.updateOne(
                { _id: user_id },
                { $set: { status: status_key } }
            );
            res.status(200).send({
                response: "success",
                message: status
            });
        }
    } catch (error) {
        console.log(error.message)
        res.status(400).send({
            response: 'failed',
            message: req.t('something_went_wrong')
        });
    }
}


