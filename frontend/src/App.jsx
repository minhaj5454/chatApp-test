import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const SOCKET_URL = 'http://localhost:3000';

export default function App() {
  const [token, setToken] = useState('');
  const [file, setFile] = useState(null);
  const [otherUserId, setOtherUserId] = useState('');
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socketIo = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketIo.on('connect', () => {
      console.log('✅ Connected:', socketIo.id);
      setUserId(socketIo.id);
    });

    socketIo.on('disconnect', () => {
      console.log('❌ Disconnected');
    });

    socketIo.on('private_message', (msg) => {
      console.log('📩 Message received:', msg);
      if (msg.mediaUrl) {
        msg.mediaUrl = SOCKET_URL + msg.mediaUrl;
      }
      setMessages(prev => [
        ...prev,
        {
          ...msg,
          fromSelf: false,
          timestamp: msg.timestamp || new Date().toISOString(),
          _id: msg.messageId,
        }
      ]);
    });

    socketIo.on('message_sent', ({ tempId, messageId }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? { ...msg, _id: messageId } : msg
      ));
    });

    socketIo.on('message_updated', ({ messageId, newText, updatedAt }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, text: newText, updatedAt } : msg
      ));
    });

    socketIo.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    });

    socketIo.on('user_online', ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    socketIo.on('user_offline', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    socketIo.on('typing', ({ from }) => {
      setTypingUser(from);
      setTimeout(() => setTypingUser(null), 1500);
    });

    socketIo.on('message_read', ({ messageId, readBy }) => {
      console.log(`Message ${messageId} read by ${readBy}`);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, readBy: [...(msg.readBy || []), readBy] } 
          : msg
      ));
    });

    setSocket(socketIo);
    return () => socketIo.disconnect();
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !socket || !otherUserId) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const messageElements = container.querySelectorAll('[data-message-id]');
      
      messageElements.forEach(el => {
        const messageId = el.getAttribute('data-message-id');
        const rect = el.getBoundingClientRect();
        
        if (rect.top >= containerRect.top && rect.bottom <= containerRect.bottom) {
          const message = messages.find(m => m._id === messageId);
          if (message && !message.fromSelf && (!message.readBy || !message.readBy.includes(userId))) {
            socket.emit('mark_read', { messageId });
          }
        }
      });
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [socket, otherUserId, userId, messages]);

  const sendMessage = () => {
    if (!input.trim() || !socket || !otherUserId) return;

    const tempId = Date.now().toString();
    const message = {
      toUserId: otherUserId,
      text: input,
      tempId,
    };

    socket.emit('private_message', message);
    setMessages(prev => [
      ...prev,
      {
        ...message,
        from: 'me',
        fromSelf: true,
        timestamp: new Date().toISOString(),
        _id: tempId,
      }
    ]);
    setInput('');
  };

  const sendFile = () => {
    if (!file || !socket || !otherUserId) return;

    const tempId = Date.now().toString();
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit('file_send', {
        toUserId: otherUserId,
        fileName: file.name,
        fileData: reader.result,
        mediaType: file.type,
        tempId,
      });
      setMessages(prev => [
        ...prev,
        {
          from: 'me',
          fromSelf: true,
          timestamp: new Date().toISOString(),
          text: '📎 File Sent',
          fileName: file.name,
          mediaUrl: reader.result,
          _id: tempId,
        }
      ]);
      setFile(null);
    };
    reader.readAsDataURL(file);
  };

  const deleteMessage = (messageId) => {
    if (!socket || !otherUserId) return;
    socket.emit('delete_one_to_one_message', { messageId, toUserId: otherUserId });
  };

  const updateMessage = (messageId) => {
    if (!socket || !editingText.trim()) return;
    socket.emit('update_message', { messageId, newText: editingText });
    setEditingMessageId(null);
  };

  const handleTyping = () => {
    if (socket && otherUserId) {
      socket.emit('typing', { toUserId: otherUserId });
    }
  };

  const isOtherUserOnline = onlineUsers.includes(otherUserId);

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>🔵 React Chat App</h2>

      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Your JWT Token"
          value={token}
          onChange={e => setToken(e.target.value)}
          style={{ width: '60%', marginRight: 10, padding: 8 }}
        />
        <input
          type="text"
          placeholder="Other User ID"
          value={otherUserId}
          onChange={e => setOtherUserId(e.target.value)}
          style={{ width: '35%', padding: 8 }}
        />
      </div>

      {otherUserId && (
        <div style={{ color: isOtherUserOnline ? 'green' : 'red', marginBottom: 10 }}>
          {isOtherUserOnline ? 'Online' : 'Offline'}
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
          disabled={!token || !otherUserId}
        />
        <button
          onClick={sendFile}
          style={{ marginLeft: 10, padding: '6px 16px' }}
          disabled={!file || !token || !otherUserId}
        >
          Send File
        </button>
        {file && <span style={{ marginLeft: 10 }}>{file.name}</span>}
      </div>

      <div 
        ref={messagesContainerRef}
        style={{
          border: '1px solid #ccc',
          height: 400,
          overflowY: 'auto',
          padding: 10,
          marginBottom: 10,
          backgroundColor: '#f4f4f4',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            data-message-id={msg._id}
            style={{
              textAlign: msg.fromSelf ? 'right' : 'left',
              margin: '5px 0',
              backgroundColor: msg.fromSelf ? '#d4edda' : '#ffffff',
              padding: '5px 10px',
              borderRadius: '10px',
              maxWidth: '70%',
              wordBreak: 'break-word',
              alignSelf: msg.fromSelf ? 'flex-end' : 'flex-start',
            }}
          >
            <div><strong style={{ color: 'black' }}>{msg.fromSelf ? 'Me' : msg.from || 'Other'}</strong></div>
            {msg.fromSelf && (
              <div>
                <button onClick={() => deleteMessage(msg._id)} style={{ marginRight: 5 }}>Delete</button>
                <button onClick={() => { setEditingMessageId(msg._id); setEditingText(msg.text); }}>Edit</button>
              </div>
            )}
            {editingMessageId === msg._id ? (
              <div>
                <input
                  type="text"
                  value={editingText}
                  onChange={e => setEditingText(e.target.value)}
                  style={{ width: '70%', marginBottom: 5 }}
                />
                <button onClick={() => updateMessage(msg._id)} style={{ marginRight: 5 }}>Save</button>
                <button onClick={() => setEditingMessageId(null)}>Cancel</button>
              </div>
            ) : (
              <div style={{ fontWeight: 'bold', marginBottom: 5, color: '#002387' }}>{msg.text}</div>
            )}
            {msg.mediaUrl && (
              <div style={{ marginTop: 5 }}>
                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" download={msg.fileName}>
                  📎 {msg.fileName || 'Download File'}
                </a>
              </div>
            )}
            <div style={{ fontSize: '0.8em', color: '#666', marginTop: 3 }}>
              {new Date(msg.timestamp).toLocaleTimeString()}
              {msg.updatedAt && <span> (edited)</span>}
              {msg.readBy && msg.readBy.includes(otherUserId) && (
                <span style={{ marginLeft: 5 }}>✓✓</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {typingUser && <div style={{ color: 'gray', marginBottom: 10 }}>✍️ {typingUser} is typing...</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          placeholder="Type a message"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleTyping}
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={sendMessage} style={{ padding: '10px 20px' }}>Send</button>
      </div>
    </div>
  );
}