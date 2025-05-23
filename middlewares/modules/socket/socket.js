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

    socket.on('file_send', async ({ toUserId, fileName, fileData, mediaType, tempId }) => {
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
        const mediaUrl = `/uploads/mediaFiles/oneToOne/${uniqueFileName}`;

        const message = await Message.create({
          senderId: userId,
          receiverId: toUserId,
          chatType: 'one2one',
          mediaUrl,
          mediaType,
          fileName,
        });

        const messageData = {
          from: userId,
          mediaUrl,
          mediaType,
          fileName,
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

    socket.on('group_file_send', async ({ groupId, fileName, fileData, mediaType }) => {
      try {
        const uniqueFileName = `${Date.now()}-${fileName}`;
        const savePath = path.join(groupDir, uniqueFileName);
        const base64Data = fileData.replace(/^data:.+;base64,/, '');
        fs.writeFileSync(savePath, Buffer.from(base64Data, 'base64'));

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