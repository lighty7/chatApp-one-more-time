# API Overview

Brief overview of ChatterBox API endpoints. See [API-detailed.md](API-detailed.md) for complete documentation with examples.

## Endpoints Summary

| Category | Methods |
|----------|---------|
| Authentication | register, login, logout, refresh, me, forgot-password, reset-password |
| Users | search, profile, presence |
| Conversations | list, create, messages, read, leave |
| Rooms | list, create, messages |
| Files | upload, get, delete |
| AI | chat, stop |

## Base URL

```
Production: https://api.chatterbox.com
Development: http://localhost:3000/api
```

## Quick Links

- [Detailed API](API-detailed.md)
- [WebSocket Events](WEBSOCKET.md)
- [Authentication](SECURITY.md)
