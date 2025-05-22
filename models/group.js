const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    groupName: { type: String, 
        required: true 
    },
    avatarUrl: { 
        type: String 
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [{
         type: mongoose.Schema.Types.ObjectId, 
         ref: "User" }],

    status: {
        type: Boolean,
        default: true,
        },
    isDeleted: {
        type: Boolean,
        default: false,
    },

  },{ timestamps: true }
);

// model is getting excuted for the collection.
const Group = new mongoose.model("groups", groupSchema);
// module is getting exported from here.
module.exports = Group;
