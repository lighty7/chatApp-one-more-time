# ChatterBox - Production Real-Time Chat System

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Socket.io-4.8+-green?style=for-the-badge" alt="Socket.io">
  <img src="https://img.shields.io/badge/MongoDB-7+-green?style=for-the-badge&logo=mongodb" alt="MongoDB">
  <img src="https://img.shields.io/badge/Redis-7+-green?style=for-the-badge&logo=redis" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-20+-blue?style=for-the-badge&logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/Kubernetes-1.28+-blue?style=for-the-badge&logo=kubernetes" alt="Kubernetes">
</p>

A scalable, production-ready real-time chat application built with Node.js, Socket.io, MongoDB, and Redis. Supports room-based chat, 1:1 messaging, group chats, file sharing, and more.

---

## Features

### Core Features
- **Room-based Chat** - Public rooms (general, random, tech) with real-time messaging
- **1:1 Chat** - Direct messages between users with user search
- **Group Chat** - Create groups with multiple participants and admin controls
- **User Authentication** - JWT-based registration and login
- **Real-time Messaging** - Instant message delivery via WebSocket

### Advanced Features
- **Online/Offline Presence** - Live user status with heartbeat system
- **Typing Indicators** - Show when users are typing
- **Read Receipts** - Track message read status
- **File Sharing** - Upload and share files (images, videos, documents)
- **Message History** - Persistent message storage with pagination

### AI Features
- **AI Chat Assistant** - Real-time AI-powered chat assistant
- **Streaming Responses** - Progressive AI response delivery
- **Abort Controller** - Stop AI responses mid-stream
- **Context-Aware** - Maintains conversation history with AI

### Account Features
- **Delete Account** - User-initiated account deletion
- **Notifications** - In-app notifications for messages and events
- **Online Indicators** - Real-time online/offline status display

### Scalability Features
- **Event-Driven Architecture** - Redis Streams for message queuing
- **Horizontal Scaling** - Ready for multi-instance deployment
- **Sticky Sessions** - Session affinity via nginx ingress
- **Rate Limiting** - Redis-based token bucket rate limiting
- **Message Queue** - Async message processing with workers

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        KUBERNETES CLUSTER                             │   │
│  │                                                                       │   │
│  │   ┌─────────┐    ┌─────────┐    ┌─────────┐                         │   │
│  │   │ Ingress │    │ Ingress │    │ Ingress │  (Sticky Sessions)       │   │
│  │   │ nginx   │    │ nginx   │    │ nginx   │                         │   │
│  │   └────┬────┘    └────┬────┘    └────┬────┘                         │   │
│  │        │              │              │                                │   │
│  │   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐                         │   │
│  │   │API Pod  │    │API Pod  │    │API Pod  │  (REST API - Horizontal) │   │
│  │   │         │    │         │    │         │                         │   │
│  │   └────┬────┘    └────┬────┘    └────┬────┘                         │   │
│  │        │              │              │                                │   │
│  │   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐                         │   │
│  │   │WS Pod   │    │WS Pod   │    │WS Pod   │  (Socket.io - Horizontal)│   │
│  │   │         │    │         │    │         │                         │   │
│  │   └────┬────┘    └────┬────┘    └────┬────┘                         │   │
│  │        └──────────────┼──────────────┘                                │   │
│  │                       │                                                │   │
│  └───────────────────────┼────────────────────────────────────────────────┘   │
│                          │                                                     │
│  ┌───────────────────────▼────────────────────────────────────────────────┐   │
│  │                        REDIS CLUSTER                                    │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │   │
│  │  │ Session │  │ Pub/Sub │  │ Streams │  │Presence │  │  Rate   │     │   │
│  │  │  Cache  │  │ Events  │  │  Queue  │  │ Tracker │  │ Limiter │     │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                    MONGODB REPLICA SET                                │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                              │   │
│  │  │ Primary │  │Secondary│  │Secondary│                              │   │
│  │  └─────────┘  └─────────┘  └─────────┘                              │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                    MINIO (S3-Compatible)                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                            │   │
│  │  │  Chat Files    │  │  Attachments    │                            │   │
│  │  │   Bucket       │  │    Bucket       │                            │   │
│  │  └─────────────────┘  └─────────────────┘                            │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (optional - via Docker)
- Redis (optional - via Docker)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Qugates/chatterbox.git
cd chatterbox
```

2. **Install dependencies**
```bash
npm install
```

3. **Start with Docker Compose (Recommended)**
```bash
docker-compose -f docker/docker-compose.dev.yml up -d
```

4. **Access the application**
- Web UI: http://localhost:3000
- API: http://localhost:3000/api
- Health: http://localhost:3000/api/health

### Manual Setup (Without Docker)

1. **Start MongoDB**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
```

2. **Start Redis**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Start the server**
```bash
npm run dev
```

---

## Production Deployment

### Docker Compose (Single Server)

