# WebSocket Documentation - Detailed

Complete Socket.io events reference for ChatterBox.

## Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

---

## Client → Server Events

### Authentication

#### auth

Authenticate the socket connection.

```javascript
socket.emit('auth', { token: 'jwt-token' });
```

**Response:**
```javascript
socket.on('authenticated', (data) => {
  console.log('Authenticated:', data);
});

socket.on('unauthorized', (error) => {
  console.log('Unauthorized:', error.message);
});
```

---

### Room Events

#### join-room

Join a chat room.

```javascript
socket.emit('join-room', { 
  roomName: 'general' 
});
```

#### leave-room

Leave a chat room.

```javascript
socket.emit('leave-room', { 
  roomName: 'general' 
});
```

#### send-room-message

Send a message to a room.

```javascript
socket.emit('send-room-message', {
  roomName: 'general',
  content: 'Hello everyone!'
});
```

---

### Conversation Events

#### join-conversation

Join a conversation for real-time updates.

```javascript
socket.emit('join-conversation', {
  conversationId: 'conv-123'
});
```

#### leave-conversation

Leave a conversation.

```javascript
socket.emit('leave-conversation', {
  conversationId: 'conv-123'
});
```

#### send-message

Send a message to a conversation.

```javascript
socket.emit('send-message', {
  conversationId: 'conv-123',
  content: 'Hello!'
});
```

**With attachments:**
```javascript
socket.emit('send-message', {
  conversationId: 'conv-123',
  content: 'Check this out!',
  attachments: ['file-id-1', 'file-id-2']
});
```

---

### Presence Events

#### typing

Send typing indicator.

```javascript
socket.emit('typing', {
  conversationId: 'conv-123'
});
```

#### stop-typing

Stop typing indicator.

```javascript
socket.emit('stop-typing', {
  conversationId: 'conv-123'
});
```

#### mark-read

Mark messages as read.

```javascript
socket.emit('mark-read', {
  conversationId: 'conv-123',
  messageIds: ['msg-1', 'msg-2', 'msg-3']
});
```

#### heartbeat

Send heartbeat to maintain presence.

```javascript
socket.emit('heartbeat', {});
```

Recommended: Send every 30 seconds.

---

### AI Events

#### ai-message

Send message to AI assistant.

```javascript
socket.emit('ai-message', {
  conversationId: 'conv-123',
  content: 'Help me write a function'
});
```

#### ai-stop

Stop AI streaming response.

```javascript
socket.emit('ai-stop', {
  conversationId: 'conv-123'
});
```

---

## Server → Client Events

### Authentication

#### authenticated

Successful authentication.

```javascript
socket.on('authenticated', (data) => {
  console.log('User ID:', data.userId);
});
```

#### unauthorized

Failed authentication.

```javascript
socket.on('unauthorized', (error) => {
  console.log('Error:', error.message);
});
```

---

### Message Events

#### new-message

New message in a conversation.

```javascript
socket.on('new-message', (message) => {
  console.log('New message:', message);
  // {
  //   _id: '...',
  //   conversationId: 'conv-123',
  //   sender: { _id: '...', username: 'john' },
  //   content: 'Hello!',
  //   createdAt: '2024-01-15T10:30:00Z'
  // }
});
```

#### room-message

New message in a room.

```javascript
socket.on('room-message', (message) => {
  console.log('Room message:', message);
});
```

---

### Presence Events

#### user-joined-room

User joined a room.

```javascript
socket.on('user-joined-room', (data) => {
  console.log('User joined:', data);
  // {
  //   roomName: 'general',
  //   user: { _id: '...', username: 'john' }
  // }
});
```

#### user-left-room

User left a room.

```javascript
socket.on('user-left-room', (data) => {
  console.log('User left:', data);
});
```

#### user-typing

User is typing.

```javascript
socket.on('user-typing', (data) => {
  console.log('User typing:', data);
  // {
  //   conversationId: 'conv-123',
  //   userId: '...',
  //   username: 'john'
  // }
});
```

#### user-stop-typing

User stopped typing.

```javascript
socket.on('user-stop-typing', (data) => {
  console.log('User stopped typing:', data);
});
```

#### presence:online

User came online.

```javascript
socket.on('presence:online', (data) => {
  console.log('User online:', data);
  // {
  //   userId: '...',
  //   status: 'online'
  // }
});
```

#### presence:offline

User went offline.

```javascript
socket.on('presence:offline', (data) => {
  console.log('User offline:', data);
  // {
  //   userId: '...',
  //   status: 'offline',
  //   lastSeen: '2024-01-15T10:30:00Z'
  // }
});
```

---

### AI Events

#### ai-stream

Streaming AI response (partial).

```javascript
socket.on('ai-stream', (data) => {
  console.log('AI stream:', data.content);
  // Accumulates partial responses
});
```

#### ai-complete

AI response complete.

```javascript
socket.on('ai-complete', (data) => {
  console.log('AI complete:', data.content);
  // Full response
});
```

#### ai-error

AI error occurred.

```javascript
socket.on('ai-error', (error) => {
  console.log('AI error:', error.message);
});
```

---

### Error Events

#### error

General error.

```javascript
socket.on('error', (error) => {
  console.log('Error:', error);
  // {
  //   code: 'ERROR_CODE',
  //   message: 'Error message'
  // }
});
```

---

## Connection Management

### Reconnection

```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.log('Connection error:', error.message);
});
```

### Heartbeat Implementation

```javascript
// Send heartbeat every 30 seconds
setInterval(() => {
  if (socket.connected) {
    socket.emit('heartbeat', {});
  }
}, 30000);
```

---

## Complete Example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'jwt-token' }
});

// Connection events
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', (reason) => console.log('Disconnected:', reason));

// Auth events
socket.on('authenticated', () => console.log('Authenticated'));
socket.on('unauthorized', (err) => console.log('Unauthorized:', err.message));

// Messages
socket.on('new-message', (message) => {
  console.log('New message:', message.content);
});

// Presence
socket.on('presence:online', (data) => console.log('Online:', data.userId));
socket.on('presence:offline', (data) => console.log('Offline:', data.userId));

// Typing
socket.on('user-typing', (data) => console.log('Typing:', data.username));

// Send message
function sendMessage(conversationId, content) {
  socket.emit('send-message', { conversationId, content });
}

// Join conversation
function joinConversation(conversationId) {
  socket.emit('join-conversation', { conversationId });
}
```

---

## Related Documentation

- [API Documentation](API.md)
- [AI Chat](AI-CHAT.md)
- [Features](FEATURES.md)
