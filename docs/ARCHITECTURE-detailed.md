# Architecture - Detailed

Comprehensive system architecture for ChatterBox.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Database Schema](#database-schema)
5. [Scaling Strategy](#scaling-strategy)
6. [Infrastructure](#infrastructure)

---

## System Overview

ChatterBox is a production-ready real-time chat application built with:

- **Runtime**: Node.js 18+
- **Web Framework**: Express.js
- **Real-time**: Socket.io
- **Database**: MongoDB 7+
- **Cache/Queue**: Redis 7+
- **Storage**: MinIO (S3-compatible)
- **Container**: Docker, Kubernetes

---

## Component Architecture

### API Server

```
┌─────────────────────────────────────────────┐
│              API Server                      │
├─────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Routes  │  │   Auth   │  │  Middle  │  │
│  │          │  │          │  │   ware   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Services │  │   Models │  │   Utils  │  │
│  │          │  │          │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
           │              │
           ▼              ▼
    ┌──────────┐   ┌──────────┐
    │  MongoDB │   │   Redis  │
    └──────────┘   └──────────┘
```

### WebSocket Handler

```
┌─────────────────────────────────────────────┐
│          WebSocket Handler                  │
├─────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐   │
│  │        Connection Manager             │   │
│  │  - Authentication                      │   │
│  │  - Room management                    │   │
│  │  - Presence tracking                  │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Chat   │  │   Room   │  │   User   │   │
│  │ Handler  │  │ Handler  │  │ Handler  │   │
│  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────┘
           │
           ▼
    ┌──────────┐
    │   Redis  │
    │  Pub/Sub │
    └──────────┘
```

---

## Data Flow

### Message Flow

```
User A                    Server                      User B
  │                         │                           │
  │──send-message─────────▶│                           │
  │                         │                           │
  │                         │──validate───────────────▶│
  │                         │                           │
  │                         │◀─validate-complete───────┤
  │                         │                           │
  │                         │──persist to MongoDB─────▶│
  │                         │                           │
  │                         │◀─persist-complete────────┤
  │                         │                           │
  │                         │──publish to Redis───────▶│
  │                         │                           │
  │◀─message───────────────┤                           │
  │                         │                           │
  │                         │◀─subscribe from Redis─────┤
  │                         │                           │
  │                         │──broadcast───────────────▶│
  │                         │                           │
  │                         │                           │
```

### Authentication Flow

```
User                    Server                     Redis
  │                        │                         │
  │──login (email/pass)───▶│                         │
  │                        │                         │
  │                        │──verify credentials─────▶│
  │                        │                         │
  │                        │◀─verify complete────────┤
  │                        │                         │
  │                        │──create tokens─────────▶│
  │                        │                         │
  │◀─access + refresh token┤                         │
  │                        │                         │
```

---

## Database Schema

### User Model

```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  avatar: String,
  status: String (online/offline/away),
  lastSeen: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation Model

```javascript
{
  _id: ObjectId,
  type: String (direct/group),
  name: String,
  participants: [ObjectId],
  admins: [ObjectId],
  lastMessage: ObjectId,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  sender: ObjectId,
  content: String,
  type: String (text/image/file),
  attachments: [ObjectId],
  readBy: [{ user: ObjectId, readAt: Date }],
  createdAt: Date
}
```

### Room Model

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  createdBy: ObjectId,
  createdAt: Date
}
```

---

## Scaling Strategy

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (nginx/HAProxy)│
                    └────────┬────────┘
                             │
      ┌──────────┬───────────┼───────────┬──────────┐
      ▼          ▼           ▼           ▼          ▼
 ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
 │ Pod 1  │ │ Pod 2  │ │ Pod 3  │ │ Pod N  │ │  ...   │
 │        │ │        │ │        │ │        │ │        │
 └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
      │          │          │          │          │
      └──────────┴──────────┴──────────┴──────────┘
                 │
                 ▼
         ┌──────────────┐
         │    Redis     │
         │  (Pub/Sub)   │
         └──────────────┘
```

### Database Connection Pooling

- **MongoDB**: 10 connections per instance
- **Redis**: Connection pooling enabled

### Rate Limiting

- **API**: 100 requests/minute per IP
- **WebSocket**: 10 messages/second per user
- **Implementation**: Token bucket algorithm with Redis

---

## Infrastructure

### Development

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Node.js   │     │  MongoDB   │     │    Redis    │
│   (3000)    │     │  (27017)   │     │   (6379)    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Production

```
┌─────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │                   Services                         │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │  │
│  │  │   API   │ │   API   │ │   API   │ │   API   │  │  │
│  │  │ Replica │ │ Replica │ │ Replica │ │ Replica │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Data Layer                           │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────────────┐   │  │
│  │  │ MongoDB │ │  Redis  │ │       MinIO        │   │  │
│  │  │ Cluster │ │ Cluster │ │    (S3 Storage)    │   │  │
│  │  └─────────┘ └─────────┘ └─────────────────────┘   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Docker Setup](DOCKER.md)
- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](API.md)
- [WebSocket Events](WEBSOCKET.md)