1. **Configure environment**
```bash
cp .env.example .env
# Edit .env with production values
```

2. **Deploy**
```bash
docker-compose -f docker/docker-compose.prod.yml up -d
```

### Kubernetes (Recommended for Production)

1. **Apply configurations**
```bash
kubectl apply -f kubernetes/
```

2. **Check deployment status**
```bash
kubectl get pods -n chat-system
kubectl get services -n chat-system
```

3. **Access via Ingress**
Update your `/etc/hosts` or DNS:
```
chat.example.com -> <ingress-ip>
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/chat` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | Required |
| `S3_ENABLED` | Enable S3 storage | `false` |
| `S3_ENDPOINT` | S3/MinIO endpoint | `localhost:9000` |
| `S3_BUCKET` | S3 bucket name | `chat-files` |

---

## API Endpoints

### Authentication
```
POST   /api/auth/register    - Create account
POST   /api/auth/login       - Get JWT token
POST   /api/auth/logout      - Invalidate token
POST   /api/auth/refresh     - Refresh access token
GET    /api/auth/me          - Current user info
POST   /api/auth/forgot-password - Request password reset
POST   /api/auth/reset-password  - Reset password
```

### Users
```
GET    /api/users            - Search users
GET    /api/users/:id        - Get user profile
GET    /api/users/:id/presence - Get user presence
```

### Conversations
```
GET    /api/conversations    - List conversations
POST   /api/conversations/direct - Create 1:1 conversation
POST   /api/conversations/group  - Create group
GET    /api/conversations/:id - Get conversation
GET    /api/conversations/:id/messages - Get messages
PUT    /api/conversations/:id - Update group (admin only)
POST   /api/conversations/:id/participants - Add participant (admin only)
DELETE /api/conversations/:id/participants/:userId - Remove participant
PUT    /api/conversations/:id/participants/:userId/role - Update role (admin only)
POST   /api/conversations/:id/join - Join conversation
POST   /api/conversations/:id/leave - Leave conversation
POST   /api/conversations/:id/read - Mark as read
```

### Rooms (Legacy)
```
GET    /api/rooms            - List rooms
GET    /api/rooms/:name      - Get room info
POST   /api/rooms            - Create room
GET    /api/rooms/:name/messages - Get room messages
```

### Files
```
POST   /api/files/upload     - Upload file
GET    /api/files/:id        - Get file info
DELETE /api/files/:id        - Delete file
GET    /api/files/room/:roomId - Get room files
```

---

## WebSocket Events

### Client → Server
```javascript
// Authentication
socket.emit('auth', { token: 'jwt-token' });

// Room events
socket.emit('join-room', { roomName: 'general' });
socket.emit('leave-room', { roomName: 'general' });
socket.emit('send-room-message', { roomName: 'general', content: 'Hello!' });

// Conversation events
socket.emit('join-conversation', { conversationId: '...' });
socket.emit('send-message', { conversationId: '...', content: 'Hello!' });

// Presence events
socket.emit('typing', { conversationId: '...' });
socket.emit('stop-typing', { conversationId: '...' });
socket.emit('mark-read', { conversationId: '...', messageIds: [...] });
socket.emit('heartbeat', {});

// Group management events
socket.emit('add-participant', { conversationId: '...', userId: '...' });
socket.emit('remove-participant', { conversationId: '...', userId: '...' });
socket.emit('update-participant-role', { conversationId: '...', userId: '...', role: 'admin' });
```

### Server → Client
```javascript
// Authentication
socket.on('authenticated', (data) => {});

// Messages
socket.on('new-message', (message) => {});
socket.on('room-message', (message) => {});

// Presence
socket.on('user-joined-room', (data) => {});
socket.on('user-left-room', (data) => {});
socket.on('user-typing', (data) => {});
socket.on('user-stop-typing', (data) => {});
socket.on('presence:online', (data) => {});
socket.on('presence:offline', (data) => {});

// Group management
socket.on('participant-added', (data) => {});
socket.on('participant-removed', (data) => {});
socket.on('participant-role-updated', (data) => {});
```

---

## Scaling Guide

### Horizontal Scaling

The application is designed for horizontal scaling:

1. **Multiple API Instances**
   - Deploy multiple replicas via Kubernetes HPA
   - Use sticky sessions for WebSocket connections
   - Share session state via Redis

2. **Redis Pub/Sub**
   - All instances subscribe to Redis channels
   - Messages broadcast across all instances
   - Real-time sync without sticky sessions for messages

3. **Database Connection Pooling**
   - MongoDB connection pool: 10 connections per instance
   - Redis connection pooling

### Rate Limiting

- **API**: 100 requests/minute per IP
- **WebSocket**: 10 messages/second per user
- Redis-based token bucket implementation

### Performance Tips

1. **Use production Redis**: Enable persistence (AOF)
2. **Use S3 for files**: Don't store files on application server
3. **Enable compression**: Add nginx compression
4. **Use CDN**: Serve static assets via CDN

