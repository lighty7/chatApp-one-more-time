# Architecture Overview

Brief overview of ChatterBox architecture. See [ARCHITECTURE-detailed.md](ARCHITECTURE-detailed.md) for comprehensive documentation.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│   (Web, Mobile)                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     NGINX LOAD BALANCER                     │
│              (Sticky Sessions, SSL Termination)               │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │API Pod  │     │API Pod  │     │API Pod  │
    │         │     │         │     │         │
    └────┬────┘     └────┬────┘     └────┬────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        REDIS                                │
│   (Session, Pub/Sub, Streams, Rate Limiting)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ MongoDB │     │  MinIO  │     │  Worker │
    │         │     │  (S3)   │     │         │
    └─────────┘     └─────────┘     └─────────┘
```

## Core Components

| Component | Technology | Purpose |
|-----------|-------------|---------|
| API Server | Node.js + Express | REST API, WebSocket |
| WebSocket | Socket.io | Real-time messaging |
| Database | MongoDB | Persistent storage |
| Cache/Queue | Redis | Sessions, Pub/Sub, Rate limiting |
| File Storage | MinIO/S3 | File uploads |
| Load Balancer | nginx | Traffic distribution |

## Quick Links

- [Detailed Architecture](ARCHITECTURE-detailed.md)
- [API Documentation](API.md)
- [Docker Setup](DOCKER.md)
- [Deployment Guide](DEPLOYMENT.md)
