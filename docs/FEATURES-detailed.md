# Features - Detailed

Comprehensive documentation of all ChatterBox features.

## Table of Contents

1. [Core Messaging](#core-messaging)
2. [User Management](#user-management)
3. [AI Chat](#ai-chat)
4. [File Handling](#file-handling)
5. [Presence & Indicators](#presence--indicators)
6. [Scalability](#scalability)

---

## Core Messaging

### Room-based Chat

- **Public Rooms**: Pre-configured rooms (general, random, tech)
- **Real-time Messages**: Instant delivery via Socket.io
- **Message History**: Persistent storage with pagination
- **Room Events**: Join, leave, typing notifications

```javascript
// Join room
socket.emit('join-room', { roomName: 'general' });

// Send message
socket.emit('send-room-message', { 
  roomName: 'general', 
  content: 'Hello!' 
});
```

### 1:1 Direct Messages

- **User Search**: Find users by username or email
- **Conversation Management**: Create, list, delete conversations
- **Read Receipts**: Track message read status
- **Typing Indicators**: Show when user is typing

### Group Chat

- **Create Groups**: Name, description, avatar
- **Admin Controls**: Add/remove members, promote admins
- **Group Settings**: Mute, leave group
- **Member List**: View all group participants

---

## User Management

### Authentication

- **JWT-based**: Access + Refresh token mechanism
- **Registration**: Username, email, password
- **Login**: Email/password authentication
- **Password Reset**: Forgot/reset password flow
- **Session Management**: Logout, token invalidation

### Account Features

- **Delete Account**: User-initiated account deletion
- **Profile Management**: Update profile information
- **Presence Tracking**: Online/offline status

---

## AI Chat

### Features

- **Streaming Responses**: Real-time AI response streaming
- **Abort Controller**: Stop streaming at any time
- **Context-Aware**: Maintains conversation context
- **Conversation History**: AI remembers previous messages

### Usage

```javascript
// Send message to AI
socket.emit('ai-message', {
  conversationId: '...',
  content: 'Help me write code'
});

// Stop streaming
socket.emit('ai-stop', {
  conversationId: '...'
});

// Receive streaming response
socket.on('ai-stream', (data) => {
  console.log(data.content); // Partial response
});

socket.on('ai-complete', (data) => {
  console.log(data.content); // Full response
});
```

### Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_ENABLED` | Enable AI features | `false` |
| `AI_PROVIDER` | AI provider (openai, anthropic) | `openai` |
| `AI_MODEL` | Model to use | `gpt-3.5-turbo` |
| `AI_API_KEY` | API key for AI service | Required |

---

## File Handling

### Upload

- **Images**: jpg, png, gif, webp
- **Documents**: pdf, doc, docx, txt
- **Videos**: mp4, webm, mov
- **Max Size**: 10MB (configurable)

### Storage

- **Local Storage**: Default, files stored in `/uploads`
- **S3/MinIO**: Production-ready cloud storage

### API Endpoints

```
POST   /api/files/upload     - Upload file
GET    /api/files/:id        - Get file info
DELETE /api/files/:id        - Delete file
GET    /api/files/room/:roomId - Get room files
```

---

## Presence & Indicators

### Online/Offline Status

- **Heartbeat System**: Periodic ping to track status
- **Real-time Updates**: Instant status changes broadcast
- **Last Seen**: Timestamp of last activity
- **Presence Events**: `presence:online`, `presence:offline`

### Typing Indicators

```javascript
// Send typing
socket.emit('typing', { conversationId: '...' });

// Stop typing
socket.emit('stop-typing', { conversationId: '...' });

// Receive typing
socket.on('user-typing', (data) => {
  // data.userId, data.conversationId
});
```

### Read Receipts

```javascript
// Mark as read
socket.emit('mark-read', { 
  conversationId: '...', 
  messageIds: ['...'] 
});
```

---

## Scalability

### Event-Driven Architecture

- **Redis Streams**: Message queuing for async processing
- **Workers**: Background job processing
- **Pub/Sub**: Real-time message broadcasting

### Horizontal Scaling

- **Multi-instance**: Deploy multiple API replicas
- **Sticky Sessions**: WebSocket affinity
- **Redis**: Shared session and state

### Rate Limiting

- **API**: 100 requests/minute per IP
- **WebSocket**: 10 messages/second per user
- **Token Bucket**: Redis-based implementation

---

## Related Documentation

- [AI Chat](../docs/AI-CHAT.md)
- [API](../docs/API.md)
- [WebSocket](../docs/WEBSOCKET.md)
- [Architecture](../docs/ARCHITECTURE.md)
