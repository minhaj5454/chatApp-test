//jsonwebtoken generator and verification through this below jwt module.
const jwt = require('jsonwebtoken');
//Nodemailer is used to send email.
const nodemailer = require('nodemailer');
//below module is used to encrypt and compare the text(password).
const bcrypt = require('bcryptjs');
//Send Mail middleware/module to send email with different subjects and messages.
const sendMail = require('../../middlewares/mails/sendMail');
//Encryption module.This module encrypt random string into encrypted format with the special keys defined in the .env file.
const encrypt = require('../../middlewares/modules/encryption');
//Decryption module. This module decrypt encrypted string in the original format.
const decrypt = require('../../middlewares/modules/decryption');
const UserService = require('../../services/user/userService');
const GroupService = require('../../services/group/groupService');
const groupMessageService = require('../../services/groupMessage/groupMessageService');
const MessageService = require('../../services/message/messageService');

const { validate } = require('../../middlewares/modules/validations/validate');
const USER_SCHEMA = require('../../middlewares/modules/validations/user').USER_SCHEMA;
//User model. 
const User = require('../../models/user');

exports.createUser = async (req, res) => {
    try {
        const {fName, lName, email, password, phone} = req.body;

        if(!fName || !lName || !email || !password || !phone) {
            return res.status(400).send({
                response: "failed",
                message: req.t('content_not_empty')
            });
        }

        const user = await UserService.findOne({email});
        if (user) {
            return res.status(400).send({
                status: 0,
                message: req.t('user_already_exists')
            });
        }
        
        const newUser = {
            fName,
            lName,
            email,
            password,
            phone
        };
        const createdUser = await UserService.create(newUser);
        if (!createdUser) {
            return res.status(400).send({
                response: "failed",
                message: req.t('failed_to_create_user')
            });
        }
    return res.status(201).send({
        response: "success",
        message: req.t('user_created_successfully'),
    })

    } catch (error) {
        console.log(error);
        return res.status(500).send({
            status: 0,
            message: req.t('internal_server_error')
        });
    }
}

exports.loginUser = async (req, res) => {
    try {
        const {email, password} = req.body;
        if(!email || !password) {
            return res.status(400).send({
                response: "failed",
                message: req.t('content_not_empty')
            });
        }
        const user = await UserService.findOne({email});
        if (!user) {
            return res.status(400).send({
                response: "failed",
                message: req.t('user_not_found')
            });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send({
                response: "failed",
                message: req.t('invalid_credentials')
            });
        }
        const token = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '12h' });
        return res.status(200).send({
            response: "success",
            message: req.t('login_successful'),
            token,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            response: "failed",
            message: req.t('something_went_wrong')
        });
    }
}




exports.createGroup = async (req, res) => {
    try {
        const {groupName, members} = req.body;
        const createdBy = req.user.id;
        if(!groupName || !createdBy || !members) {
            return res.status(400).send({
                response: "failed",
                message: req.t('content_not_empty')
            });
        }

        const newGroup = {
          groupName, createdBy, members
        };
        const createdUser = await GroupService.create(newGroup);
        if (!createdUser) {
            return res.status(400).send({
                response: "failed",
                message: req.t('failed_to_create_group')
            });
        }
    return res.status(201).send({
        response: "success",
        message: req.t('group_created_successfully'),
    })

    } catch (error) {
        console.log(error);
 return res.status(500).send({ response : "failed", message: "something_went_wrong" });
    }
}


exports.blockOrUnblockUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const {  targetUserId, action } = req.body; // action: 'block' or 'unblock'
    if (!userId || !targetUserId || !action) {
      return res.status(400).send({ 
        response: "failed", 
        message: "content_not_empty"

       });
    }

    if (action === 'block') {
      await User.findByIdAndUpdate(userId, { $addToSet: { blockedUsers: targetUserId } });
      return res.send({ response : "success", message: "User blocked" });
    } else if (action === 'unblock') {
      await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetUserId } });
      return res.send({ response : "success", message: "User unblocked" });
    } else {
      return res.status(400).send({ response : "failed", message: "Invalid action" });
    }
  } catch (err) {
    return res.status(500).send({ response : "failed", message: "something_went_wrong" });
  }
};

exports.oneToOneChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const {otherUserId } = req.body;
    if (!userId || !otherUserId) {
      return res.status(400).send({ response : "failed", message: "content_not_empty" });
    }
    const messages = await MessageService.findMany(userId, otherUserId);
    if (!messages) {
      return res.status(200).send({ response : "success", message: "Clear History No Message For This Chat",
        result : {}
       });
    }
  return res.status(200).send({ response : "success",  
    messages : "History Fetched ",
    result : messages
     });
  } catch (err) {
    console.log("error in chatHistory",err);
    return res.status(500).send({ response : "failed", 
         message: "something_went_wrong" });
  }
};


exports.groupChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.body;
    if (!groupId) {
      return res.status(400).send({ response : "failed", message: "content_not_empty" });
    }

    // Get group details
    const group = await GroupService.get(groupId);
    if (!group) {
      return res.status(404).send({ response: "failed", message: "Group not found" });
    }

    // Check if user is a member of the group
    const isMember = group.members.some(memberId => String(memberId) === String(userId));
    if (!isMember) {
      return res.status(400).send({ response: "failed", message: "You are not a member of this group" });
    }

    const messages = await groupMessageService.findMany({ groupId });
    if (!messages) {
      return res.status(200).send({ response : "success", message: "Clear History No Message For This Group",
        result : {}
       });
    }
    return res.status(200).send({ response : "success",  
      messages : "History Fetched ",
      result : messages
       });
  } catch (err) {
    return res.status(500).send({ response : "failed", 
         message: "something_went_wrong" });
  }
};

exports.addContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const {contactId } = req.body;
    if (!userId || !contactId) {
      return res.status(400).send({
        response: "failed",
        message: req.t('content_not_empty')
      });
    }

    // Check if contactId exists
    const contactUser = await UserService.get(contactId);
    if (!contactUser) {
      return res.status(400).send({
        response: "failed",
        message: "Contact user not found"
      });
    }

    // Add contactId to user's contacts array (no duplicates)
    await UserService.findByIdAndUpdate(userId, { $addToSet: { contacts: contactId } });

    return res.status(200).send({
      response: "success",
      message: "Contact added successfully"
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      response: "failed",
      message: req.t("Something went wrong")
    });
  }
};