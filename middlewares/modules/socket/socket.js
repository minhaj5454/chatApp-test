const Message = require('../../../models/message');
const MessageGroup = require('../../../models/messageGroup');
const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET } = process.env;
const fs = require('fs');
const path = require('path');
const oneToOneDir = path.join(__dirname, '../../../uploads/mediaFiles/oneToOne');
const groupDir = path.join(__dirname, '../../../uploads/mediaFiles/group');
[oneToOneDir, groupDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const GroupService = require('../../../services/group/groupService');

const userService = require('../../../services/user/userService');

module.exports = function(server) {       
  const { Server } = require('socket.io');
  const io = new Server(server, { cors: { origin: "*" } });

  // for dummmy purposes, use a dummy userId
//   io.use(async (socket, next) => {
//     // for testing purposes, use a dummy userId
//         const token = socket.handshake.auth.token;
//     // For testing, treat token as userId
//     if (!token) return next(new Error("No token"));
//     socket.userId = token; // Attach userId to socket
//     next();

//   });


  //actuall token based authentication
    io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));

    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
      socket.userId = decoded._id || decoded.id; // Use your payload's user id field
      next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });


  io.on('connection',async socket => {
    const userId = socket.userId;
    // mark user online
    await userService.findByIdAndUpdate(userId, { statusMsg: "online" });
     io.emit('user_online', { userId });
    console.log(`User ${userId} connected. Status updated to online.`);
    console.log(`User ${userId} connected`);
    socket.join(userId);           // personal room

    // 1:1 Chat
socket.on('private_message', async ({ toUserId, text, mediaUrl }) => {

  const receiver = await userService.get(toUserId);
  if (receiver.blockedUsers.includes(userId)) {
    // Optionally notify sender
    return;
  }

    // Save to DB: Message({ sender, chatType, receiverId , ... })
    try {
      const message = await Message.create({
        senderId: userId,
        chatType: 'one2one',
        receiverId : toUserId, // For 1:1, you can use the recipient's _id as receiverId 
        text,
        mediaUrl,
        // Optionally add mediaType if needed
      });
      // 2. Emit to recipient if online:
      io.to(toUserId).emit('private_message', { from: userId, text, mediaUrl, timestamp: message.createdAt });
    } catch (err) {
      console.error('Message save error:', err);
    }
  });

  // Group Chat
socket.on('group_message', async ({ groupId, text, mediaUrl }) => {

    // 1. Save to DB: MessageGroup({ groupId, sender, ... })
    const message = await MessageGroup.create({
      groupId,
      senderId: userId,
      text,
      mediaUrl,
      // Optionally add mediaType if needed
    });

    // 2. Emit to all group members
    const group = await GroupService.get(groupId);
     if (!group) {
    console.error(`Group not found for groupId: ${groupId}`);
    return;
  }
    group.members.forEach(memberId => {
      io.to(memberId.toString()).emit('group_message', {
        groupId,
        from: userId,
        text,
        mediaUrl,
        timestamp: message.createdAt,
        messageId: message._id
      });
    });
});

    // Typing indicators
    socket.on('typing', ({ toUserId, groupId }) => {
      if (groupId) {
        // notify group
        socket.to(groupId).emit('typing', { groupId, from: userId });
      } else {
        // notify peer
        io.to(toUserId).emit('typing', { from: userId });
      }
    });

    // Read receipts
socket.on('mark_read', async ({ messageId }) => {
  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userId } },
      { new: true }
    );
    // Notify sender if message exists
    if (message && message.senderId) {
      io.to(message.senderId.toString()).emit('message_read', {
        messageId,
        readBy: userId
      });
    }
  } catch (err) {
    console.error('Mark read error:', err);
  }
});


socket.on('mark_group_read', async ({ groupMessageId }) => {
  try {
    const message = await MessageGroup.findByIdAndUpdate(
      groupMessageId,
      { $addToSet: { readBy: userId } },
      { new: true }
    );
    // Notify sender if message exists
    if (message && message.senderId) {
      io.to(message.senderId.toString()).emit('group_message_read', {
        groupMessageId,
        readBy: userId
      });
    }
  } catch (err) {
    console.error('Group mark read error:', err);
  }
});


