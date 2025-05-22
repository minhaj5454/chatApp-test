const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
  auth: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MmM4MDhhYTY1NmE1M2U5ODdmMjU1NCIsImlhdCI6MTc0Nzg5Mzg1MiwiZXhwIjoxNzQ3OTM3MDUyfQ.JeZnxWby6pCN9krtb53_Lnwwnun-n7fdndf5I2jLCAM" }
});



socket.on("connect", () => {
  console.log("User1 connected");

  // Simulate a message to user3
  socket.emit("private_message", {


    toUserId: "682c80a9a656a53e987f255a", // ben's userId (token)
    text: "Hi Ben! This is Alex"
  });


 
socket.emit("group_message", {
  groupId: "682d6bcd8f618b4d0c7506ca", // groupID 
  text: "Hello group! This is Alex"
});

});

socket.on("private_message", (data) => {
  console.log("User1 received:", data);
    if (data.mediaUrl) {
    console.log("Received file:", data.mediaUrl, data.fileName);
  }
});


// 1:1 chat 
socket.emit('typing', { toUserId: '682c80a9a656a53e987f255a' });

// group chat
socket.emit('typing', { groupId: '682d6bcd8f618b4d0c7506ca' });



socket.on("typing", (data) => {
  if (data.groupId) {
    console.log(`User ${data.from} is typing in group ${data.groupId}`);
    //"Someone is typing in group..."
  } else {
    console.log(`User ${data.from} is typing...`);
    // "User is typing..."
  }
});


// Read file as base64 and send
const fs = require('fs');
const fileName = "test.pdf";
const fileData = fs.readFileSync(fileName, { encoding: 'base64' });
socket.emit('file_send', {
  toUserId: '682c80a9a656a53e987f255a',
  fileName,
  fileData: `data:application/pdf;base64,${fileData}`,
  mediaType: "file"
});

socket.emit('group_file_send', {
  groupId: '682d6bcd8f618b4d0c7506ca',
  fileName,
  fileData: `data:application/pdf;base64,${fileData}`,
  mediaType: "file"
});


// 1:1 message delete event
socket.on('message_deleted', ({ messageId }) => {
  // Remove message from UI/message array
  console.log("Message deleted:", messageId);
  // Example: messages = messages.filter(m => m._id !== messageId)
});

// Group message delete event
socket.on('group_message_deleted', ({ groupMessageId }) => {
  // Remove group message from UI/message array
  console.log("Group message deleted:", groupMessageId);
  // Example: groupMessages = groupMessages.filter(m => m._id !== groupMessageId)
});


socket.emit('delete_one_to_one_message', {
  messageId: '682dc3a43f005637e0775d92',
  toUserId: '682c80a9a656a53e987f255a'
});


socket.emit('delete_group_message', {
  groupMessageId: '682dc4012d1a032c74373df7',
  groupId: '682c808aa656a53e987f2554'
});



// 1:1 message update event
socket.on('message_updated', ({ messageId, newText }) => {
  // Update message in UI/message array
  console.log("Message updated:", messageId, newText);
  // Example: messages = messages.map(m => m._id === messageId ? { ...m, text: newText } : m)
});

// Group message update event
socket.on('group_message_updated', ({ groupMessageId, newText }) => {
  // Update group message in UI/message array
  console.log("Group message updated:", groupMessageId, newText);
  // Example: groupMessages = groupMessages.map(m => m._id === groupMessageId ? { ...m, text: newText } : m)
});

socket.emit('update_one_to_one_message', {
  messageId: '682dc4b968c7f455004e1ca4',
  newText: 'Your new edited message'
});


socket.emit('update_group_message', {
  groupMessageId: '682dc871215a5a36d0f076e2',
  newText: 'Your new edited group message',
  groupId: '682d6bcd8f618b4d0c7506ca'
});

socket.on('message_read', ({ messageId, readBy }) => {
 console.log("Message read:", messageId, "by", readBy);
});
socket.on('group_message_read', ({ groupMessageId, readBy }) => {
 console.log("Message read:", groupMessageId, "by", readBy);
  
});

socket.on("disconnect", () => {
  console.log("User1 disconnected");
});
