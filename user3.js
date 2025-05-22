const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
  auth: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MmM4MGE5YTY1NmE1M2U5ODdmMjU1YSIsImlhdCI6MTc0Nzg5MzkxOSwiZXhwIjoxNzQ3OTM3MTE5fQ.E_sCIq-iaQROyBBDqfULzMHlTDVqXSpI_CFlEwbK_dQ" }
});

socket.on("connect", () => {
  console.log("User3 connected");




  
  socket.emit("private_message", {
    toUserId: "682c808aa656a53e987f2554", // sending to alex
    text: "Hello Alex! This is Ben 🧑‍💻"
  });

  // Send a message to rey
  socket.emit("private_message", {
    toUserId: "682c809ba656a53e987f2557", // sending to rey
    text: "Hey Rey! Ben here 👋"
  });
});

socket.on("private_message", (data) => {
  console.log("User3 received:", data);
    if (data.mediaUrl) {
    console.log("Received file:", data.mediaUrl, data.fileName);
  }
});

socket.on("group_message", (data) => {
  console.log("Group message received:", data);
    if (data.mediaUrl) {
    console.log("Received group file:", data.mediaUrl, data.fileName);
  }
});

socket.emit('mark_read', { messageId: '682d74f8a56d2a576cf04bce' });



// 1:1 chat 
socket.emit('typing', { toUserId: '682c809ba656a53e987f2557' });

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
  toUserId: '682c809ba656a53e987f2557',
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
  messageId: '682d7251a44c202bf0e290dd',
  toUserId: '682c809ba656a53e987f2557'
});


socket.emit('delete_group_message', {
  groupMessageId: '682dc2575463de2df01a58eb',
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
  newText: 'Your new edited message2'
});


socket.emit('update_group_message', {
  groupMessageId: '682dc871215a5a36d0f076e2',
  newText: 'Your new edited group message2',
  groupId: '682d6bcd8f618b4d0c7506ca'
});

socket.on('message_read', ({ messageId, readBy }) => {
 
});
socket.on('group_message_read', ({ groupMessageId, readBy }) => {
  
});

socket.on("disconnect", () => {
  console.log("User3 disconnected");
});