// 1:1 File Send
socket.on('file_send', async ({ toUserId, fileName, fileData, mediaType }) => {
  try {

      const receiver = await userService.get(toUserId);
  if (receiver.blockedUsers.includes(userId)) {
    // Optionally notify sender
    return;
  }

   const uniqueFileName = `${Date.now()}-${fileName}`;
    const savePath = path.join(oneToOneDir, uniqueFileName);

    const base64Data = fileData.replace(/^data:.+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(savePath, buffer);

    const message = await Message.create({
      senderId: userId,
      chatType: 'one2one',
      receiverId: toUserId,
      mediaUrl: `/uploads/mediaFiles/oneToOne/${uniqueFileName}`,
      mediaType: mediaType || "file",
      readBy: [userId]
    });

    io.to(toUserId).emit('private_message', {
      from: userId,
      mediaUrl: `/uploads/mediaFiles/oneToOne/${uniqueFileName}`,
      mediaType: mediaType || "file",
      fileName: uniqueFileName,
      timestamp: message.createdAt,
      messageId: message._id
    });
  } catch (err) {
    console.error('File send error:', err);
  }
});

socket.on('group_file_send', async ({ groupId, fileName, fileData, mediaType }) => {
  try {
       const uniqueFileName = `${Date.now()}-${fileName}`;
    const savePath = path.join(groupDir, uniqueFileName);

    const base64Data = fileData.replace(/^data:.+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(savePath, buffer);

    const message = await MessageGroup.create({
      groupId,
      senderId: userId,
      mediaUrl: `/uploads/mediaFiles/group/${uniqueFileName}`,
      mediaType: mediaType || "file",
      fileName: uniqueFileName,
      readBy: [userId]
    });

    const group = await GroupService.get(groupId);
    if (!group) {
      console.error(`Group not found for groupId: ${groupId}`);
      return;
    }
    group.members.forEach(memberId => {
      io.to(memberId.toString()).emit('group_message', {
        groupId,
        from: userId,
        mediaUrl: `/uploads/mediaFiles/group/${uniqueFileName}`,
        mediaType: mediaType || "file",
        fileName: uniqueFileName,
        timestamp: message.createdAt,
        messageId: message._id
      });
    });
  } catch (err) {
    console.error('Group file send error:', err);
  }
});


// 1:1 Message Delete
socket.on('delete_one_to_one_message', async ({ messageId, toUserId }) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) return;
    if (String(message.senderId) !== String(userId)) return; // Only sender can delete

    await Message.findByIdAndUpdate(messageId, { isDeleted: true });

    // Notify both users to remove message from UI
    io.to(userId).emit('message_deleted', { messageId });
    io.to(toUserId).emit('message_deleted', { messageId });
  } catch (err) {
    console.error('Error deleting 1:1 message:', err);
  }
});


// Group Message Delete
socket.on('delete_group_message', async ({ groupMessageId, groupId }) => {
  try {
    const message = await MessageGroup.findById(groupMessageId);
    if (!message) return;
    if (String(message.senderId) !== String(userId)) return; // Only sender can delete

    await MessageGroup.findByIdAndUpdate(groupMessageId, { isDeleted: true });

    // Notify all group members to remove message from UI
    const group = await GroupService.get(groupId);
    if (!group) return;
    group.members.forEach(memberId => {
      io.to(memberId.toString()).emit('group_message_deleted', { groupMessageId });
    });
  } catch (err) {
    console.error('Error deleting group message:', err);
  }
});




   socket.on('disconnect', async () => {
  try {
    const lastSeen = new Date();
    await userService.findByIdAndUpdate(userId, { statusMsg: "offline", lastSeen });
    io.emit('user_offline', { userId, lastSeen }); 
    console.log(`User ${userId} disconnected. Status updated to offline. Last seen updated.`);
  } catch (err) {
    console.error('Error updating lastSeen:', err);
  }
});


  });
};  