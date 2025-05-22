const validator = require("validator");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//Keep only those fields that is necessary for the User's in your project.
//In this below model almost everything that is necessary for the User is defined.
const userSchema = new mongoose.Schema({
   
    fName : {
        type: String,      
    },
    lName : {
        type: String,      
    },
    email: {
        type: String,
        },
    password: {
        type : String,
    },
    phone: {
        type: String,
        },
    status: {
        type: Boolean,
        default: true,
        },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    statusMsg:{ 
        type: String, 
        default: ""
     },
     contacts:[{ 
        type: mongoose.Schema.Types.ObjectId,
         ref: 'User' 
    }],
  lastSeen:{ 
    type: Date
 },
 blockedUsers: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}]

}, { timestamps: true });

userSchema.pre("save", async function (next) {

    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

//User model is getting excuted for the collection.
const User = new mongoose.model("users", userSchema);
//User module is getting exported from here.
module.exports = User;




