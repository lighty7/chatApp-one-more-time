# Features Overview

Brief overview of ChatterBox features. See [FEATURES.md](FEATURES-detailed.md) for detailed documentation.

## Core Features

| Feature | Description |
|---------|-------------|
| Room-based Chat | Public rooms (general, random, tech) with real-time messaging |
| 1:1 Chat | Direct messages between users with user search |
| Group Chat | Create groups with multiple participants and admin controls |
| User Authentication | JWT-based registration and login |
| Real-time Messaging | Instant message delivery via WebSocket |

## Advanced Features

| Feature | Description |
|---------|-------------|
| Online/Offline Presence | Live user status with heartbeat system |
| Typing Indicators | Show when users are typing |
| Read Receipts | Track message read status |
| File Sharing | Upload and share files (images, videos, documents) |
| Message History | Persistent message storage with pagination |

## AI Features

| Feature | Description |
|---------|-------------|
| AI Chat Backend | Streaming AI responses |
| Stop Functionality | Abort controller to stop streaming |
| Context-Aware | Maintains conversation context |

## Account Features

| Feature | Description |
|---------|-------------|
| Delete Account | User can delete their account |
| Notifications | In-app notifications for events |
| Online Indicators | Real-time online status display |

## Scalability Features

| Feature | Description |
|---------|-------------|
| Event-Driven | Redis Streams for message queuing |
| Horizontal Scaling | Ready for multi-instance deployment |
| Sticky Sessions | Session affinity via nginx ingress |
| Rate Limiting | Redis-based token bucket rate limiting |
| Message Queue | Async message processing with workers |

## Quick Links

- [Detailed Features](FEATURES-detailed.md)
- [AI Chat Documentation](../AI-CHAT.md)
- [API Documentation](../API.md)
- [WebSocket Events](../WEBSOCKET.md)