---

## Security

- **JWT Authentication**: Access + Refresh tokens
- **Password Hashing**: bcrypt with 12 salt rounds
- **Input Validation**: Server-side validation on all inputs
- **Rate Limiting**: Prevents abuse
- **CORS**: Configurable allowed origins
- **File Validation**: MIME type whitelist

---

## Project Structure

```
chatterbox/
├── src/
│   ├── api/              # REST API routes
│   │   ├── routes/       # API endpoints
│   │   └── middlewares/  # Auth, rate limiting
│   ├── config/           # Configuration
│   ├── models/           # MongoDB schemas
│   ├── services/         # Business logic
│   ├── websocket/        # Socket.io handlers
│   ├── queue/           # Redis Streams worker
│   ├── utils/           # Helpers
│   ├── app.js           # Express setup
│   └── server.js        # Entry point
├── public/              # Static files
├── docker/              # Docker configs
├── kubernetes/          # K8s manifests
├── tests/               # Test files
└── .env.example         # Environment template
```

---

## Recent Changes (v2.0)

### New Features
- **AI Chat Backend** - Added Ollama-powered AI assistant with streaming support
- **Abort Controller** - Users can stop AI responses mid-stream
- **Delete Account** - User-initiated account deletion functionality
- **Notifications** - In-app notification system
- **Online Indicators** - Real-time presence display

### Improvements
- **Enhanced WebSocket handlers** - Better error handling and room management
- **Improved test coverage** - Updated test suite with comprehensive tests
- **CI/CD enhancements** - Multi-version Node.js testing (18, 20, 21)
- **Docker optimizations** - Layer caching and build improvements

### Bug Fixes
- Room connection error fixes
- Lint error resolutions
- Various stability improvements

---

## Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

---

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check MongoDB is running
   - Verify MONGODB_URI in .env

2. **Redis Connection Error**
   - Check Redis is running
   - Verify REDIS_HOST and REDIS_PORT

3. **WebSocket Connection Issues**
   - Check CORS settings
   - Verify nginx WebSocket proxy configuration

4. **File Upload Fails**
   - Check storage permissions
   - Verify S3 credentials if using S3

### Logs

```bash
# View application logs
docker logs -f chat-app

# View Kubernetes logs
kubectl logs -n chat-system -l app.kubernetes.io/name=chat-app
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Credits

Built with:
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)
- [MinIO](https://min.io/)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Documentation

Comprehensive documentation is available in the `docs/` folder:

| Document | Description |
|----------|-------------|
| [docs/FEATURES.md](docs/FEATURES.md) | Features overview (brief) |
| [docs/FEATURES-detailed.md](docs/FEATURES-detailed.md) | Complete features documentation |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture overview (brief) |
| [docs/ARCHITECTURE-detailed.md](docs/ARCHITECTURE-detailed.md) | System architecture details |
| [docs/API.md](docs/API.md) | API endpoints overview |
| [docs/API-detailed.md](docs/API-detailed.md) | Complete API reference |
| [docs/WEBSOCKET.md](docs/WEBSOCKET.md) | WebSocket events overview |
| [docs/WEBSOCKET-detailed.md](docs/WEBSOCKET-detailed.md) | Socket.io events guide |
| [docs/AI-CHAT.md](docs/AI-CHAT.md) | AI chat overview |
| [docs/AI-CHAT-detailed.md](docs/AI-CHAT-detailed.md) | AI chat implementation |
| [docs/DOCKER.md](docs/DOCKER.md) | Docker setup overview |
| [docs/DOCKER-detailed.md](docs/DOCKER-detailed.md) | Complete Docker guide |
| [docs/TESTING.md](docs/TESTING.md) | Testing overview |
| [docs/TESTING-detailed.md](docs/TESTING-detailed.md) | Testing guide |
| [docs/SECURITY.md](docs/SECURITY.md) | Security overview |
| [docs/SECURITY-detailed.md](docs/SECURITY-detailed.md) | Security guide |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment overview |
| [docs/DEPLOYMENT-detailed.md](docs/DEPLOYMENT-detailed.md) | Deployment guide |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Troubleshooting overview |
| [docs/TROUBLESHOOTING-detailed.md](docs/TROUBLESHOOTING-detailed.md) | Solutions to common issues |

### Quick Start with Documentation

1. **New to ChatterBox?** Start with [FEATURES.md](docs/FEATURES.md)
2. **Want to run locally?** See [DOCKER.md](docs/DOCKER.md)
3. **Need to integrate?** Check [API.md](docs/API.md)
4. **Building real-time features?** See [WEBSOCKET.md](docs/WEBSOCKET.md)
5. **Adding AI chat?** See [AI-CHAT.md](docs/AI-CHAT.md)
6. **Ready for production?** See [DEPLOYMENT.md](docs/DEPLOYMENT.md)
