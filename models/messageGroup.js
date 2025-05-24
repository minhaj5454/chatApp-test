const mongoose = require("mongoose");

const messageGroupSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "groups",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    text: {
      type: String,
    },
    mediaUrl: {
      type: String,
    },
    mediaType: {
      type: String,
      enum: ["image", "video", "file"],
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
    },
    forwardedFrom: {
        type: {
          type: String,
        },
       id: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'forwardedFrom.model',
  },
      },

       reactions: [{
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
          reaction: String
        }],


  },{ timestamps: true }
);

const MessageGroup = mongoose.model("messagegroups", messageGroupSchema);
module.exports = MessageGroup;