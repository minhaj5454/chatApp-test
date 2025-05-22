const validator = require("validator");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


//Keep only those fields that is necessary for the Admin's in your project.
//In this below model almost everything that is necessary for the Admin is defined.
const AdminSchema = new mongoose.Schema({
    role:
    {
        type: Number,

    },
    fname:
    {
        type: String,
        required: true
    },
    lname:
    {
        type: String,
        required: true
    },
    email:
    {
        type: String,
        required: true,
        unique: [true, "Email id is already exists"],
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("Invalid Email");
            }
        }
    },
    phone:
    {
        type: Number,
        required: true,

    },
    password:
    {
        type: String,
        required: true
    },
    email_verify:
    {
        type: Number,

    },
    profile_photo:
    {
        type: String
    },
    referral_code:
    {
        type: String,

    },
    status:
    {
        type: Number,
        default: 1
    },
    admin_role:
    {
        type: String
    }
}, { timestamps: true });



const Admin = new mongoose.model("admin", AdminSchema);
module.exports = Admin;