const mongoose = require('mongoose'); // Add mongoose for ObjectId
const Message = require('../../../models/message');
const MessageGroup = require('../../../models/messageGroup');
const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET } = process.env;
const fs = require('fs');
const path = require('path');
const oneToOneDir = path.join(__dirname, '../../../Uploads/mediaFiles/oneToOne');
const groupDir = path.join(__dirname, '../../../Uploads/mediaFiles/group');
[oneToOneDir, groupDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const GroupService = require('../../../services/group/groupService');
const userService = require('../../../services/user/userService');

module.exports = function(server) {       
  const { Server } = require('socket.io');
  const io = new Server(server, { 
    cors: { origin: "*" },
    transports: ['websocket', 'polling'] 
  });

  const onlineUsers = new Set();

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));

    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
      socket.userId = decoded._id || decoded.id;
      next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  io.on('connection', async socket => {
    const userId = socket.userId;
    onlineUsers.add(userId);
    await userService.findByIdAndUpdate(userId, { statusMsg: "online" });

    // Send existing online users to the new client
    const connectedSockets = Array.from(io.sockets.sockets.values());
    const onlineUserIds = connectedSockets
      .filter(s => s.userId !== userId)
      .map(s => s.userId);
    const uniqueOnlineUserIds = [...new Set(onlineUserIds)];
    uniqueOnlineUserIds.forEach(id => socket.emit('user_online', { userId: id }));
    socket.broadcast.emit('user_online', { userId });

    console.log(`User ${userId} connected. Status updated to online.`);
    socket.join(userId);

    socket.on('private_message', async ({ toUserId, text, mediaUrl, tempId }) => {
      const sender = await userService.get(userId);
      const receiver = await userService.get(toUserId);
      if (
        receiver.blockedUsers.includes(userId) ||
        sender.blockedUsers.includes(toUserId)
      ) return;

      try {
        const message = await Message.create({
          senderId: userId,
          chatType: 'one2one',
          receiverId: toUserId,
          text,
          mediaUrl,
        });
        const messageData = { 
          from: userId, 
          text, 
          mediaUrl, 
          timestamp: message.createdAt,
          messageId: message._id 
        };
        io.to(toUserId).emit('private_message', messageData);
        if (tempId) {
          socket.emit('message_sent', { tempId, messageId: message._id });
        }
      } catch (err) {
        console.error('Message save error:', err);
      }
    });

    socket.on('group_message', async ({ groupId, text, mediaUrl }) => {
      const message = await MessageGroup.create({
        groupId,
        senderId: userId,
        text,
        mediaUrl,
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
          text,
          mediaUrl,
          timestamp: message.createdAt,
          messageId: message._id
        });
      });
    });

    socket.on('typing', ({ toUserId, groupId }) => {
      if (groupId) {
        socket.to(groupId).emit('typing', { groupId, from: userId });
      } else {
        io.to(toUserId).emit('typing', { from: userId });
      }
    });

    socket.on('mark_read', async ({ messageId }) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { $addToSet: { readBy: userId } },
          { new: true }
        );
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

    socket.on('file_send', async ({ toUserId, fileName, fileData, mediaType, tempId, duration }) => {
      try {
        const sender = await userService.get(userId);
        const receiver = await userService.get(toUserId);
        if (
          receiver.blockedUsers.includes(userId) ||
          sender.blockedUsers.includes(toUserId)
        ) return;

        const base64Data = fileData.replace(/^data:.*;base64,/, '');
        const uniqueFileName = `${Date.now()}_${fileName}`;
        const filePath = path.join(oneToOneDir, uniqueFileName);
        fs.writeFileSync(filePath, base64Data, 'base64');
        const mediaUrl = `/Uploads/mediaFiles/oneToOne/${uniqueFileName}`;

        const message = await Message.create({
          senderId: userId,
          receiverId: toUserId,
          chatType: 'one2one',
          mediaUrl,
          mediaType,
          fileName,
          duration: mediaType === 'audio' ? duration : undefined,
        });

        const messageData = {
          from: userId,
          mediaUrl,
          mediaType,
          fileName,
          duration: message.duration,
          timestamp: message.createdAt,
          messageId: message._id
        };
        io.to(toUserId).emit('private_message', messageData);
        if (tempId) {
          socket.emit('message_sent', { tempId, messageId: message._id });
        }
      } catch (err) {
        console.error("Error sending file:", err);
      }
    });

    socket.on('group_file_send', async ({ groupId, fileName, fileData, mediaType, duration }) => {
      try {
        const uniqueFileName = `${Date.now()}-${fileName}`;
        const savePath = path.join(groupDir, uniqueFileName);
        const base64Data = fileData.replace(/^data:.+;base64,/, '');
        fs.writeFileSync(savePath, Buffer.from(base64Data, 'base64'));

        const message = await MessageGroup.create({
          groupId,
          senderId: userId,
          mediaUrl: `/Uploads/mediaFiles/group/${uniqueFileName}`,
          mediaType: mediaType || "file",
          fileName: uniqueFileName,
          duration: mediaType === 'audio' ? duration : undefined,
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
            mediaUrl: `/Uploads/mediaFiles/group/${uniqueFileName}`,
            mediaType: mediaType || "file",
            fileName: uniqueFileName,
            duration: message.duration,
            timestamp: message.createdAt,
            messageId: message._id
          });
        });
      } catch (err) {
        console.error('Group file send error:', err);
      }
    });

    socket.on('delete_one_to_one_message', async ({ messageId, toUserId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message || String(message.senderId) !== String(userId)) return;

        await Message.findByIdAndUpdate(messageId, { isDeleted: true });
        io.to(userId).emit('message_deleted', { messageId });
        io.to(toUserId).emit('message_deleted', { messageId });
      } catch (err) {
        console.error('Error deleting 1:1 message:', err);
      }
    });

    socket.on('delete_group_message', async ({ groupMessageId, groupId }) => {
      try {
        const message = await MessageGroup.findById(groupMessageId);
        if (!message || String(message.senderId) !== String(userId)) return;

        await MessageGroup.findByIdAndUpdate(groupMessageId, { isDeleted: true });
        const group = await GroupService.get(groupId);
        if (!group) return;
        group.members.forEach(memberId => {
          io.to(memberId.toString()).emit('group_message_deleted', { groupMessageId });
        });
      } catch (err) {
        console.error('Error deleting group message:', err);
      }
    });
    
    socket.on('update_message', async ({ messageId, newText }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message || String(message.senderId) !== String(userId)) return;
        message.text = newText;
        message.updatedAt = new Date();
        await message.save();
        const updateData = { messageId, newText, updatedAt: message.updatedAt };
        io.to(message.senderId.toString()).emit('message_updated', updateData);
        io.to(message.receiverId.toString()).emit('message_updated', updateData);
      } catch (err) {
        console.error('Error updating message:', err);
      }
    });

    socket.on('update_group_message', async ({ groupMessageId, newText, groupId }) => {
      try {
        const message = await MessageGroup.findById(groupMessageId);
        if (!message || String(message.senderId) !== String(userId)) return;
        message.text = newText;
        message.updatedAt = new Date();
        await message.save();

        const group = await GroupService.get(groupId);
        if (!group) return;
        group.members.forEach(memberId => {
          io.to(memberId.toString()).emit('group_message_updated', {
            groupMessageId,
            newText,
            updatedAt: message.updatedAt
          });
        });
      } catch (err) {
        console.error('Error updating group message:', err);
      }
    });

    socket.on('forward_message', async ({ originalMessageType, originalMessageId, targetType, targetId }) => {
      try {
        let originalMessage;
        if (originalMessageType === 'one2one') {
          originalMessage = await Message.findOne({ _id: originalMessageId, isDeleted: { $ne: true } });
          if (!originalMessage) return console.error(`Original one-to-one message not found: ${originalMessageId}`);
          if (String(originalMessage.senderId) !== userId && String(originalMessage.receiverId) !== userId) {
            return console.error(`User ${userId} cannot forward message ${originalMessageId}`);
          }
        } else if (originalMessageType === 'group') {
          originalMessage = await MessageGroup.findOne({ _id: originalMessageId, isDeleted: { $ne: true } });
          if (!originalMessage) return console.error(`Original group message not found: ${originalMessageId}`);
          const group = await GroupService.get(originalMessage.groupId);
          if (!group || !group.members.includes(userId)) {
            return console.error(`User ${userId} not in group ${originalMessage.groupId}`);
          }
        } else {
          return console.error(`Invalid originalMessageType: ${originalMessageType}`);
        }

        const newMessageData = {
          text: originalMessage.text,
          mediaUrl: originalMessage.mediaUrl,
          mediaType: originalMessage.mediaType,
          fileName: originalMessage.fileName,
          duration: originalMessage.duration,
          forwardedFrom: { type: originalMessageType, id: originalMessage._id },
        };

        if (targetType === 'one2one') {
          const receiver = await userService.get(targetId);
          if (!receiver) return console.error(`Target user not found: ${targetId}`);
          const sender = await userService.get(userId);
          if (receiver.blockedUsers.includes(userId) || sender.blockedUsers.includes(targetId)) {
            return console.error(`Blocked: ${userId} cannot forward to ${targetId}`);
          }

          const newMessage = await Message.create({
            senderId: userId,
            receiverId: targetId,
            chatType: 'one2one',
            ...newMessageData,
          });

          const messageData = {
            from: userId,
            text: newMessage.text,
            mediaUrl: newMessage.mediaUrl,
            mediaType: newMessage.mediaType,
            fileName: newMessage.fileName,
            duration: newMessage.duration,
            timestamp: newMessage.createdAt,
            messageId: newMessage._id,
            forwardedFrom: newMessage.forwardedFrom,
          };
          io.to(targetId).emit('private_message', messageData);
          socket.emit('message_sent', { messageId: newMessage._id });
        } else if (targetType === 'group') {
          const group = await GroupService.get(targetId);
          if (!group) return console.error(`Target group not found: ${targetId}`);
          if (!group.members.includes(userId)) {
            return console.error(`User ${userId} not in target group ${targetId}`);
          }

          const newMessage = await MessageGroup.create({
            groupId: targetId,
            senderId: userId,
            ...newMessageData,
          });

          const messageData = {
            groupId: targetId,
            from: userId,
            text: newMessage.text,
            mediaUrl: newMessage.mediaUrl,
            mediaType: newMessage.mediaType,
            fileName: newMessage.fileName,
            duration: newMessage.duration,
            timestamp: newMessage.createdAt,
            messageId: newMessage._id,
            forwardedFrom: newMessage.forwardedFrom,
          };
          group.members.forEach(memberId => io.to(memberId.toString()).emit('group_message', messageData));
        } else {
          return console.error(`Invalid targetType: ${targetType}`);
        }

        console.log(`Message ${originalMessageId} forwarded by ${userId} to ${targetType} ${targetId}`);
      } catch (err) {
        console.error('Forward message error:', err);
      }
    });

    // Add Reaction
    socket.on('add_reaction', async ({ messageType, messageId, reaction }) => {
      try {
        let message;
        const userObjectId = new mongoose.Types.ObjectId(userId); // Convert string userId to ObjectId

        if (messageType === 'one2one') {
          message = await Message.findById(messageId);
          if (!message || (String(message.senderId) !== userId && String(message.receiverId) !== userId)) {
            return console.error(`User ${userId} cannot react to message ${messageId}`);
          }
        } else if (messageType === 'group') {
          message = await MessageGroup.findById(messageId);
          if (!message) return console.error(`Group message not found: ${messageId}`);
          const group = await GroupService.get(message.groupId);
          if (!group || !group.members.includes(userObjectId)) {
            return console.error(`User ${userId} not in group ${message.groupId}`);
          }
        } else {
          return console.error(`Invalid messageType: ${messageType}`);
        }

        // Add or update reaction
        const existingReactionIndex = message.reactions.findIndex(r => r.userId.equals(userObjectId));
        if (existingReactionIndex > -1) {
          message.reactions[existingReactionIndex].reaction = reaction;
        } else {
          message.reactions.push({ userId: userObjectId, reaction });
        }
        await message.save();

        // Emit to relevant users, sending userId as string
        if (messageType === 'one2one') {
          io.to(message.senderId.toString()).emit('reaction_added', { messageId, userId, reaction });
          io.to(message.receiverId.toString()).emit('reaction_added', { messageId, userId, reaction });
        } else if (messageType === 'group') {
          const group = await GroupService.get(message.groupId);
          group.members.forEach(memberId => {
            io.to(memberId.toString()).emit('group_reaction_added', { groupMessageId: messageId, userId, reaction });
          });
        }
      } catch (err) {
        console.error('Add reaction error:', err);
      }
    });

    // Remove Reaction
    socket.on('remove_reaction', async ({ messageType, messageId }) => {
      try {
        let message;
        const userObjectId = new mongoose.Types.ObjectId(userId); // Convert string userId to ObjectId

        if (messageType === 'one2one') {
          message = await Message.findById(messageId);
          if (!message || (String(message.senderId) !== userId && String(message.receiverId) !== userId)) {
            return console.error(`User ${userId} cannot remove reaction from message ${messageId}`);
          }
        } else if (messageType === 'group') {
          message = await MessageGroup.findById(messageId);
          if (!message) return console.error(`Group message not found: ${messageId}`);
          const group = await GroupService.get(message.groupId);
          if (!group || !group.members.includes(userObjectId)) {
            return console.error(`User ${userId} not in group ${message.groupId}`);
          }
        } else {
          return console.error(`Invalid messageType: ${messageType}`);
        }

        // Remove reaction
        message.reactions = message.reactions.filter(r => !r.userId.equals(userObjectId));
        await message.save();

        // Emit to relevant users, sending userId as string
        if (messageType === 'one2one') {
          io.to(message.senderId.toString()).emit('reaction_removed', { messageId, userId });
          io.to(message.receiverId.toString()).emit('reaction_removed', { messageId, userId });
        } else if (messageType === 'group') {
          const group = await GroupService.get(message.groupId);
          group.members.forEach(memberId => {
            io.to(memberId.toString()).emit('group_reaction_removed', { groupMessageId: messageId, userId });
          });
        }
      } catch (err) {
        console.error('Remove reaction error:', err);
      }
    });

    
    socket.on('disconnect', async () => {
      try {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        await userService.findByIdAndUpdate(userId, { statusMsg: "offline", lastSeen });
        io.emit('user_offline', { userId, lastSeen }); 
        console.log(`User ${userId} disconnected. Status updated to offline.`);
      } catch (err) {
        console.error('Error updating lastSeen:', err);
      }
    });
  });
};