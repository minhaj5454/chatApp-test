//All required modules.
const validator = require("validator");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");


//Genders enum.
const Genders = Object.freeze({
    Male: 'male',
    Female: 'female',
    Other: 'other',
});


//Super admin model.
const adminData = new mongoose.Schema({


        fname :
        {
            type:String,
            required:true
        },
        lname:
        {
            type:String
        },
       
        email:
        {
                type : String,
                required : true,
        },
        password:
        {
            type: String
        },
        gender:
        {
            type: String,
            enum: Object.values(Genders),
          
        },
        mobile:
        {
            type : String,
        },
        
        dob_year :
        {
            type:Date,
  
        },     
        email_verify:
        {
            type: Boolean,
            enum: [true, false],
            default: false
        },
        profile_pic:
        {
            type:String
        },
       
        status:
        {
            type:Boolean,
            enum: [true, false],
            default: true
        },
       
      
        reference_code:
        {
            type: String,

        },
        created_by:
        {
            type: mongoose.Schema.Types.ObjectId
        },
        country_code:
        {
            type: String,

        },
        country_name:
        {
            type: String,

        },
        language:
        {
            type: String,

        },

        time_zone:
        {
            type: String,

        },
        is_deleted:
        {
            type: Boolean,
            default: false

        },

        is_admin:
        {
            type: Boolean,
            default: false

        },
        user_type: {
            
            type:String,
           
        },
        user_group_id:
        {
            type: mongoose.Schema.Types.ObjectId,
    
        },
        export_password:
        {
            type:String,
        }
  
    },{ timestamps: true });



//Below middleware/hook is hashing the password and assigning it to the password property implicitly.
//Don't have hash the password raw text and assign explicitly in the controller.
adminData.pre("save", async function(next){

if(this.isModified("password"))
{
    //console.log(`Current password is ${this.password}`);
    this.password = await bcrypt.hash(this.password, 10);
    // console.log(`Now password is ${this.password}`);
}
next();
});
    
    
//Super admin collection is being created.
const superadmin = new mongoose.model("super_admin", adminData);
//Super admin model is getting exported from here.
module.exports = superadmin;
    




// const validator = require("validator");

// const random = require("randomstring");
// const bcrypt = require("bcryptjs");

// const Sequelize = require('sequelize')
// const sequelize = require('../conn/conn');

// const User = sequelize.define('user', {
  
//     name: { type: Sequelize.STRING, allowNull:false },

//     email: 
//     { 
//         type: Sequelize.STRING, 
//         allowNull:false,
//         unique: [true , "Email id is already exists"],
       
//                 validate(value)
//                 {
//                     if(!validator.isEmail(value))
//                     { 
//                             throw new Error("Invalid Email");
//                     }
//                 } 
//     },
        
//     mobile: { type: Sequelize.STRING, allowNull:false },

//     profile_pic: { type: Sequelize.STRING, allowNull:false },

//     role: { type: Sequelize.STRING, allowNull:true },

//     status: { type: Sequelize.BOOLEAN, allowNull:false },
  
// })

// // userData.pre("save", async function(next){

// //     if(this.isModified("password"))
// //     {
// //         //console.log(`Current password is ${this.password}`);
// //         this.password = await bcrypt.hash(this.password, 10);
// //        // console.log(`Now password is ${this.password}`);
// //     }
   
// //     next();

// // })
  
// module.exports = User


