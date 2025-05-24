const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chatType: {
      type: String,
      enum: ["one2one", "group"],
      required: true,
    },
    receiverId : {
      type: mongoose.Schema.Types.ObjectId,
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
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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


// model is getting excuted for the collection.
const Message = new mongoose.model("messages", messageSchema);
// module is getting exported from here.
module.exports = Message;
