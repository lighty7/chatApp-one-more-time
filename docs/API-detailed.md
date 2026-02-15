# API Documentation - Detailed

Complete REST API reference for ChatterBox.

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.chatterbox.com/api
```

## Authentication

All endpoints (except register/login) require a JWT token:

```bash
Authorization: Bearer <token>
```

---

## Endpoints

### Authentication

#### POST /api/auth/register

Create a new account.

**Request:**
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "username": "john",
      "email": "john@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1..."
  }
}
```

---

#### POST /api/auth/login

Login with email and password.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1..."
  }
}
```

---

#### POST /api/auth/logout

Invalidate current token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### POST /api/auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1..."
  }
}
```

---

#### GET /api/auth/me

Get current user info.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "username": "john",
    "email": "john@example.com",
    "avatar": "...",
    "status": "online",
    "lastSeen": "2024-01-15T10:30:00Z"
  }
}
```

---

#### POST /api/auth/forgot-password

Request password reset.

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

#### POST /api/auth/reset-password

Reset password with token.

**Request:**
```json
{
  "token": "reset-token",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### Users

#### GET /api/users

Search users.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query (username or email) |
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 20) |

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "...",
        "username": "john",
        "avatar": "...",
        "status": "online"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

---

#### GET /api/users/:id

Get user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "username": "john",
    "email": "john@example.com",
    "avatar": "...",
    "status": "online",
    "lastSeen": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### GET /api/users/:id/presence

Get user presence status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "status": "online",
    "lastSeen": "2024-01-15T10:30:00Z"
  }
}
```

---

### Conversations

#### GET /api/conversations

List all conversations for current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by type (direct/group) |
| page | number | Page number |
| limit | number | Results per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "_id": "...",
        "type": "direct",
        "participants": [...],
        "lastMessage": {
          "content": "Hello!",
          "sender": "...",
          "createdAt": "2024-01-15T10:30:00Z"
        }
      }
    ]
  }
}
```

---

#### POST /api/conversations/direct

Create a 1:1 conversation.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "participantId": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "type": "direct",
    "participants": [...]
  }
}
```

---

#### POST /api/conversations/group

Create a group conversation.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "My Group",
  "description": "Group description",
  "participants": ["user-id-1", "user-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "type": "group",
    "name": "My Group",
    "participants": [...],
    "admins": [...]
  }
}
```

---

#### GET /api/conversations/:id

Get conversation details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "type": "group",
    "name": "My Group",
    "participants": [...],
    "admins": [...],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### GET /api/conversations/:id/messages

Get conversation messages.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Messages per page (default: 50) |
| before | string | Message ID for pagination |

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "...",
        "conversationId": "...",
        "sender": {
          "_id": "...",
          "username": "john"
        },
        "content": "Hello!",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100
    }
  }
}
```

---

#### POST /api/conversations/:id/read

Mark messages as read.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "messageIds": ["msg-id-1", "msg-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Messages marked as read"
}
```

---

#### POST /api/conversations/:id/leave

Leave a conversation.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Left conversation successfully"
}
```

---

#### POST /api/conversations/messages/:messageId/reactions

Add a reaction to a message.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "emoji": "👍"
}
```

**Response:**
```json
{
  "_id": "message-id",
  "content": "Hello!",
  "reactions": [
    { "user": { "_id": "user-id", "displayName": "John" }, "emoji": "👍" }
  ]
}
```

**Note:** Only predefined emojis are allowed: 👍 ❤️ 😂 😮 😢 🙏 🎉 🔥

---

#### DELETE /api/conversations/messages/:messageId/reactions

Remove a reaction from a message.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| emoji | string | The emoji to remove (required) |

**Response:**
```json
{
  "_id": "message-id",
  "content": "Hello!",
  "reactions": []
}
```

---

### Rooms (Legacy)

#### GET /api/rooms

List all rooms.

**Response:**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "_id": "...",
        "name": "general",
        "description": "General discussion",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

#### GET /api/rooms/:name

Get room info.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "general",
    "description": "General discussion",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### POST /api/rooms

Create a new room.

**Request:**
```json
{
  "name": "new-room",
  "description": "Room description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "new-room",
    "description": "Room description"
  }
}
```

---

#### GET /api/rooms/:name/messages

Get room messages.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Messages per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [...]
  }
}
```

---

### Files

#### POST /api/files/upload

Upload a file.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request (multipart/form-data):**
| Field | Type | Description |
|-------|------|-------------|
| file | File | File to upload |
| type | string | File type (image/document/video) |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "filename": "abc123.jpg",
    "originalName": "photo.jpg",
    "mimetype": "image/jpeg",
    "size": 102400,
    "url": "/uploads/abc123.jpg"
  }
}
```

---

#### GET /api/files/:id

Get file info.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "filename": "abc123.jpg",
    "originalName": "photo.jpg",
    "mimetype": "image/jpeg",
    "size": 102400,
    "url": "/uploads/abc123.jpg",
    "uploadedBy": "...",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### DELETE /api/files/:id

Delete a file.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

#### GET /api/files/room/:roomId

Get all files in a room.

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [...]
  }
}
```

---

### Health Check

#### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "2.0.0"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

---

## Related Documentation

- [WebSocket Events](WEBSOCKET.md)
- [Authentication](SECURITY.md)
- [Features](FEATURES.md)
